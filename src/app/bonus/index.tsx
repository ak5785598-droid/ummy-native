import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Loader } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '@/firebase/provider';
import { useUserProfile } from '@/hooks/use-user-profile';
import { doc, increment, serverTimestamp, updateDoc } from '@/firebase/firestore-compat';

export default function BonusScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile, isLoading: isProfileLoading } = useUserProfile(user?.uid);
  const [isClaiming, setIsClaiming] = useState(false);

  const pointsOwned = userProfile?.activityPoints || 0;
  const rewardRate = 0.10;
  const bonusAmount = Math.floor(pointsOwned * rewardRate);

  const handleClaimBonus = async () => {
    if (!user || !firestore || bonusAmount <= 0) {
      Alert.alert('Nothing to Claim', 'You have no activity points to convert yet.');
      return;
    }
    setIsClaiming(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const updateData = {
        'wallet.coins': increment(bonusAmount),
        'activityPoints': 0,
        'updatedAt': serverTimestamp(),
      };
      await updateDoc(profileRef, updateData);
      Alert.alert('🎉 Bonus Claimed!', `${bonusAmount.toLocaleString()} Gold Coins credited to your account.`);
    } catch (error: any) {
      Alert.alert('Claim Failed', error.message || 'Something went wrong.');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bonus</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

          {/* Gold Gradient Card */}
          <View style={styles.goldCard}>
            <View style={styles.goldCardDecorTR} />
            <View style={styles.goldCardDecorBL} />
            <Text style={styles.goldCardLabel}>Bonus you can get today</Text>

            {/* Coin + Amount */}
            <View style={styles.goldAmtRow}>
              <Text style={styles.coinEmoji}>🪙</Text>
              <Text style={styles.bonusAmt}>{bonusAmount}</Text>
            </View>

            {/* Claim Button */}
            <TouchableOpacity
              onPress={handleClaimBonus}
              disabled={isClaiming || bonusAmount <= 0 || isProfileLoading}
              style={[styles.claimBtn, (isClaiming || bonusAmount <= 0) && styles.claimBtnDisabled]}
            >
              {isClaiming ? (
                <ActivityIndicator color="#d97706" size="small" />
              ) : (
                <Text style={styles.claimBtnText}>Get</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{pointsOwned}</Text>
              <Text style={styles.statLabel}>POINTS OWNED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{(rewardRate * 100).toFixed(1)}%</Text>
              <Text style={styles.statLabel}>REWARD RATE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{bonusAmount}</Text>
              <Text style={styles.statLabel}>BONUS</Text>
            </View>
          </View>

          {/* Calculation Details */}
          <Text style={styles.sectionHead}>BONUS CALCULATION</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              <Text style={styles.infoTextBold}>1. Bonus</Text> = Points owned × Reward Rate
            </Text>
            <Text style={[styles.infoText, { marginTop: 8 }]}>
              <Text style={styles.infoTextBold}>2.</Text> You earn points when someone sends gifts in your room. 1 coin = 1 point. When your daily points reach 100, you receive a bonus.
            </Text>
            <Text style={[styles.infoText, { marginTop: 8 }]}>
              <Text style={styles.infoTextBold}>3.</Text> Reward rate depends on your room level.
            </Text>
            {/* Rate Table */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeadCell}>Room Rate</Text>
                <Text style={styles.tableHeadCell}>Room Level</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { color: '#d97706', fontWeight: '700' }]}>10%</Text>
                <Text style={styles.tableCell}>Lv0 - 100</Text>
              </View>
            </View>
          </View>

          {/* Pay Time */}
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
  goldCard: { backgroundColor: '#f59e0b', borderRadius: 24, padding: 24, marginBottom: 16, overflow: 'hidden', shadowColor: '#d97706', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  goldCardDecorTR: { position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)' },
  goldCardDecorBL: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.08)' },
  goldCardLabel: { fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: '500', letterSpacing: 0.5, textAlign: 'center', marginBottom: 16 },
  goldAmtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  coinEmoji: { fontSize: 40 },
  bonusAmt: { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  claimBtn: { backgroundColor: '#fff', borderRadius: 50, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  claimBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.45)' },
  claimBtnText: { fontSize: 16, fontWeight: '700', color: '#d97706' },
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
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12 },
  tableCell: { flex: 1, fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'center' },
});
