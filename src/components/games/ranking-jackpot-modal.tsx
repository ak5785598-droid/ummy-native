import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { X, Trophy, Clock, HelpCircle, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser, useFirestore, useCollection, useDoc } from '../../firebase/provider';
import { collection, query, where, orderBy, limit, doc, onSnapshot } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { toCDN } from '../../lib/cdn';
import { GoldenCoin } from '../GoldenCoin';

interface RankingJackpotModalProps {
  visible: boolean;
  onClose: () => void;
  gameId?: string;
}

interface WagerItem {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  coinsPlayed: number;
}

export function RankingJackpotModal({ visible, onClose, gameId }: RankingJackpotModalProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const [activeTab, setActiveTab] = useState<'today' | 'yesterday' | 'winners' | 'rewards'>('today');
  const [countdown, setCountdown] = useState('00:00:00');
  const [jackpotPool, setJackpotPool] = useState(0);

  const [todayRankings, setTodayRankings] = useState<WagerItem[]>([]);
  const [yesterdayRankings, setYesterdayRankings] = useState<WagerItem[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingYesterday, setLoadingYesterday] = useState(false);
  const [recentWinners, setRecentWinners] = useState<any[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(false);

  const getTodayStr = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const todayStr = getTodayStr(0);
  const yesterdayStr = getTodayStr(-1);

  // 1. Fetch Live Jackpot Pool Ticker
  useEffect(() => {
    if (!visible || !firestore) return;
    const poolRef = doc(firestore, 'jackpots', 'daily');
    const unsub = onSnapshot(poolRef, (snap: any) => {
      if (snap.exists()) {
        setJackpotPool(snap.data().totalPool || 100000); // Default fallback pool if low
      } else {
        setJackpotPool(100000);
      }
    }, () => {});
    return () => unsub();
  }, [visible, firestore]);

  // 2. Fetch Today Rankings
  useEffect(() => {
    if (!visible || !firestore) return;
    setLoadingToday(true);
    const q = query(
      collection(firestore, 'gameDailyWagers'),
      where('date', '==', todayStr),
      orderBy('coinsPlayed', 'desc'),
      limit(15)
    );
    const unsub = onSnapshot(q, (snap: any) => {
      const items = snap.docs.map((d: any) => ({
        id: d.id,
        ...d.data()
      }));
      setTodayRankings(items);
      setLoadingToday(false);
    }, () => setLoadingToday(false));
    return () => unsub();
  }, [visible, firestore, todayStr]);

  // 3. Fetch Yesterday Rankings
  useEffect(() => {
    if (!visible || !firestore || activeTab !== 'yesterday') return;
    setLoadingYesterday(true);
    const q = query(
      collection(firestore, 'gameDailyWagers'),
      where('date', '==', yesterdayStr),
      orderBy('coinsPlayed', 'desc'),
      limit(15)
    );
    const unsub = onSnapshot(q, (snap: any) => {
      const items = snap.docs.map((d: any) => ({
        id: d.id,
        ...d.data()
      }));
      setYesterdayRankings(items);
      setLoadingYesterday(false);
    }, () => setLoadingYesterday(false));
    return () => unsub();
  }, [visible, firestore, yesterdayStr, activeTab]);

  // 4. Fetch Recent Winners (from globalGameWins)
  useEffect(() => {
    if (!visible || !firestore || activeTab !== 'winners') return;
    setLoadingWinners(true);
    const q = query(
      collection(firestore, 'globalGameWins'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap: any) => {
      let items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      if (gameId) items = items.filter((w: any) => w.gameId === gameId);
      setRecentWinners(items);
      setLoadingWinners(false);
    }, () => setLoadingWinners(false));
    return () => unsub();
  }, [visible, firestore, activeTab, gameId]);

  // 4. Daily Countdown Ticker (UTC Reset Timer)
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      const now = new Date();
      const nextReset = new Date();
      nextReset.setUTCHours(24, 0, 0, 0); // Reset at 00:00 UTC next day

      const diffMs = nextReset.getTime() - now.getTime();
      if (diffMs <= 0) {
        setCountdown('00:00:00');
        return;
      }

      const hrs = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
      const mins = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
      const secs = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
      setCountdown(`${hrs}:${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  // Format Jackpot number to 10-digit mechanical style string
  const formattedPoolDigits = useMemo(() => {
    return jackpotPool.toString().padStart(10, '0').split('');
  }, [jackpotPool]);

  // User's own wager item stats
  const myWagerToday = useMemo(() => {
    return todayRankings.find(r => r.userId === user?.uid) || null;
  }, [todayRankings, user?.uid]);

  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: ['#fef08a', '#eab308'], border: '#facc15', label: 'TOP 1', text: '#854d0e', glow: 'rgba(234,179,8,0.3)' };
    if (index === 1) return { bg: ['#e2e8f0', '#94a3b8'], border: '#cbd5e1', label: 'TOP 2', text: '#334155', glow: 'rgba(148,163,184,0.2)' };
    if (index === 2) return { bg: ['#ffedd5', '#ea580c'], border: '#fed7aa', label: 'TOP 3', text: '#7c2d12', glow: 'rgba(234,88,12,0.2)' };
    return null;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <LinearGradient
          colors={['#3b0764', '#1e1b4b', '#0f172a']}
          style={{
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            height: '85%',
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.3)'
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy size={20} color="#fbbf24" />
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1.5 }}>Ranking Jackpot</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
              <X size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          {/* ── MECHANICAL PRIZE POOL TICKER ── */}
          <View style={{ alignItems: 'center', paddingVertical: 18, backgroundColor: 'rgba(0,0,0,0.25)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Estimated Jackpot Pool</Text>
            
            {/* Vintage Mechanical Counter Layout */}
            <View style={{ flexDirection: 'row', gap: 3, backgroundColor: '#1e1b4b', padding: 8, borderRadius: 14, borderWidth: 2, borderColor: '#d97706', shadowColor: '#d97706', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}>
              <View style={{ width: 24, height: 32, backgroundColor: '#b45309', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 2 }}>
                <GoldenCoin size={20} />
              </View>
              {formattedPoolDigits.map((digit, idx) => (
                <View key={idx} style={{ width: 22, height: 32, backgroundColor: '#0f172a', borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                  <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '900', fontFamily: 'monospace' }}>{digit}</Text>
                </View>
              ))}
            </View>

            {/* Countdown timer ticker */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 }}>
              <Clock size={12} color="#f43f5e" />
              <Text style={{ color: '#fda4af', fontSize: 11, fontWeight: '800' }}>Resets in: {countdown}</Text>
            </View>
          </View>

          {/* Navigation Tabs */}
          <View style={{ flexDirection: 'row', padding: 12, backgroundColor: 'rgba(0,0,0,0.15)' }}>
            {(['today', 'yesterday', 'winners', 'rewards'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 14,
                  backgroundColor: activeTab === tab ? 'rgba(168,85,247,0.25)' : 'transparent',
                  borderWidth: activeTab === tab ? 1 : 0,
                  borderColor: 'rgba(168,85,247,0.4)'
                }}
              >
                <Text style={{ color: activeTab === tab ? '#e9d5ff' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>{tab === 'today' ? 'TODAY' : tab === 'yesterday' ? 'YESTERDAY' : tab === 'winners' ? '🏆 WINS' : 'REWARDS'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Main Content Area */}
          <View style={{ flex: 1 }}>
            {activeTab === 'rewards' ? (
              /* Rewards / Rules list */
              <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#c084fc', marginBottom: 12, textTransform: 'uppercase' }}>Jackpot Reward Rules</Text>
                
                {/* Reward Splits Map */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 }}>
                  {[
                    { rank: 'TOP 1', percent: '50% of total pool' },
                    { rank: 'TOP 2', percent: '22% of total pool' },
                    { rank: 'TOP 3', percent: '10% of total pool' },
                    { rank: '4 - 9 Ranks', percent: '2% of total pool (each)' },
                    { rank: '10 - 15 Ranks', percent: '1% of total pool (each)' }
                  ].map((rule, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: idx === 4 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{rule.rank}</Text>
                      <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '900' }}>{rule.percent}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 16 }}>1. Each round of any game contributes 5% of played coins into the prize pool.</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 16 }}>2. Rankings depend on the total amount of coins wagered; the more coins wagered, the higher the ranking.</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 16 }}>3. Leaderboards are refreshed daily at 00:00 (UTC+0), and rewards are distributed simultaneously.</Text>
                </View>
              </ScrollView>
            ) : activeTab === 'winners' ? (
              /* Recent Winners List */
              <View style={{ flex: 1 }}>
                {loadingWinners ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#c084fc" />
                  </View>
                ) : recentWinners.length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>No winners yet</Text>
                  </View>
                ) : (
                  <FlatList
                    data={recentWinners}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                    removeClippedSubviews={true}
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    renderItem={({ item, index }) => {
                      const isMe = item.userId === user?.uid;
                      const rankConf = getRankStyle(index);
                      return (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18,
                          backgroundColor: isMe ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                          marginBottom: 8,
                          borderWidth: isMe ? 1.5 : 1,
                          borderColor: isMe ? '#a855f7' : 'rgba(255,255,255,0.04)',
                        }}>
                          <View style={{ width: 48, alignItems: 'center' }}>
                            {rankConf ? (
                              <LinearGradient colors={rankConf.bg} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                <Text style={{ color: rankConf.text, fontSize: 9, fontWeight: '900' }}>{rankConf.label}</Text>
                              </LinearGradient>
                            ) : (
                              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800' }}>{index + 1}</Text>
                            )}
                          </View>
                          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 12, overflow: 'hidden' }}>
                            {item.avatarUrl ? (
                              <Image cachePolicy="memory-disk" source={{ uri: toCDN(item.avatarUrl) }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                              <View style={{ flex: 1, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{item.username?.[0]?.toUpperCase()}</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{item.username}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 }}>{item.gameId}</Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: '#4ade80' }}>+{item.amount?.toLocaleString()}</Text>
                        </View>
                      );
                    }}
                  />
                )}
              </View>
            ) : (
              /* Rankings List (Today / Yesterday) */
              <View style={{ flex: 1 }}>
                {((activeTab === 'today' && loadingToday) || (activeTab === 'yesterday' && loadingYesterday)) ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#c084fc" />
                  </View>
                ) : (activeTab === 'today' ? todayRankings : yesterdayRankings).length === 0 ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' }}>No wagers registered yet</Text>
                  </View>
                ) : (
                  <FlatList
                    data={activeTab === 'today' ? todayRankings : yesterdayRankings}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                    removeClippedSubviews={true}
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    renderItem={({ item, index }) => {
                      const rankConf = getRankStyle(index);
                      const isMe = item.userId === user?.uid;
                      return (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 12,
                            borderRadius: 18,
                            backgroundColor: isMe ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                            marginBottom: 8,
                            borderWidth: isMe ? 1.5 : 1,
                            borderColor: isMe ? '#a855f7' : rankConf ? rankConf.border : 'rgba(255,255,255,0.04)',
                            shadowColor: rankConf ? rankConf.border : 'transparent',
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: rankConf ? 2 : 0
                          }}
                        >
                          {/* Rank label */}
                          <View style={{ width: 48, alignItems: 'center', justifyContent: 'center' }}>
                            {rankConf ? (
                              <LinearGradient
                                colors={rankConf.bg}
                                style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, shadowColor: rankConf.border, shadowOpacity: 0.3, shadowRadius: 3 }}
                              >
                                <Text style={{ color: rankConf.text, fontSize: 9, fontWeight: '900' }}>{rankConf.label}</Text>
                              </LinearGradient>
                            ) : (
                              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800' }}>{index + 1}</Text>
                            )}
                          </View>

                          {/* Avatar */}
                          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 12, overflow: 'hidden' }}>
                            {item.avatarUrl ? (
                              <Image cachePolicy="memory-disk" source={{ uri: toCDN(item.avatarUrl) }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                              <View style={{ flex: 1, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{item.username?.[0]?.toUpperCase()}</Text>
                              </View>
                            )}
                          </View>

                          {/* Username */}
                          <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                            {item.username}
                          </Text>

                          {/* Played wager info (Mask opponent coins played) */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <GoldenCoin size={14} />
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#fbbf24' }}>
                              {isMe ? item.coinsPlayed.toLocaleString() : '*********'}
                            </Text>
                          </View>
                        </View>
                      );
                    }}
                  />
                )}
              </View>
            )}
          </View>

          {/* User's own wager card display at bottom */}
          {activeTab === 'today' && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', backgroundColor: '#13112c', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, overflow: 'hidden', marginRight: 10 }}>
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(user?.photoURL) || 'https://picsum.photos/100' }} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <View>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Your Today Wager</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 2 }}>Keep playing games to rank up!</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <GoldenCoin size={16} />
                  <Text style={{ color: '#fbbf24', fontSize: 15, fontWeight: '900' }}>
                    {myWagerToday ? myWagerToday.coinsPlayed.toLocaleString() : '0'}
                  </Text>
                </View>
              </View>
            </View>
          )}

        </LinearGradient>
      </View>
    </Modal>
  );
}
