import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Users, Trophy, Flame, ShieldCheck, ChevronRight, Plus, Crown, Swords, Info, X } from 'lucide-react-native';
import { useCollection, useFirebase, useUser } from '../../firebase/provider';
import { collection, query, orderBy, limit } from '../../firebase/firestore-compat';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { toCDN } from '@/lib/cdn';
import { LinearGradient } from 'expo-linear-gradient';
import { FamilyBackground } from '../../components/families/FamilyBackground';

export default function FamiliesIndex() {
  const router = useRouter();
  const { firestore, isHydrated } = useFirebase();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  const familiesQuery = useMemo(() => {
    if (!firestore || !isHydrated) return null;
    return query(collection(firestore, 'families'), orderBy('totalWealth', 'desc'), limit(50));
  }, [firestore, isHydrated]);

  const { data: families, isLoading } = useCollection(familiesQuery);

  const filteredFamilies = useMemo(() => {
    if (!families) return [];
    return families.filter(f =>
      f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [families, searchQuery]);

  const getRankStyle = (idx: number) => {
    if (idx === 0) return { border: '#fbbf24', glow: 'rgba(251,191,36,0.4)', emoji: '🥇', labelColor: '#fbbf24' };
    if (idx === 1) return { border: '#94a3b8', glow: 'rgba(148,163,184,0.35)', emoji: '🥈', labelColor: '#94a3b8' };
    if (idx === 2) return { border: '#f97316', glow: 'rgba(249,115,22,0.35)', emoji: '🥉', labelColor: '#f97316' };
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#03000f' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── ANIMATED BACKGROUND ── */}
      <FamilyBackground />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* ── HEADER ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ChevronLeft size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Crown size={14} color="#fbbf24" />
                <Text style={styles.headerTitle}>Social Kings</Text>
              </View>
              <Text style={styles.headerSub}>Conquer the leaderboard with your clan</Text>
            </View>

            <TouchableOpacity onPress={() => setShowInfo(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(251,191,36,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Info size={16} color="#fbbf24" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/families/create')} style={styles.createBtn}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6', '#a855f7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createBtnGrad}
              >
                <Plus size={14} color="white" />
                <Text style={styles.createBtnText}>Create</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── SEARCH BAR ── */}
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Search size={16} color="rgba(251,191,36,0.5)" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search clans & dynasties..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.searchInput}
              />
            </View>
          </View>

          {/* ── SECTION LABEL ── */}
          <View style={styles.sectionLabelRow}>
            <View style={styles.sectionLine} />
            <View style={styles.sectionChip}>
              <Trophy size={10} color="#fbbf24" fill="#fbbf24" />
              <Text style={styles.sectionChipText}>Hall of Dynasties</Text>
              <Trophy size={10} color="#fbbf24" fill="#fbbf24" />
            </View>
            <View style={styles.sectionLine} />
          </View>

          {/* ── LOADING ── */}
          {isLoading && (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#a855f7" />
              <Text style={styles.emptyText}>Summoning clans...</Text>
            </View>
          )}

          {/* ── EMPTY ── */}
          {!isLoading && filteredFamilies.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 44, marginBottom: 10 }}>⚔️</Text>
              <Text style={styles.emptyTitle}>No Clans Found</Text>
              <Text style={styles.emptySubText}>Be the first to forge a dynasty!</Text>
            </View>
          )}

          {/* ── FAMILY LIST ── */}
          <View style={{ paddingHorizontal: 14, gap: 10 }}>
            {filteredFamilies.map((family, idx) => {
              const rank = getRankStyle(idx);
              const isTop3 = idx < 3;

              return (
                <TouchableOpacity
                  key={family.id}
                  onPress={() => router.push(`/families/${family.id}`)}
                  activeOpacity={0.82}
                  style={[
                    styles.familyRow,
                    isTop3 && {
                      borderColor: rank?.border || 'rgba(255,255,255,0.12)',
                      shadowColor: rank?.glow || 'transparent',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.6,
                      shadowRadius: 12,
                      elevation: 8,
                    },
                  ]}
                >
                  {/* Rank glow bg for top 3 */}
                  {isTop3 && (
                    <LinearGradient
                      colors={[`${rank?.glow || 'transparent'}`.replace('0.', '0.06'), 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}

                  {/* Rank number badge */}
                  <View style={[styles.rankBadge, isTop3 && { borderColor: rank?.border || 'rgba(255,255,255,0.2)' }]}>
                    {isTop3 ? (
                      <Text style={{ fontSize: 13 }}>{rank?.emoji}</Text>
                    ) : (
                      <Text style={[styles.rankNum, { color: idx < 10 ? '#a78bfa' : 'rgba(255,255,255,0.3)' }]}>
                        {idx + 1}
                      </Text>
                    )}
                  </View>

                  {/* Family banner/avatar */}
                  <View style={[styles.bannerWrap, isTop3 && { borderColor: rank?.border || 'rgba(255,255,255,0.15)' }]}>
                    <Image
                      cachePolicy="memory-disk"
                      source={{ uri: toCDN(family.bannerUrl) || `https://picsum.photos/seed/${family.id}/200` }}
                      style={styles.bannerImg}
                      contentFit="cover"
                    />
                    {isTop3 && (
                      <View style={[styles.bannerGlow, { shadowColor: rank?.border }]} />
                    )}
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <Text style={[styles.familyName, isTop3 && { color: rank?.labelColor || '#fff' }]} numberOfLines={1}>
                        {family.name}
                      </Text>
                      {family.isVerified && <ShieldCheck size={12} color="#4ade80" />}
                    </View>
                    <View style={styles.familyMeta}>
                      <View style={styles.metaChip}>
                        <Users size={9} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.metaText}>{family.memberCount || 0}</Text>
                      </View>
                      <Text style={styles.metaDot}>·</Text>
                      <View style={styles.metaChip}>
                        <Trophy size={9} color="#fbbf24" />
                        <Text style={styles.metaText}>Lv.{family.level || 1}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Power score */}
                  <View style={styles.powerBlock}>
                    <View style={styles.powerRow}>
                      <Flame size={12} color="#f97316" />
                      <Text style={styles.powerText}>{(family.totalWealth || 0).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.powerLabel}>POWER</Text>
                  </View>

                  <ChevronRight size={16} color="rgba(255,255,255,0.15)" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 24, width: '90%', maxWidth: 400, padding: 24, position: 'relative' }}>
            <TouchableOpacity onPress={() => setShowInfo(false)} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f1f5f9' }}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: 16 }}>Family Ranking Info</Text>
            <View style={{ backgroundColor: '#fef3c7', borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', color: '#d97706', marginBottom: 4 }}>👨‍👩‍👧‍👦 Family Ranking</Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>Ranking is determined by the total <Text style={{ fontWeight: '700', color: '#d97706' }}>Family Wealth</Text> of all members.</Text>
            </View>
            <View style={{ backgroundColor: '#fffbeb', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fbbf24' }}>
              <Text style={{ fontWeight: '700', color: '#b45309', marginBottom: 6 }}>🎁 Ranking Rewards</Text>
              <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 18 }}>
                <Text style={{ fontWeight: '700' }}>Top 3:</Text> Exclusive Frames + Coins{'\n'}
                <Text style={{ fontWeight: '700' }}>Rank 4 - 7:</Text> Coins{'\n'}
                <Text style={{ fontWeight: '700' }}>Rank 8 - 10:</Text> Coins{'\n\n'}
                Weekly and Monthly rewards are 3x of Daily.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowInfo(false)} style={{ marginTop: 20, paddingVertical: 12, backgroundColor: '#0f172a', borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(251,191,36,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  createBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Search
  searchWrap: {
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // Section label
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(251,191,36,0.2)',
  },
  sectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionChipText: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptySubText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
  },

  // Family row card
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    position: 'relative',
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankNum: {
    fontSize: 11,
    fontWeight: '900',
  },
  bannerWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerGlow: {
    position: 'absolute',
    inset: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  familyName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  familyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '700',
  },
  metaDot: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
  },
  powerBlock: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  powerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  powerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  powerLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 1,
  },
});
