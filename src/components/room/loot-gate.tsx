import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Alert } from 'react-native';
import { X, Shield, Users, Timer, Zap, Crown, Lock } from 'lucide-react-native';
import { Image } from 'expo-image';
import { TopSupporter } from '../../lib/types';

interface LootGateProps {
  visible: boolean;
  onClose: () => void;
  levelName?: string;
  levelIndex?: number;
  topSupporters?: TopSupporter[];
  isOwner?: boolean;
  currentUserId?: string;
  onCrack?: (gateIndex: number) => void;
}

const GATE_DURATION = 15;
const MAX_ENTRIES = 20;
const TOP_CRACKERS = 3;

export function LootGate({
  visible,
  onClose,
  levelName = 'Home',
  levelIndex = 0,
  topSupporters = [],
  isOwner = false,
  currentUserId,
  onCrack,
}: LootGateProps) {
  const gateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const countdownPulse = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const [timeLeft, setTimeLeft] = useState(GATE_DURATION);
  const [entries, setEntries] = useState<string[]>([]);
  const [cracked, setCracked] = useState(false);
  const [myRank, setMyRank] = useState<number>(-1);

  const top3Uids = topSupporters.slice(0, TOP_CRACKERS).map((s) => s.uid);
  const canCrack = isOwner || top3Uids.includes(currentUserId || '');
  const isFull = entries.length >= MAX_ENTRIES;
  const hasEntered = entries.includes(currentUserId || '');
  const isTop3 = top3Uids.indexOf(currentUserId || '');

  useEffect(() => {
    if (!visible) return;
    setTimeLeft(GATE_DURATION);
    setEntries([]);
    setCracked(false);
    setMyRank(-1);
    gateAnim.setValue(0);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.spring(gateAnim, { toValue: 1, friction: 6, tension: 20, useNativeDriver: true }).start();
      if (canCrack) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
          ])
        ).start();
      }
    } else {
      gateAnim.setValue(0);
      glowAnim.setValue(0);
    }
  }, [visible, canCrack]);

  // 15 second countdown
  useEffect(() => {
    if (!visible || cracked) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, cracked]);

  // Countdown pulse for last 5 seconds
  useEffect(() => {
    if (timeLeft <= 5 && timeLeft > 0 && !cracked) {
      Animated.sequence([
        Animated.timing(countdownPulse, { toValue: 1.3, duration: 200, useNativeDriver: true }),
        Animated.timing(countdownPulse, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [timeLeft, cracked]);

  // Auto-close when time runs out
  useEffect(() => {
    if (visible && timeLeft === 0 && !cracked) {
      const t = setTimeout(onClose, 800);
      return () => clearTimeout(t);
    }
  }, [timeLeft, visible, cracked]);

  const handleEnter = useCallback(() => {
    if (!currentUserId || hasEntered || isFull || cracked) return;
    setEntries((prev) => {
      if (prev.includes(currentUserId)) return prev;
      const next = [...prev, currentUserId];
      setMyRank(next.length);
      return next;
    });
  }, [currentUserId, hasEntered, isFull, cracked]);

  const handleCrack = useCallback(() => {
    if (!canCrack || cracked || timeLeft === 0) return;

    // Shake animation before cracking
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => {
      setCracked(true);
      onCrack?.(levelIndex);
    });
  }, [canCrack, cracked, timeLeft, levelIndex, onCrack]);

  const top3 = topSupporters.slice(0, TOP_CRACKERS);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 28,
            width: '88%',
            padding: 24,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: cracked ? '#22c55e' : canCrack ? 'rgba(251,191,36,0.5)' : 'rgba(239,68,68,0.3)',
            transform: [{ scale: gateAnim }, { translateX: shakeAnim }],
            opacity: gateAnim,
          }}
        >
          <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 12, right: 12, padding: 4, zIndex: 10 }}>
            <X size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 22 }}>🏆</Text>
            <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '900' }}>{levelName}</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 12 }}>LOOT GATE — Level {levelIndex + 1}</Text>

          {/* Timer */}
          <Animated.View
            style={{
              backgroundColor: timeLeft <= 5 ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.1)',
              borderRadius: 16, padding: 12, width: '100%', alignItems: 'center',
              borderWidth: 1, borderColor: timeLeft <= 5 ? 'rgba(239,68,68,0.4)' : 'rgba(251,191,36,0.2)',
              marginBottom: 12,
              transform: [{ scale: timeLeft <= 5 ? countdownPulse : 1 }],
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Timer size={14} color={timeLeft <= 5 ? '#ef4444' : '#fbbf24'} />
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' }}>
                {cracked ? 'GATE CRACKED!' : 'Gate closes in'}
              </Text>
            </View>
            <Text style={{ color: timeLeft <= 5 ? '#ef4444' : '#fbbf24', fontSize: 32, fontWeight: '900', marginTop: 4 }}>
              {cracked ? '🎉' : `${timeLeft}s`}
            </Text>
          </Animated.View>

          {/* Entry count */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Users size={14} color="#94a3b8" />
            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600' }}>
              {entries.length}/{MAX_ENTRIES} entered
            </Text>
            {hasEntered && (
              <View style={{ backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#4ade80', fontSize: 10, fontWeight: '700' }}>You're #{myRank}</Text>
              </View>
            )}
          </View>

          {/* Top 3 Crackers */}
          <View style={{ width: '100%', marginBottom: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>
              Who can crack the gate?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              {top3.length > 0 ? top3.map((s, i) => {
                const isMe = s.uid === currentUserId;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                return (
                  <View
                    key={s.uid}
                    style={{
                      alignItems: 'center',
                      backgroundColor: isMe ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                      borderRadius: 12, padding: 8, minWidth: 70,
                      borderWidth: 1, borderColor: isMe ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{medal}</Text>
                    {s.avatarUrl ? (
                      <Image source={{ uri: s.avatarUrl }} style={{ width: 28, height: 28, borderRadius: 14, marginTop: 4 }} cachePolicy="memory-disk" />
                    ) : (
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 4, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700' }}>{s.username?.[0] || '?'}</Text>
                      </View>
                    )}
                    <Text style={{ color: isMe ? '#fbbf24' : '#e2e8f0', fontSize: 9, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>
                      {isMe ? 'You' : s.username}
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 8 }}>#{i + 1}</Text>
                  </View>
                );
              }) : (
                <Text style={{ color: '#64748b', fontSize: 11 }}>No supporters yet</Text>
              )}
              {isOwner && (
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: 'rgba(168,85,247,0.15)',
                    borderRadius: 12, padding: 8, minWidth: 70,
                    borderWidth: 1, borderColor: '#a855f7',
                  }}
                >
                  <Crown size={18} color="#a855f7" />
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(168,85,247,0.2)', marginTop: 4, alignItems: 'center', justifyContent: 'center' }}>
                    <Crown size={14} color="#c084fc" />
                  </View>
                  <Text style={{ color: '#c084fc', fontSize: 9, fontWeight: '700', marginTop: 4 }}>Owner</Text>
                  <Text style={{ color: '#a855f7', fontSize: 8 }}>👑</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          {cracked ? (
            <View style={{ backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)', width: '100%' }}>
              <Text style={{ color: '#4ade80', fontSize: 15, fontWeight: '900' }}>🎉 Gate Cracked!</Text>
              <Text style={{ color: '#86efac', fontSize: 11, marginTop: 4 }}>Entering looting room...</Text>
            </View>
          ) : timeLeft === 0 ? (
            <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', width: '100%' }}>
              <Lock size={18} color="#ef4444" />
              <Text style={{ color: '#f87171', fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>Gate Closed</Text>
              <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>Wait for next level</Text>
            </View>
          ) : canCrack ? (
            <TouchableOpacity onPress={handleCrack} activeOpacity={0.8} style={{ width: '100%' }}>
              <Animated.View
                style={{
                  backgroundColor: '#f59e0b', borderRadius: 16, paddingVertical: 14, alignItems: 'center',
                  shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
                  opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Zap size={18} color="white" />
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>Crack the Gate!</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>You're authorized to open</Text>
              </Animated.View>
            </TouchableOpacity>
          ) : hasEntered ? (
            <View style={{ backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)', width: '100%' }}>
              <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: 'bold' }}>⏳ Waiting for gate to crack...</Text>
              <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>Top sender or owner will open it</Text>
            </View>
          ) : isFull ? (
            <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', width: '100%' }}>
              <Text style={{ color: '#f87171', fontSize: 13, fontWeight: 'bold' }}>Gate Full ({MAX_ENTRIES}/{MAX_ENTRIES})</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={handleEnter} activeOpacity={0.8} style={{ width: '100%' }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Enter Gate Queue</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>Be among first {MAX_ENTRIES} to enter</Text>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
