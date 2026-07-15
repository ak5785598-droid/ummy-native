import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { X, Award, Shield, Check, Gift } from 'lucide-react-native';
import { useUser, useFirestore } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { doc, updateDoc, increment, serverTimestamp, arrayUnion } from '@/firebase/firestore-compat';
import { LinearGradient } from 'expo-linear-gradient';
import { GoldenCoin } from '../GoldenCoin';
import { AvatarFrame } from '../profile/AvatarFrame';
import { Image } from 'expo-image';

interface AristocracyDialogProps {
  visible: boolean;
  onClose: () => void;
}

const RANKS = [
  {
    id: 'knight',
    name: 'Knight',
    title: 'Elite Tier I',
    color: ['#3b82f6', '#1d4ed8'] as const,
    dailySalary: 15000,
    frameName: 'Knight Royal Crest',
    frameId: 'aristocracy_knight_frame',
    frameUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Faristocracy_knight_frame.png?alt=media',
    pricing: {
      3: 30000,
      7: 60000,
      15: 100000,
      30: 180000
    }
  },
  {
    id: 'duke',
    name: 'Duke',
    title: 'Elite Tier II',
    color: ['#8b5cf6', '#6d28d9'] as const,
    dailySalary: 30000,
    frameName: 'Royal Duke Crest',
    frameId: 'aristocracy_duke_frame',
    frameUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Faristocracy_duke_frame.png?alt=media',
    pricing: {
      3: 80000,
      7: 150000,
      15: 280000,
      30: 500000
    }
  },
  {
    id: 'king',
    name: 'King',
    title: 'Elite Tier III',
    color: ['#fbbf24', '#d97706'] as const,
    dailySalary: 70000,
    frameName: 'Legendary Golden Crown',
    frameId: 'aristocracy_king_frame',
    frameUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Faristocracy_king_frame.png?alt=media',
    pricing: {
      3: 200000,
      7: 380000,
      15: 750000,
      30: 1300000
    }
  },
  {
    id: 'emperor',
    name: 'Emperor',
    title: 'Elite Tier IV',
    color: ['#ec4899', '#be185d'] as const,
    dailySalary: 100000,
    frameName: 'Imperial Emperor Crown',
    frameId: 'aristocracy_emperor_frame',
    frameUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/frames%2Faristocracy_emperor_frame.png?alt=media',
    pricing: {
      3: 400000,
      7: 800000,
      15: 1500000,
      30: 2800000
    }
  }
];

type DurationType = 3 | 7 | 15 | 30;

export function AristocracyDialog({ visible, onClose }: AristocracyDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile } = useUserProfile(user?.uid);

  const [activeTab, setActiveTab] = useState<string>('knight');
  const [duration, setDuration] = useState<DurationType>(3);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDpPreview, setShowDpPreview] = useState<boolean>(false);

  useEffect(() => {
    setShowDpPreview(false);
  }, [activeTab]);

  if (!visible) return null;

  const currentRank = RANKS.find(r => r.id === activeTab) || RANKS[0];
  const price = currentRank.pricing[duration];
  const userCoins = userProfile?.wallet?.coins || 0;

  // Active status details
  const nobility = userProfile?.nobility;
  const isRankActive = nobility?.rank === currentRank.id && nobility?.expiresAt > Date.now();
  const activeDaysLeft = isRankActive ? Math.ceil((nobility.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  // Salary claim details
  const lastClaimed = nobility?.lastClaimedAt || 0;
  const canClaimSalary = isRankActive && (Date.now() - lastClaimed >= 24 * 60 * 60 * 1000);

  const handlePurchase = async () => {
    if (!firestore || !user?.uid || !userProfile) return;
    if (userCoins < price) {
      Alert.alert('Insufficient Balance', 'You do not have enough coins to buy this rank.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const expireTime = Date.now() + duration * 24 * 60 * 60 * 1000;

      const frameData = {
        'inventory.activeFrame': currentRank.frameId,
        'inventory.activeFrameMediaUrl': currentRank.frameUrl,
        'inventory.ownedItems': arrayUnion(currentRank.frameId),
      };

      await updateDoc(userRef, {
        'wallet.coins': increment(-price),
        'wallet.dailySpent': increment(price),
        'wallet.totalSpent': increment(price),
        'nobility.rank': currentRank.id,
        'nobility.expiresAt': expireTime,
        'nobility.purchasedAt': Date.now(),
        ...frameData,
        updatedAt: serverTimestamp()
      });

      await updateDoc(profileRef, {
        ...frameData,
        updatedAt: serverTimestamp()
      });

      Alert.alert(
        'Congratulations 👑',
        `You have successfully purchased the ${currentRank.name} Aristocracy title for ${duration} days! The exclusive profile frame has been equipped.`
      );
    } catch (error) {
      Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSalary = async () => {
    if (!firestore || !user?.uid || !isRankActive) return;
    if (!canClaimSalary) {
      const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - lastClaimed)) / (1000 * 60 * 60));
      Alert.alert('Salary Already Claimed', `You can claim your next daily salary in ${hoursLeft} hours.`);
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        'wallet.coins': increment(currentRank.dailySalary),
        'nobility.lastClaimedAt': Date.now(),
        updatedAt: serverTimestamp()
      });

      Alert.alert(
        'Salary Claimed 🪙',
        `Successfully claimed your daily salary of ${currentRank.dailySalary} coins!`
      );
    } catch (error) {
      Alert.alert('Claim Failed', 'Unable to claim coins. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Award size={20} color="#fbbf24" />
              <Text style={styles.headerText}>ARISTOCRACY CLUB</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* User Balance */}
          <View style={styles.balanceBar}>
            <Text style={styles.balanceLabel}>My Balance</Text>
            <View style={styles.balanceValueRow}>
              <GoldenCoin size={14} />
              <Text style={styles.balanceText}>{userCoins.toLocaleString()}</Text>
            </View>
          </View>

          {/* Ranks Tabs Selector */}
          <View style={styles.tabRow}>
            {RANKS.map(rank => (
              <TouchableOpacity
                key={rank.id}
                onPress={() => setActiveTab(rank.id)}
                style={[
                  styles.tabButton,
                  activeTab === rank.id && { borderColor: rank.color[0], backgroundColor: 'rgba(255,255,255,0.06)' }
                ]}
              >
                <Shield size={16} color={activeTab === rank.id ? rank.color[0] : 'rgba(255,255,255,0.4)'} />
                <Text style={[styles.tabText, { color: activeTab === rank.id ? rank.color[0] : 'rgba(255,255,255,0.5)' }]}>
                  {rank.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Rank Card Info */}
            <LinearGradient colors={currentRank.color} style={styles.rankCard}>
              <View style={styles.rankCardHeader}>
                <View>
                  <Text style={styles.rankCardTitle}>{currentRank.name} Title</Text>
                  <Text style={styles.rankCardSub}>{currentRank.title} Status</Text>
                </View>
                {isRankActive && (
                  <View style={styles.activeBadge}>
                    <Check size={10} color="#050209" strokeWidth={3} />
                    <Text style={styles.activeBadgeText}>{activeDaysLeft}d Left</Text>
                  </View>
                )}
              </View>

              {/* Visual Avatar Frame Preview */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowDpPreview(!showDpPreview)}
                style={styles.avatarPreviewBox}
              >
                <AvatarFrame frameMediaUrl={currentRank.frameUrl} size={64}>
                  {showDpPreview ? (
                    userProfile?.avatarUrl ? (
                      <Image
                        source={{ uri: userProfile.avatarUrl }}
                        style={{ width: '100%', height: '100%', borderRadius: 32 }}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarPlaceholderText}>
                          {(userProfile?.username || 'U')[0].toUpperCase()}
                        </Text>
                      </View>
                    )
                  ) : (
                    // Default generic silhouette representation when not previewing
                    <View style={[styles.avatarPlaceholder, { backgroundColor: '#2d154c' }]}>
                      <Text style={[styles.avatarPlaceholderText, { color: 'rgba(255,255,255,0.4)', fontSize: 24 }]}>?</Text>
                    </View>
                  )}
                </AvatarFrame>
                <Text style={styles.previewTag}>
                  {showDpPreview ? 'Tap to hide your DP' : 'Tap to preview with your DP'}
                </Text>
              </TouchableOpacity>

              <View style={styles.benefitsContainer}>
                <View style={styles.benefitRow}>
                  <View style={styles.benefitIconBox}>
                    <GoldenCoin size={16} />
                  </View>
                  <View style={styles.benefitTextCol}>
                    <Text style={styles.benefitTitle}>Daily Allowance</Text>
                    <Text style={styles.benefitDesc}>{currentRank.dailySalary} free coins every 24 hours</Text>
                  </View>
                </View>

                <View style={styles.benefitRow}>
                  <View style={styles.benefitIconBox}>
                    <Gift size={16} color="#fff" />
                  </View>
                  <View style={styles.benefitTextCol}>
                    <Text style={styles.benefitTitle}>Profile Theme</Text>
                    <Text style={styles.benefitDesc}>Exclusive `{currentRank.frameName}` equipped instantly</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Salary Claim Section (if active) */}
            {isRankActive && (
              <View style={styles.salarySection}>
                <View style={styles.salaryInfoCol}>
                  <Text style={styles.salaryTitle}>Claim Salary</Text>
                  <Text style={styles.salaryDesc}>Get your daily {currentRank.dailySalary} coins</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClaimSalary}
                  disabled={loading}
                  style={[styles.claimButton, !canClaimSalary && styles.claimButtonDisabled]}
                >
                  <Text style={styles.claimButtonText}>{canClaimSalary ? 'Claim' : 'Claimed'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Duration Pills Selector */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select Duration</Text>
            </View>
            <View style={styles.durationRow}>
              {([3, 7, 15, 30] as DurationType[]).map(days => (
                <TouchableOpacity
                  key={days}
                  onPress={() => setDuration(days)}
                  style={[styles.durationButton, duration === days && styles.durationButtonActive]}
                >
                  <Text style={[styles.durationText, duration === days && styles.durationTextActive]}>
                    {days} Days
                  </Text>
                  <Text style={[styles.durationPriceText, duration === days && styles.durationPriceTextActive]}>
                    {currentRank.pricing[days].toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Action Buy Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              onPress={handlePurchase}
              disabled={loading}
              style={styles.buyButton}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View style={styles.buyButtonContent}>
                  <Text style={styles.buyButtonText}>Buy Rank • </Text>
                  <GoldenCoin size={12} />
                  <Text style={styles.buyButtonText}> {price.toLocaleString()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#150824',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34,
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  balanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  rankCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  rankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  rankCardTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  rankCardSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  activeBadgeText: {
    color: '#050209',
    fontSize: 9,
    fontWeight: '900',
  },
  benefitsContainer: {
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  benefitDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  salarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  salaryInfoCol: {
    flex: 1,
  },
  salaryTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  salaryDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  claimButton: {
    backgroundColor: '#fbbf24',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  claimButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  claimButtonText: {
    color: '#050209',
    fontSize: 11,
    fontWeight: '850',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  durationButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 10,
  },
  durationButtonActive: {
    borderColor: '#a855f7',
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  durationText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
  },
  durationTextActive: {
    color: 'white',
    fontWeight: '850',
  },
  durationPriceText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  durationPriceTextActive: {
    color: '#a855f7',
    fontWeight: '800',
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  buyButton: {
    backgroundColor: '#a855f7',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  avatarPreviewBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#3b0d63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  previewTag: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
});
