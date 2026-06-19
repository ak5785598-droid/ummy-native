import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Modal, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Unlock, Zap } from 'lucide-react-native';
import { SvgUri } from 'react-native-svg';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '../../firebase/provider';
import { doc, updateDoc } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { TopSupporter } from '../../lib/types';

interface LootLevel {
  id: string; name: string; threshold: number; image: string; animation: string; voice: string;
}

interface LootBoxDisplayProps {
  onOpenGate?: (gateIndex: number) => void;
  onGateReady?: (gateIndex: number, levelName: string) => void;
  roomId: string;
  topSupporters?: TopSupporter[];
  isOwner?: boolean;
}

const LEVEL_ICONS: Record<string, string> = {
  home: '🏠', bank: '🏦', car: '🚗', hotel: '🏨', bus: '🚌', train: '🚂', ship: '🚢', aeroplane: '✈️',
};

const DEFAULT_LEVELS: LootLevel[] = [
  { id: 'home', name: 'Home', threshold: 1000, image: '', animation: '', voice: '' },
  { id: 'bank', name: 'Bank', threshold: 5000, image: '', animation: '', voice: '' },
  { id: 'car', name: 'Car', threshold: 15000, image: '', animation: '', voice: '' },
  { id: 'hotel', name: 'Hotel', threshold: 30000, image: '', animation: '', voice: '' },
  { id: 'bus', name: 'Bus', threshold: 50000, image: '', animation: '', voice: '' },
  { id: 'train', name: 'Train', threshold: 100000, image: '', animation: '', voice: '' },
  { id: 'ship', name: 'Ship', threshold: 250000, image: '', animation: '', voice: '' },
  { id: 'aeroplane', name: 'Aeroplane', threshold: 500000, image: '', animation: '', voice: '' },
];

export function LootBoxDisplay({ onOpenGate, onGateReady, roomId, topSupporters = [], isOwner = false }: LootBoxDisplayProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showPath, setShowPath] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const readyAnim = useRef(new Animated.Value(1)).current;

  const firestore = useFirestore();
  const { user } = useUser();
  const roomRef = useMemoFirebase(() => !firestore || !roomId ? null : doc(firestore, 'chatRooms', roomId), [firestore, roomId]);
  const { data: room } = useDoc<any>(roomRef);
  const lootConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'appConfig', 'lootSettings'), [firestore]);
  const { data: lootConfig } = useDoc<any>(lootConfigRef);

  const userDocRef = useMemoFirebase(
    () => (!firestore || !user?.uid ? null : doc(firestore, 'users', user.uid)),
    [firestore, user?.uid]
  );
  const { data: userDoc } = useDoc<any>(userDocRef);

  const levels = lootConfig?.levels || DEFAULT_LEVELS;
  const currentProgress = room?.stats?.dailyGifts || 0;

  const [completedGateLevels, setCompletedGateLevels] = useState<Record<number, boolean>>({});
  const lootInitializedRef = useRef(false);
  const gateFiredRef = useRef<Record<number, boolean>>({});
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

  const lastLevelThreshold = levels[levels.length - 1]?.threshold || 500000;
  const effProgress = currentProgress % lastLevelThreshold;

  useEffect(() => {
    const saved = userDoc?.lootProgress?.[roomId]?.completedGates;
    if (saved && !lootInitializedRef.current) {
      setCompletedGateLevels(saved);
      lootInitializedRef.current = true;
    }
  }, [userDoc, roomId]);

  // Find the NEXT uncompleted level whose threshold is met
  useEffect(() => {
    if (levels.length === 0) return;

    let nextGateIdx = -1;
    for (let i = 0; i < levels.length; i++) {
      if (effProgress >= levels[i].threshold && !completedGateLevels[i]) {
        nextGateIdx = i;
        break;
      }
    }

    if (nextGateIdx === -1) {
      let highestCompleted = -1;
      for (let i = 0; i < levels.length; i++) {
        if (completedGateLevels[i]) highestCompleted = i;
      }
      nextGateIdx = Math.min(highestCompleted + 1, levels.length - 1);
    }

    if (nextGateIdx !== currentLevelIndex) {
      setCurrentLevelIndex(nextGateIdx);
    }
  }, [currentProgress, levels, completedGateLevels]);

  const curLevel = levels[currentLevelIndex] || levels[0];
  const nextLevel = levels[currentLevelIndex + 1];
  const progressPct = nextLevel
    ? Math.min(Math.max(((effProgress - curLevel.threshold) / (nextLevel.threshold - curLevel.threshold)) * 100, 0), 100)
    : effProgress >= curLevel.threshold ? 100 : 0;

  const canOpenGate = currentProgress >= curLevel.threshold;
  const isGateCompleted = !!completedGateLevels[currentLevelIndex];
  const shouldFireGate = canOpenGate && !isGateCompleted;

  // AUTO-FIRE: When threshold is first reached, notify parent to open gate
  useEffect(() => {
    if (shouldFireGate && !gateFiredRef.current[currentLevelIndex]) {
      gateFiredRef.current[currentLevelIndex] = true;
      onGateReady?.(currentLevelIndex, curLevel.name);
    }
  }, [shouldFireGate, currentLevelIndex, curLevel.name]);

  // Auto scrolling
  useEffect(() => {
    if (canOpenGate && !isGateCompleted) { setActiveIndex(currentLevelIndex); return; }
    if (showPath) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setActiveIndex(p => (p + 1) % levels.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [levels.length, canOpenGate, isGateCompleted, currentLevelIndex, showPath, fadeAnim]);

  // Pulse on unlock
  useEffect(() => {
    if (canOpenGate && !isGateCompleted) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])).start();
    } else { pulseAnim.setValue(1); }
  }, [canOpenGate, isGateCompleted]);

  // "READY" text pulse
  useEffect(() => {
    if (shouldFireGate) {
      Animated.loop(Animated.sequence([
        Animated.timing(readyAnim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        Animated.timing(readyAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])).start();
    } else { readyAnim.setValue(1); }
  }, [shouldFireGate]);

  const activeLevel = levels[activeIndex] || levels[0];
  let displayPct = 0;
  if (activeIndex < currentLevelIndex) displayPct = 100;
  else if (activeIndex === currentLevelIndex) displayPct = Math.round(progressPct);
  else displayPct = 0;

  const isCurrentActive = activeIndex === currentLevelIndex;
  const isGateLocked = isCurrentActive && canOpenGate && !isGateCompleted;

  const handleOpenGateClick = () => {
    const newCompleted = { ...completedGateLevels, [currentLevelIndex]: true };
    setCompletedGateLevels(newCompleted);
    onOpenGate?.(currentLevelIndex);
    setShowPath(false);

    if (firestore && user?.uid) {
      updateDoc(
        doc(firestore, 'users', user.uid),
        { [`lootProgress.${roomId}.completedGates`]: newCompleted }
      ).catch(() => {});
    }
  };

  const activeImageUrl = activeLevel?.image;
  const isActiveSvg = activeImageUrl?.toLowerCase().includes('.svg');

  return (
    <View>
      <Animated.View style={{ transform: [{ scale: isGateLocked ? pulseAnim : 1 }] }}>
        <TouchableOpacity
          onPress={() => { if (isGateLocked) handleOpenGateClick(); else setShowPath(!showPath); }}
          activeOpacity={0.8}
          style={[
            styles.boxContainer,
            {
              borderColor: isGateLocked ? '#fbbf24' : 'rgba(168,85,247,0.3)',
              borderWidth: isGateLocked ? 2 : 1,
            }
          ]}
        >
          {activeImageUrl && (
            isActiveSvg ? (
              <View style={StyleSheet.absoluteFillObject}>
                <SvgUri uri={activeImageUrl} width="100%" height="100%" />
              </View>
            ) : (
              <View style={StyleSheet.absoluteFillObject}>
                <Image source={{ uri: activeImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
              </View>
            )
          )}

          {!activeImageUrl && (
            <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: fadeAnim }}>
              <Text style={styles.emojiText}>{LEVEL_ICONS[activeLevel?.id] || '🏠'}</Text>
            </Animated.View>
          )}

          <Animated.View style={[styles.bottomInfo, { opacity: fadeAnim }]}>
            <Text numberOfLines={1} style={styles.levelNameText}>{activeLevel?.name || 'Home'}</Text>
            <View style={styles.progressBarWrapper}>
              <View style={[styles.progressBarFill, { width: `${displayPct}%` }]} />
            </View>
            <Text style={styles.percentageText}>{displayPct}%</Text>
          </Animated.View>

          {isGateLocked && (
            <View style={styles.lockOverlay}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <LinearGradient colors={['#fbbf24', '#f59e0b', '#f97316']} style={styles.unlockCircle}>
                  <Unlock size={14} color="black" />
                </LinearGradient>
              </Animated.View>
            </View>
          )}

          {shouldFireGate && (
            <View style={styles.readyBadge}>
              <Zap size={8} color="#fbbf24" />
              <Animated.Text style={[styles.readyText, { opacity: readyAnim }]}>LIVE</Animated.Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={showPath} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowPath(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <View>
                <Text style={styles.popupTitle}>{curLevel?.name || 'Home'}</Text>
                <Text style={styles.popupSubtitle}>Level {currentLevelIndex + 1} of {levels.length}</Text>
              </View>
              {canOpenGate && !isGateCompleted && (
                <TouchableOpacity onPress={handleOpenGateClick} style={styles.openGateBtn}>
                  <Text style={styles.openGateBtnText}>Open Gate</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressValueText}>{effProgress.toLocaleString()} coins</Text>
                <Text style={styles.progressValueText}>{nextLevel ? `${nextLevel.threshold.toLocaleString()} to ${nextLevel.name}` : 'MAX'}</Text>
              </View>
              <View style={styles.popupProgressBarWrapper}>
                <View style={[styles.popupProgressBarFill, { width: `${progressPct}%` }]} />
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {levels.map((level: any, idx: number) => {
                const isComp = idx < currentLevelIndex;
                const isCur = idx === currentLevelIndex;
                const isLocked = idx > currentLevelIndex;
                const nodeImageUrl = level.image;
                const isNodeSvg = nodeImageUrl?.toLowerCase().includes('.svg');

                return (
                  <View key={level.id} style={[styles.pathNode, isCur && { scale: 1.1 }]}>
                    <View
                      style={[
                        styles.nodeCircle,
                        isComp && styles.nodeComp,
                        isCur && styles.nodeCur,
                        isLocked && styles.nodeLocked
                      ]}
                    >
                      {isComp ? (
                        <Text style={styles.nodeText}>✅</Text>
                      ) : isCur ? (
                        nodeImageUrl ? (
                          isNodeSvg ? (
                            <View style={styles.nodeImage}><SvgUri uri={nodeImageUrl} width="100%" height="100%" /></View>
                          ) : (
                            <Image source={{ uri: nodeImageUrl }} style={styles.nodeImage} cachePolicy="memory-disk" />
                          )
                        ) : (
                          <Text style={styles.nodeText}>{LEVEL_ICONS[level.id] || ''}</Text>
                        )
                      ) : (
                        <Lock size={10} color="#64748b" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.nodeName,
                        isComp && { color: '#4ade80' },
                        isCur && { color: '#c084fc' },
                        isLocked && { color: '#475569' }
                      ]}
                    >
                      {level.name}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  boxContainer: {
    width: 60, height: 60, borderRadius: 16, padding: 6,
    alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(30,27,75,0.9)', overflow: 'hidden', position: 'relative',
  },
  emojiText: { fontSize: 22 },
  bottomInfo: { width: '100%', alignItems: 'center' },
  levelNameText: { fontSize: 7, fontWeight: '900', color: 'white', textTransform: 'uppercase', textAlign: 'center' },
  progressBarWrapper: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9, overflow: 'hidden', marginTop: 2 },
  progressBarFill: { height: '100%', backgroundColor: '#a855f7', borderRadius: 9 },
  percentageText: { fontSize: 5, fontWeight: '900', color: '#e9d5ff', textAlign: 'center', marginTop: 1 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', borderRadius: 16,
  },
  unlockCircle: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'white',
  },
  readyBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#dc2626', borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: '#fbbf24',
  },
  readyText: { color: '#fbbf24', fontSize: 6, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  popupCard: {
    position: 'absolute', bottom: 86, right: 8, width: 290,
    backgroundColor: '#1e1b4b', borderRadius: 24, borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)', padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 10,
  },
  popupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  popupTitle: { color: 'white', fontWeight: '900', fontSize: 15, textTransform: 'uppercase' },
  popupSubtitle: { color: '#a78bfa', fontSize: 10, fontWeight: '700' },
  openGateBtn: { backgroundColor: '#fbbf24', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  openGateBtnText: { color: 'black', fontWeight: '900', fontSize: 10 },
  progressCard: { padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, marginBottom: 12 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressValueText: { color: '#c084fc', fontSize: 10, fontWeight: '700' },
  popupProgressBarWrapper: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9, overflow: 'hidden' },
  popupProgressBarFill: { height: '100%', backgroundColor: '#a855f7', borderRadius: 9 },
  scrollContent: { paddingVertical: 4, gap: 12 },
  pathNode: { alignItems: 'center', justifyContent: 'center', width: 48 },
  nodeCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  nodeComp: { backgroundColor: 'rgba(74,222,128,0.15)', borderColor: '#4ade80' },
  nodeCur: { backgroundColor: 'rgba(168,85,247,0.25)', borderColor: '#c084fc' },
  nodeLocked: { backgroundColor: 'rgba(15,23,42,0.5)', borderColor: '#334155', opacity: 0.5 },
  nodeText: { fontSize: 14 },
  nodeImage: { width: '100%', height: '100%', borderRadius: 18 },
  nodeName: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', marginTop: 4, textAlign: 'center' },
});
