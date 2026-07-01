import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '@/firebase/provider';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, increment, serverTimestamp, updateDoc, getDoc } from '@/firebase/firestore-compat';
import { GoldenCoin } from '@/components/GoldenCoin';
import { getRewardRate, calculateBonus, getTodayIST, formatTimeUntilExpiry, getTimeUntilExpiry, getRoomLevelFromPoints, RATE_TIERS } from '@/lib/bonus-utils';

export default function BonusScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile, isLoading: isProfileLoading } = useUserProfile(user?.uid);
  const [isClaiming, setIsClaiming] = useState(false);
  const [roomLevel, setRoomLevel] = useState(1);
  const [expiryText, setExpiryText] = useState('23h : 59m : 59s');

  const dailyPoints = userProfile?.dailyActivityPoints || 0;
  const rewardRate = getRewardRate(roomLevel);

  const today = getTodayIST();
  const lastResetDate = userProfile?.dailyActivityPointsDate || '';
  const isExpired = lastResetDate !== '' && lastResetDate !== today;
  const effectivePoints = isExpired ? 0 : dailyPoints;
  const effectiveBonus = calculateBonus(effectivePoints, roomLevel);

  useEffect(() => {
    if (!firestore || !user?.uid) return;
    const roomRef = doc(firestore, 'chatRooms', user.uid);
    getDoc(roomRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        const lp = data?.levelPoints || 0;
        setRoomLevel(getRoomLevelFromPoints(lp));
      }
    }).catch(() => {});
  }, [firestore, user?.uid]);

  useEffect(() => {
    const interval = setInterval(() => {
      const { expired } = getTimeUntilExpiry();
      if (expired) {
        setExpiryText('Expired — Resets at midnight');
      } else {
        setExpiryText(formatTimeUntilExpiry());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaimBonus = async () => {
    if (!user || !firestore || effectiveBonus <= 0) {
      Alert.alert('Nothing to Claim', 'You have no bonus points to claim yet.');
      return;
    }
    setIsClaiming(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const historyRef = doc(firestore, 'users', user.uid, 'bonusHistory', today);

      await updateDoc(profileRef, {
        'wallet.coins': increment(effectiveBonus),
        'dailyActivityPoints': 0,
        'dailyActivityPointsDate': today,
        'totalBonusClaimed': increment(effectiveBonus),
        'lastBonusClaimDate': today,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(userRef, {
        'wallet.coins': increment(effectiveBonus),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(historyRef, {
        date: today,
        pointsClaimed: effectivePoints,
        rate: rewardRate,
        coinsReceived: effectiveBonus,
        roomLevel,
        claimedAt: serverTimestamp(),
      }).catch(() => {});

      Alert.alert('Bonus Claimed!', `${effectiveBonus.toLocaleString()} Gold Coins credited.`);
    } catch (error: any) {
      Alert.alert('Claim Failed', error.message || 'Something went wrong.');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bonus</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

          <View style={styles.goldCard}>
            <View style={styles.goldCardDecorTR} />
            <View style={styles.goldCardDecorBL} />
            <Text style={styles.goldCardLabel}>Bonus you can get today</Text>

            <View style={styles.goldAmtRow}>
              <GoldenCoin size={72} />
              <Text style={styles.bonusAmt}>{effectiveBonus}</Text>
            </View>

            <TouchableOpacity
              onPress={handleClaimBonus}
              disabled={isClaiming || effectiveBonus <= 0 || isProfileLoading}
              style={[styles.claimBtn, (isClaiming || effectiveBonus <= 0) && styles.claimBtnDisabled]}
            >
              {isClaiming ? (
                <ActivityIndicator color="#d97706" size="small" />
              ) : (
                <Text style={styles.claimBtnText}>Get</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.expiryRow}>
            <Text style={styles.expiryLabel}>Expires in</Text>
            <Text style={styles.expiryTimer}>{expiryText}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{effectivePoints}</Text>
              <Text style={styles.statLabel}>POINTS TODAY</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: '#d97706' }]}>{(rewardRate * 100).toFixed(0)}%</Text>
              <Text style={styles.statLabel}>REWARD RATE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{effectiveBonus}</Text>
              <Text style={styles.statLabel}>BONUS</Text>
            </View>
          </View>

          <Text style={styles.sectionHead}>BONUS CALCULATION</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              <Text style={styles.infoTextBold}>1. Bonus</Text> = Points earned today x Reward Rate
            </Text>
            <Text style={[styles.infoText, { marginTop: 8 }]}>
              <Text style={styles.infoTextBold}>2.</Text> You earn 1 point for every 1 coin spent on gifts in your room. Points expire at midnight (GMT+5.30).
            </Text>
            <Text style={[styles.infoText, { marginTop: 8 }]}>
              <Text style={styles.infoTextBold}>3.</Text> Reward rate depends on your room level (based on room activity).
            </Text>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeadCell}>Rate</Text>
                <Text style={styles.tableHeadCell}>Room Level</Text>
              </View>
              {RATE_TIERS.map((row, i) => {
                const isActive = (
                  (i === 0 && roomLevel >= 0 && roomLevel <= 20) ||
                  (i === 1 && roomLevel >= 21 && roomLevel <= 30) ||
                  (i === 2 && roomLevel >= 31 && roomLevel <= 40) ||
                  (i === 3 && roomLevel >= 41 && roomLevel <= 50) ||
                  (i === 4 && roomLevel >= 51 && roomLevel <= 70) ||
                  (i === 5 && roomLevel >= 71 && roomLevel <= 90) ||
                  (i === 6 && roomLevel >= 91 && roomLevel <= 100)
                );
                return (
                  <View key={i} style={[styles.tableRow, isActive && styles.tableRowActive]}>
                    <Text style={[styles.tableCell, { color: '#d97706', fontWeight: '700' }]}>{row.rate}</Text>
                    <Text style={[styles.tableCell, isActive && { fontWeight: '800', color: '#0f172a' }]}>{row.range}</Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.currentLevelBadge, { marginTop: 12 }]}>
              <Text style={styles.currentLevelText}>Your Room Level: Lv{roomLevel} | {(rewardRate * 100).toFixed(0)}% rate</Text>
            </View>
          </View>

          <Text style={styles.sectionHead}>BONUS PAY TIME</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              You can redeem at any time during the day, and will expire at 24:00 (GMT+5.30) the next day. Please claim your bonus before it expires.
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  goldCard: { backgroundColor: '#f59e0b', borderRadius: 24, padding: 24, marginBottom: 12, overflow: 'hidden', shadowColor: '#d97706', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  goldCardDecorTR: { position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)' },
  goldCardDecorBL: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.08)' },
  goldCardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: '500', letterSpacing: 0.5, textAlign: 'center', marginBottom: 16 },
  goldAmtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  bonusAmt: { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  claimBtn: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  claimBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.45)' },
  claimBtnText: { fontSize: 16, fontWeight: '700', color: '#d97706' },
  expiryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#fef3c7' },
  expiryLabel: { fontSize: 12, color: '#92400e', fontWeight: '500' },
  expiryTimer: { fontSize: 14, fontWeight: '800', color: '#d97706', fontVariant: ['tabular-nums'] },
  statsRow: { backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statDivider: { width: 1, height: 40, backgroundColor: '#f1f5f9' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' },
  sectionHead: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
  infoText: { fontSize: 12, color: '#475569', lineHeight: 18 },
  infoTextBold: { fontWeight: '700', color: '#0f172a' },
  table: { borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tableHeadCell: { flex: 1, fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f1f5f9' },
  tableRowActive: { backgroundColor: '#fef3c7' },
  tableCell: { flex: 1, fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'center' },
  currentLevelBadge: { backgroundColor: '#fef3c7', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'center' },
  currentLevelText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
});
