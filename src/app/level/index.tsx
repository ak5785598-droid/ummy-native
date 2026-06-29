import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, HelpCircle, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '@/firebase/provider';
import { useUserProfile } from '@/hooks/use-user-profile';
import { calculateLevelProgress } from '@/lib/level-utils';
import { collection, query, orderBy, onSnapshot } from '@/firebase/firestore-compat';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { UserLevelBadge } from '@/components/user-level-badge';

// Premium dynamic badge helper
function Level0To10Badge({ levelText = 'Lv.0-10', scale = 1.0 }) {
  // Parse level number if possible, e.g. "Lv.5" -> 5
  const levelNum = parseInt(levelText.replace(/[^0-9]/g, '')) || 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60 * scale, width: '100%', position: 'relative' }}>
      <UserLevelBadge level={levelNum} scale={scale * 1.5} />
    </View>
  );
}


export default function LevelScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile } = useUserProfile(user?.uid);

  const [levels, setLevels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);

  const [testLevel, setTestLevel] = useState<number | null>(null);

  const stats = useMemo(() => {
    const baseProgress = calculateLevelProgress(userProfile?.wallet?.totalSpent || 0);
    if (testLevel !== null) {
      return {
        ...baseProgress,
        currentLevel: testLevel,
        nextLevel: testLevel + 1,
      };
    }
    return baseProgress;
  }, [userProfile?.wallet?.totalSpent, testLevel]);

  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'levels'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap: any) => {
      setLevels(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, () => {
      setIsLoading(false);
    });
    return () => unsub();
  }, [firestore]);

  const budgetLevels = useMemo(() => levels.filter(l => l.type === 'budget' || (!l.type && !('reward' in l) && !('frameId' in l))), [levels]);
  const rewardLevels = useMemo(() => levels.filter(l => l.type === 'rewards' || (!l.type && 'reward' in l)), [levels]);
  const frameLevels = useMemo(() => levels.filter(l => l.type === 'frame' || (!l.type && 'frameId' in l)), [levels]);

  const isInRange = (level: number, rangeStr: string) => {
    if (!rangeStr) return false;
    const nums = rangeStr.match(/\d+/g)?.map(Number);
    if (!nums || nums.length === 0) return false;
    if (nums.length === 1) return level === nums[0];
    return level >= nums[0] && level <= nums[1];
  };

  const currentBudgetBg = useMemo(() => {
    if (!budgetLevels.length) return null;
    const matched = budgetLevels.find(d => isInRange(stats.currentLevel, d.range));
    return matched?.imageUrl || matched?.image || null;
  }, [budgetLevels, stats.currentLevel]);

  const handleBudgetPress = (rangeStr: string) => {
    // extract digits from strings like "Lv.20-35" or "Lv.20 - Lv.35"
    const nums = rangeStr.replace(/\s/g, '').match(/\d+/g)?.map(Number);
    if (nums && nums.length > 0) {
      setTestLevel(nums[0]);
    }
  };

  const renderMediaItem = (item: any, idx: number) => {
    const isVideo = item.imageUrl && (item.imageUrl.includes('.mp4') || item.imageUrl.includes('video'));
    const isBudget = item.type === 'budget' || (!item.type && !('reward' in item) && !('frameId' in item));

    // If it's a budget block, render the custom vector badge instead of static Firestore image
    if (isBudget && item.range) {
      // Parse the range to get the average or first level number, e.g. "Lv.11 - Lv.20" -> [11, 20]
      const nums = item.range.replace(/\s/g, '').match(/\d+/g)?.map(Number);
      let displayLevel = 0;
      if (nums && nums.length > 0) {
        // If range has start and end (e.g. 11 and 20), pick the start or average to trigger correct styling
        displayLevel = nums.length > 1 ? Math.floor((nums[0] + nums[1]) / 2) : nums[0];
      }
      return (
        <TouchableOpacity 
          key={item.id || idx} 
          activeOpacity={0.8}
          onPress={() => handleBudgetPress(item.range)}
          style={[styles.gridItem, { backgroundColor: '#090d1f', borderColor: 'rgba(255,255,255,0.06)' }]}
        >
          <UserLevelBadge level={displayLevel} scale={1.3} />
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{item.range}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        key={item.id || idx} 
        activeOpacity={0.8}
        style={[styles.gridItem, { backgroundColor: '#fff', borderColor: '#e2e8f0' }]}
      >
        {item.imageUrl ? (
          isVideo ? (
            <Video
              source={{ uri: item.imageUrl }}
              style={styles.mediaFull}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay isLooping isMuted
            />
          ) : (
            <Image cachePolicy="memory-disk" source={{ uri: item.imageUrl }} style={styles.mediaFull} contentFit="contain" />
          )
        ) : (
          <Text style={styles.noMedia}>No Media</Text>
        )}
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{item.range || `Lv.${idx}`}</Text>
        </View>
        {item.reward ? (
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>{item.reward}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Purple top gradient */}
      <View style={styles.topGradient} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Levels</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={{ paddingHorizontal: 16 }}>

            {/* User Profile Card */}
            {(() => {
              const isUserLv0To10 = stats.currentLevel >= 0 && stats.currentLevel <= 10;
              const showBg = currentBudgetBg && !isUserLv0To10;
              return (
                <View style={[
                  styles.profileCard, 
                  showBg && { padding: 0, overflow: 'hidden' }
                ]}>
                  {showBg && (
                    <Image cachePolicy="memory-disk" source={{ uri: currentBudgetBg }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  )}
                  <View style={[styles.profileCardInner, showBg && { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                    <View style={[styles.profileRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <View style={styles.avatarCircle}>
                          {userProfile?.avatarUrl ? (
                            <Image cachePolicy="memory-disk" source={{ uri: userProfile.avatarUrl }} style={styles.avatarImg} />
                          ) : (
                            <User size={28} color="#8b5cf6" />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.welcomeText}>WELCOME BACK</Text>
                          <Text style={styles.nameText}>{userProfile?.username || 'Gamer'}</Text>
                        </View>
                      </View>
                      
                      <View style={{ marginRight: 8 }}>
                        <UserLevelBadge level={stats.currentLevel} scale={1.2} />
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressRow}>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${stats.progressPercent}%` as any }]} />
                      </View>
                      <Text style={styles.levelText}>Lv.{stats.currentLevel}</Text>
                    </View>
                    <View style={styles.progressMeta}>
                      <Text style={styles.expText}>
                        Need <Text style={{ color: '#fff', fontWeight: '700' }}>{stats.remainingToLevelUp.toLocaleString()}</Text> Exp for Lv.{stats.nextLevel}
                      </Text>
                      <TouchableOpacity onPress={() => setShowRules(true)} style={styles.helpBtn}>
                        <HelpCircle size={20} color="#fde68a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Loading */}
            {isLoading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#8b5cf6" size="large" />
              </View>
            )}

            {/* Budget Section */}
            {!isLoading && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>BUDGET</Text>
                <View style={styles.grid}>
                  {budgetLevels.length > 0 ? budgetLevels.map(renderMediaItem) : (
                    [
                      { range: 'Lv.0-10', displayLevel: 5 },
                      { range: 'Lv.11-20', displayLevel: 15 },
                      { range: 'Lv.21-30', displayLevel: 25 },
                      { range: 'Lv.31-40', displayLevel: 35 },
                      { range: 'Lv.41-50', displayLevel: 45 },
                      { range: 'Lv.51-60', displayLevel: 55 },
                      { range: 'Lv.61-70', displayLevel: 65 },
                      { range: 'Lv.71-80', displayLevel: 75 },
                      { range: 'Lv.81-90', displayLevel: 85 },
                      { range: 'Lv.91-100', displayLevel: 95 },
                    ].map((item, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        onPress={() => setTestLevel(item.displayLevel)}
                        style={[styles.gridItem, { backgroundColor: '#090d1f', borderColor: 'rgba(255,255,255,0.06)' }]}
                        activeOpacity={0.8}
                      >
                        <UserLevelBadge level={item.displayLevel} scale={1.3} />
                        <View style={styles.levelBadge}>
                          <Text style={styles.levelBadgeText}>{item.range}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* Rewards Section */}
            {!isLoading && rewardLevels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>REWARDS</Text>
                <View style={styles.grid}>{rewardLevels.map(renderMediaItem)}</View>
              </View>
            )}

            {/* Frames Section */}
            {!isLoading && frameLevels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>FRAMES</Text>
                <View style={styles.grid}>{frameLevels.map(renderMediaItem)}</View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Rules Modal */}
      <Modal visible={showRules} transparent animationType="fade" onRequestClose={() => setShowRules(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowRules(false)}>
                <ChevronLeft size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Rules</Text>
              <View style={{ width: 28 }} />
            </View>
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.ruleHead}>Gift coins consumption</Text>
              <Text style={styles.ruleAmber}>5 coins = 1 Exp</Text>
              <View style={styles.ruleBox}><Text style={styles.ruleBoxText}>Svip2 privilege: 5coins = 1.2EXP</Text></View>
              <View style={styles.ruleBox}><Text style={styles.ruleBoxText}>Svip7 privilege: 5coins = 1.3EXP</Text></View>
              <Text style={[styles.ruleHead, { marginTop: 12 }]}>Enter the room</Text>
              <Text style={styles.ruleAmber}>2000 Exp/day</Text>
              <Text style={[styles.ruleHead, { marginTop: 12 }]}>Share the room</Text>
              <Text style={styles.ruleAmber}>2000 Exp/day</Text>
              <Text style={[styles.ruleHead, { marginTop: 12 }]}>Stay in your own room (Limited)</Text>
              <Text style={styles.ruleAmber}>10mins = 1000 Exp, 10000 Exp/day</Text>
              <Text style={[styles.ruleHead, { marginTop: 12 }]}>Stay in other rooms (Limited)</Text>
              <Text style={styles.ruleAmber}>10mins = 1000 Exp, 20000 Exp/day</Text>
              <Text style={[styles.ruleHead, { marginTop: 12 }]}>Participate in activities</Text>
              <Text style={styles.ruleAmber}>Speed up upgrade</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: 'rgba(139,92,246,0.12)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#7c3aed', letterSpacing: 2, textTransform: 'uppercase' },
  profileCard: { backgroundColor: 'rgba(147,51,234,1)', borderRadius: 20, marginTop: 8, minHeight: 130, shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6, overflow: 'hidden' },
  profileCardInner: { padding: 20, width: '100%' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16, width: '100%' },
  avatarCircle: { height: 56, width: 56, borderRadius: 28, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  welcomeText: { fontSize: 10, color: '#e9d5ff', letterSpacing: 1.5, fontWeight: '600' },
  nameText: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBarBg: { flex: 1, height: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 5 },
  levelText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  expText: { fontSize: 11, color: '#e9d5ff', fontWeight: '500' },
  helpBtn: { padding: 6, borderRadius: 16 },
  loadingBox: { alignItems: 'center', padding: 40 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#1f2937', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: '31%', height: 110, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', padding: 8, overflow: 'hidden', position: 'relative' },
  mediaFull: { width: '100%', flex: 1 },
  noMedia: { fontSize: 9, color: '#cbd5e1', fontWeight: '600' },
  levelBadge: { marginTop: 4, backgroundColor: 'rgba(100,116,139,0.8)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  levelBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 1 },
  rewardBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(124,58,237,0.9)', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 6 },
  rewardText: { fontSize: 7, color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 360, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#faf5ff' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#7c3aed' },
  ruleHead: { fontSize: 13, fontWeight: '700', color: '#7c3aed', marginBottom: 4 },
  ruleAmber: { fontSize: 12, color: '#d97706', fontWeight: '600', marginBottom: 8 },
  ruleBox: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 10, marginBottom: 6 },
  ruleBoxText: { fontSize: 11, color: '#92400e' },
});
