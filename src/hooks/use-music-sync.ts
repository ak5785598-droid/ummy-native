import { useEffect, useRef, useState, useCallback } from 'react';
import { useFirestore, useDatabase } from '../firebase/provider';
import { doc, serverTimestamp, onSnapshot, collection, query, orderBy } from '@/firebase/firestore-compat';
import { ref, onValue } from 'firebase/database';
import { updateDocumentNonBlocking } from '../lib/non-blocking-writes';
import { Room, MusicTrack } from '../lib/types';
import { Audio } from 'expo-av';

// Module-level singleton: music persists across screen mounts/unmounts
let singletonSound: Audio.Sound | null = null;
let singletonUrl: string | null = null;

export function destroyMusicSound() {
  if (singletonSound) {
    try { singletonSound.unloadAsync(); } catch {}
    singletonSound = null;
    singletonUrl = null;
  }
}

interface UseMusicSyncProps {
  room: Room | null;
  canManageRoom: boolean;
  userId: string | undefined;
  isSpeakerMuted: boolean;
  keepAlive?: boolean;
}

interface MusicState {
  duration: number;
  currentTime: number;
  progress: number;
}

export function useMusicSync({ room, canManageRoom, userId, isSpeakerMuted, keepAlive = false }: UseMusicSyncProps) {
  const firestore = useFirestore();
  const database = useDatabase();
  
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicState, setMusicState] = useState<MusicState>({ duration: 0, currentTime: 0, progress: 0 });
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [songIntensity, setSongIntensity] = useState(0);
  const [lowFreqIntensity, setLowFreqIntensity] = useState(0);
  const intensityAnimRef = useRef<number | null>(null);
  const songIntensityRef = useRef(0);
  const lowFreqIntensityRef = useRef(0);
  
  const soundRef = useRef<Audio.Sound | null>(null);
  const pendingSeekTime = useRef<number | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const keepAliveRef = useRef(keepAlive);
  keepAliveRef.current = keepAlive;
  const [roomMusicLibrary, setRoomMusicLibrary] = useState<MusicTrack[]>([]);

  useEffect(() => {
    if (!firestore || !room?.id) return;
    const q = query(collection(firestore, 'chatRooms', room.id, 'music'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tracks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MusicTrack[];
      setRoomMusicLibrary(tracks);
    });
    return () => unsubscribe();
  }, [firestore, room?.id]);

  useEffect(() => {
    if (!database) return;
    
    const offsetRef = ref(database, '.info/serverTimeOffset');
    const unsubscribe = onValue(offsetRef, (snap) => {
      setServerTimeOffset(snap.val() || 0);
    });
    
    return () => unsubscribe();
  }, [database]);

  const calcTargetTime = useCallback(() => {
    const startedAt = room?.musicStartedAt;
    const offset = room?.musicStartOffset || 0;
    
    if (!startedAt) return offset;
    
    const startMs = startedAt?.toMillis?.() 
      ?? (startedAt?.seconds ? startedAt.seconds * 1000 : null);
    if (!startMs) return offset;
    
    const syncedNow = Date.now() + serverTimeOffset;
    const elapsed = (syncedNow - startMs) / 1000;
    
    return offset + elapsed;
  }, [room?.musicStartedAt, room?.musicStartOffset, serverTimeOffset]);

  useEffect(() => {
    let active = true;

    const setupAudio = async () => {
      if (!room?.currentMusicUrl) {
        currentUrlRef.current = null;
        if (soundRef.current) {
          const oldSound = soundRef.current;
          soundRef.current = null;
          singletonSound = null;
          singletonUrl = null;
          try {
            await oldSound.unloadAsync();
          } catch (e) {}
          setIsMusicPlaying(false);
        }
        return;
      }

      const url = room.currentMusicUrl;
      const isPlaying = room.isMusicPlaying;

      try {
        await Audio.setAudioModeAsync({
          allowsSilentSwitch: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        if (!active) return;

        // Reuse singleton sound for same URL
        if (singletonSound && singletonUrl === url) {
          soundRef.current = singletonSound;
          currentUrlRef.current = url;
          
          const status = await singletonSound.getStatusAsync();
          if (!active) return;
          
          if (status.isLoaded) {
            if (isPlaying) {
              const target = calcTargetTime();
              const drift = Math.abs((status.positionMillis / 1000) - target);
              if (drift > 2) {
                await singletonSound.setPositionAsync(Math.floor(target * 1000)).catch(() => {});
              }
              if (!status.isPlaying && active) {
                await singletonSound.playAsync().catch(() => {});
                setIsMusicPlaying(true);
              }
            } else {
              if (status.isPlaying && active) {
                await singletonSound.pauseAsync().catch(() => {});
                setIsMusicPlaying(false);
              }
            }
          }
          return;
        }

        if (currentUrlRef.current !== url) {
          if (soundRef.current) {
            const oldSound = soundRef.current;
            soundRef.current = null;
            await oldSound.unloadAsync().catch(() => {});
          }

          if (!active) return;

          const { sound } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: false },
            onPlaybackStatusUpdate
          );

          if (!active) {
            await sound.unloadAsync().catch(() => {});
            return;
          }

          soundRef.current = sound;
          singletonSound = sound;
          singletonUrl = url;
          currentUrlRef.current = url;

          const targetTime = calcTargetTime();
          if (targetTime > 0) {
            await sound.setPositionAsync(Math.floor(targetTime * 1000)).catch(() => {});
          }

          if (isPlaying && active) {
            await sound.playAsync().catch(() => {});
            setIsMusicPlaying(true);
          }
        } else {
          const sound = soundRef.current;
          if (!sound) return;

          const status = await sound.getStatusAsync();
          if (!active) return;

          if (status.isLoaded) {
            if (isPlaying) {
              const target = calcTargetTime();
              const drift = Math.abs((status.positionMillis / 1000) - target);

              if (drift > 2) {
                await sound.setPositionAsync(Math.floor(target * 1000)).catch(() => {});
              }

              if (!status.isPlaying && active) {
                await sound.playAsync().catch(() => {});
                setIsMusicPlaying(true);
              }
            } else {
              if (status.isPlaying && active) {
                await sound.pauseAsync().catch(() => {});
                setIsMusicPlaying(false);
              }
            }
          }
        }
      } catch (error) {
        console.error('[MusicSync] Setup error:', error);
      }
    };

    setupAudio();

    return () => {
      active = false;
    };
  }, [room?.currentMusicUrl, room?.isMusicPlaying, room?.musicStartedAt, room?.musicStartOffset, room?.id]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setMusicState({
        duration: status.durationMillis / 1000,
        currentTime: status.positionMillis / 1000,
        progress: status.durationMillis > 0 ? (status.positionMillis / status.durationMillis) * 100 : 0,
      });

      if (status.didJustFinish) {
        if (isRepeatEnabled && soundRef.current) {
          soundRef.current.setPositionAsync(0);
          soundRef.current.playAsync();
        } else if (canManageRoom && roomMusicLibrary.length > 0) {
          handleNextMusic(roomMusicLibrary);
        } else {
          if (soundRef.current) {
            soundRef.current.pauseAsync();
            setIsMusicPlaying(false);
          }
        }
      }
    }
  };

  // Simulated music intensity for seat isSpeaking visualization
  useEffect(() => {
    if (!isMusicPlaying) {
      if (intensityAnimRef.current !== null) {
        clearInterval(intensityAnimRef.current);
        intensityAnimRef.current = null;
      }
      setSongIntensity(0);
      setLowFreqIntensity(0);
      return;
    }
    const intensity = () => {
      const pos = musicState.currentTime;
      const beat = Math.sin(pos * 2.4 * Math.PI) * 0.5 + 0.5;
      const bass = Math.sin(pos * 4.8 * Math.PI) * 0.6 + 0.4;
      const variation = ((Math.sin(pos * 1.1) * Math.cos(pos * 0.7)) * 0.3 + 0.7);
      const noise = Math.random() * 0.2;
      const newIntensity = Math.min(100, Math.round((beat * 0.5 + variation * 0.3 + noise * 0.2) * 100));
      const newLowFreq = Math.min(100, Math.round((bass * 0.6 + variation * 0.25 + noise * 0.15) * 100));
      if (Math.abs(newIntensity - songIntensityRef.current) > 5) {
        songIntensityRef.current = newIntensity;
        setSongIntensity(newIntensity);
      }
      if (Math.abs(newLowFreq - lowFreqIntensityRef.current) > 5) {
        lowFreqIntensityRef.current = newLowFreq;
        setLowFreqIntensity(newLowFreq);
      }
    };
    if (intensityAnimRef.current !== null) clearInterval(intensityAnimRef.current);
    intensityAnimRef.current = setInterval(intensity, 150);
    return () => {
      if (intensityAnimRef.current !== null) {
        clearInterval(intensityAnimRef.current);
        intensityAnimRef.current = null;
      }
    };
  }, [isMusicPlaying, musicState.currentTime]);

  const handleToggleMusic = async () => {
    if (!canManageRoom || !firestore || !room?.id) return;
    
    if (!room.currentMusicUrl) return;

    const newPlayingState = !room.isMusicPlaying;
    const roomRef = doc(firestore, 'chatRooms', room.id);
    
    await updateDocumentNonBlocking(roomRef, {
      isMusicPlaying: newPlayingState,
      musicUpdatedBy: userId || '',
      musicStartedAt: newPlayingState ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    });
  };

  const handleStopMusic = async () => {
    if (!canManageRoom || !firestore || !room?.id) return;
    
    const roomRef = doc(firestore, 'chatRooms', room.id);
    
    await updateDocumentNonBlocking(roomRef, {
      currentMusicUrl: '',
      currentMusicTitle: '',
      currentMusicId: '',
      isMusicPlaying: false,
      musicStartedAt: null,
      musicStartOffset: 0,
      musicUpdatedBy: '',
      updatedAt: serverTimestamp(),
    });
  };

  const handleSeekMusic = async (seconds: number) => {
    if (!canManageRoom || !firestore || !room?.id) return;
    
    const roomRef = doc(firestore, 'chatRooms', room.id);
    
    await updateDocumentNonBlocking(roomRef, {
      musicStartOffset: seconds,
      musicStartedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const handleNextMusic = async (roomMusicLibrary: MusicTrack[]) => {
    if (!canManageRoom || !firestore || !room?.id || roomMusicLibrary.length === 0) return;
    
    const currentIndex = roomMusicLibrary.findIndex(t => t.id === room.currentMusicId);
    const nextIndex = (currentIndex + 1) % roomMusicLibrary.length;
    const nextTrack = roomMusicLibrary[nextIndex];
    
    const roomRef = doc(firestore, 'chatRooms', room.id);
    
    await updateDocumentNonBlocking(roomRef, {
      currentMusicUrl: nextTrack.url,
      currentMusicTitle: nextTrack.name,
      currentMusicId: nextTrack.id,
      isMusicPlaying: true,
      musicStartedAt: serverTimestamp(),
      musicStartOffset: 0,
      musicUpdatedBy: userId || '',
      updatedAt: serverTimestamp(),
    });
  };

  const handlePreviousMusic = async (roomMusicLibrary: MusicTrack[]) => {
    if (!canManageRoom || !firestore || !room?.id || roomMusicLibrary.length === 0) return;
    
    const currentIndex = roomMusicLibrary.findIndex(t => t.id === room.currentMusicId);
    const prevIndex = currentIndex <= 0 ? roomMusicLibrary.length - 1 : currentIndex - 1;
    const prevTrack = roomMusicLibrary[prevIndex];
    
    const roomRef = doc(firestore, 'chatRooms', room.id);
    
    await updateDocumentNonBlocking(roomRef, {
      currentMusicUrl: prevTrack.url,
      currentMusicTitle: prevTrack.name,
      currentMusicId: prevTrack.id,
      isMusicPlaying: true,
      musicStartedAt: serverTimestamp(),
      musicStartOffset: 0,
      musicUpdatedBy: userId || '',
      updatedAt: serverTimestamp(),
    });
  };

  const setLocalVolume = async (volume: number) => {
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.setVolumeAsync(isSpeakerMuted ? 0 : volume);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    const updateMuteStatus = async () => {
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            await soundRef.current.setStatusAsync({ isMuted: isSpeakerMuted });
          }
        } catch (e) {}
      }
    };
    updateMuteStatus();
  }, [isSpeakerMuted]);

  useEffect(() => {
    return () => {
      if (!keepAliveRef.current && soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
        singletonSound = null;
        singletonUrl = null;
      }
    };
  }, []);

  return {
    isMusicPlaying,
    musicState,
    isRepeatEnabled,
    setIsRepeatEnabled,
    handleToggleMusic,
    handleStopMusic,
    handleSeekMusic,
    handleNextMusic,
    handlePreviousMusic,
    setLocalVolume,
    songIntensity,
    lowFreqIntensity,
  };
}
