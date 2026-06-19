import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, Dispatch, SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Room } from '../lib/types';

interface RoomContextType {
  activeRoom: Room | null;
  setActiveRoom: (room: Room | null) => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  minimizedRoom: Room | null;
  setMinimizedRoom: (room: Room | null) => void;
  roomPlaylist: any[];
  setRoomPlaylist: Dispatch<SetStateAction<any[]>>;
  isMusicEnabled: boolean;
  setIsMusicEnabled: (val: boolean) => void;
  isSpeakerMuted: boolean;
  setIsSpeakerMuted: (val: boolean) => void;
  isAIVoiceEnabled: boolean;
  toggleAIVoice: (val: boolean) => void;
  isAIListening: boolean;
  setIsAIListening: (val: boolean) => void;
  isCaptionsEnabled: boolean;
  setIsCaptionsEnabled: (val: boolean) => void;
  isBrightMode: boolean;
  setIsBrightMode: (val: boolean) => void;
}

const RoomContext = createContext<RoomContextType | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [minimizedRoom, setMinimizedRoom] = useState<Room | null>(null);
  const [roomPlaylist, setRoomPlaylist] = useState<any[]>([]);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAIVoiceEnabled, setIsAIVoiceEnabled] = useState(false);
  const [isAIListening, setIsAIListening] = useState(false);
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(false);
  const [isBrightMode, setIsBrightMode] = useState(true);

  // Load persisted AI Voice toggle from AsyncStorage (like web uses localStorage)
  useEffect(() => {
    AsyncStorage.getItem('ummy_ai_voice_enabled').then(v => {
      if (v === 'true') setIsAIVoiceEnabled(true);
    }).catch(() => {});
  }, []);

  const toggleAIVoice = (val: boolean) => {
    setIsAIVoiceEnabled(val);
    AsyncStorage.setItem('ummy_ai_voice_enabled', String(val)).catch(() => {});
  };

  const value = useMemo(() => ({
    activeRoom, setActiveRoom, isMinimized, setIsMinimized, minimizedRoom, setMinimizedRoom,
    roomPlaylist, setRoomPlaylist, isMusicEnabled, setIsMusicEnabled,
    isSpeakerMuted, setIsSpeakerMuted,
    isAIVoiceEnabled, toggleAIVoice, isAIListening, setIsAIListening,
    isCaptionsEnabled, setIsCaptionsEnabled, isBrightMode, setIsBrightMode,
  }), [activeRoom, isMinimized, minimizedRoom, roomPlaylist, isMusicEnabled, isSpeakerMuted,
      isAIVoiceEnabled, isAIListening, isCaptionsEnabled, isBrightMode]);

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoomContext(): RoomContextType {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoomContext must be used within a RoomProvider');
  }
  return context;
}
