import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Users, Search, Plus, Trophy, Flame, ShieldCheck, TrendingUp, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useFirestore } from '@/firebase/provider';
import { collection, query, orderBy, limit, onSnapshot } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';

export default function FamiliesScreen() {
  const router = useRouter();
  const firestore = useFirestore();
  const [families, setFamilies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!firestore) return;
    const q = query(
      collection(firestore, 'families'),
      orderBy('totalWealth', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap: any) => {
      setFamilies(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, (err: any) => {
      console.warn('[Families] fetch error:', err);
      setIsLoading(false);
    });
    return () => unsub();
  }, [firestore]);

  const filteredFamilies = useMemo(() => {
    if (!families.length) return [];
    const q = searchQuery.toLowerCase();
    if (!q) return families;
    return families.filter(f =>
      f.name?.toLowerCase().includes(q) || f.id?.toLowerCase().includes(q)
    );
  }, [families, searchQuery]);

  const getRankStyle = (idx: number) => {
    if (idx === 0) return { bg: '#facc15', text: '#713f12' };
    if (idx === 1) return { bg: '#cbd5e1', text: '#1e293b' };
    if (idx === 2) return { bg: '#fb923c', text: '#fff' };
    return null;
  };

  const renderFamily = ({ item, index }: { item: any; index: number }) => {
    const rank = getRankStyle(index);
    return (
      <TouchableOpacity
        style={styles.familyCard}
        onPress={() => router.push(`/families/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.familyCardInner}>
          {/* Banner */}
          <View style={styles.bannerWrap}>
            <Image cachePolicy="memory-disk" source={{ uri: item.bannerUrl || `https://picsum.photos/seed/${item.id}/200` }}
              style={styles.bannerImg}
              contentFit="cover"
            />
            {index < 3 && rank && (
              <View style={[styles.rankBadge, { backgroundColor: rank.bg }]}>
                <Text style={[styles.rankText, { color: rank.text }]}>{index + 1}</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.familyInfo}>
            <View style={styles.familyNameRow}>
              <Text style={styles.familyName} numberOfLines={1}>{item.name?.toUpperCase()}</Text>
              {item.isVerified && <ShieldCheck size={14} color="#10b981" />}
            </View>
            <View style={styles.familyMeta}>
              <View style={styles.metaItem}>
                <Users size={11} color="#94a3b8" />
                <Text style={styles.metaText}>{item.memberCount || 0} Members</Text>
              </View>
              <View style={styles.metaItem}>
                <Trophy size={11} color="#eab308" />
                <Text style={styles.metaText}>Lv.{item.level || 1}</Text>
              </View>
            </View>
          </View>

          {/* Power score */}
          <View style={styles.scoreWrap}>
            <View style={styles.scoreRow}>
              <Flame size={14} color="#f97316" />
              <Text style={styles.scoreNum}>{(item.totalWealth || 0).toLocaleString()}</Text>
            </View>
            <Text style={styles.scoreLabel}>POWER SCORE</Text>
          </View>

          <ChevronRight size={16} color="#cbd5e1" />
        </View>
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
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ChevronLeft size={24} color="#0f172a" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>SOCIAL KINGS</Text>
              <Text style={styles.headerSub}>Conquer the leaderboard with your family.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/families/create' as any)}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <Search size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Families by name or ID..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color="#7c3aed" size="large" />
            <Text style={styles.loadingText}>Searching the clans...</Text>
          </View>
        ) : filteredFamilies.length === 0 ? (
          <View style={styles.centerBox}>
            <View style={styles.emptyIcon}>
              <Search size={36} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No Families Found</Text>
            <Text style={styles.emptyDesc}>Try searching with a different name or create your own legacy.</Text>
            <TouchableOpacity
              style={styles.createBtnLarge}
              onPress={() => router.push('/families/create' as any)}
            >
              <Text style={styles.createBtnLargeText}>Found a New Family</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredFamilies}
            keyExtractor={item => item.id}
            renderItem={renderFamily}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            ListHeaderComponent={
              <View style={styles.rankHeader}>
                <TrendingUp size={16} color="#10b981" />
                <Text style={styles.rankHeaderText}>GLOBAL POWER RANKINGS</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: 'rgba(139,92,246,0.08)' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, shadowColor: '#7c3aed', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  createBtnText: { color: '#fff', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, height: 52, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  rankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  rankHeaderText: { fontSize: 11, fontWeight: '900', color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase' },
  familyCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  familyCardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  bannerWrap: { position: 'relative' },
  bannerImg: { width: 60, height: 60, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  rankBadge: { position: 'absolute', top: -6, left: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  rankText: { fontSize: 10, fontWeight: '900' },
  familyInfo: { flex: 1, minWidth: 0 },
  familyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  familyName: { fontSize: 15, fontWeight: '700', color: '#0f172a', letterSpacing: -0.3, flexShrink: 1 },
  familyMeta: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  scoreWrap: { alignItems: 'flex-end' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  scoreNum: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  scoreLabel: { fontSize: 7, color: '#94a3b8', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 1 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase' },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: -0.3 },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  createBtnLarge: { marginTop: 20, backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  createBtnLargeText: { color: '#fff', fontWeight: '700', fontSize: 14, textTransform: 'uppercase' },
});
