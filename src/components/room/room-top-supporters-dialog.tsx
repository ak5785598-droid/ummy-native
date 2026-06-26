import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Crown, Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TopSupporter } from '../../lib/types';
import { Image } from 'expo-image';
import { GoldenCoin } from '../GoldenCoin';

interface RoomTopSupportersDialogProps {
  visible: boolean;
  onClose: () => void;
  supporters?: TopSupporter[];
}

// Mini profile popup shown when a supporter is tapped
function SupporterProfilePopup({
  supporter,
  rank,
  onClose,
}: {
  supporter: (TopSupporter & { displayAmount: number }) | null;
  rank: number;
  onClose: () => void;
}) {
  if (!supporter) return null;

  const rankConfig: Record<number, { border: string; badge: string; crownColor: string }> = {
    1: { border: '#fbbf24', badge: '#d97706', crownColor: '#fbbf24' },
    2: { border: '#cbd5e1', badge: '#94a3b8', crownColor: '#cbd5e1' },
    3: { border: '#d97706', badge: '#92400e', crownColor: '#d97706' },
  };
  const cfg = rankConfig[rank] || { border: '#475569', badge: '#334155', crownColor: '#94a3b8' };

  return (
    <Modal visible={!!supporter} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} activeOpacity={1} />
        <View style={{ backgroundColor: '#0f172a', borderRadius: 24, width: '100%', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <LinearGradient colors={['#1e293b', '#0f172a']} style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24 }}>
            {rank <= 3 && (
              <Crown size={20} color={cfg.crownColor} fill={cfg.crownColor} style={{ marginBottom: 8 }} />
            )}
            <View style={{ borderColor: cfg.border, borderWidth: 3, borderRadius: 50, marginBottom: 12 }}>
              <Image cachePolicy="memory-disk" source={{ uri: supporter.avatarUrl || 'https://picsum.photos/100' }} style={{ width: 80, height: 80, borderRadius: 40 }} />
            </View>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '900', marginBottom: 2 }}>{supporter.username}</Text>
            <View style={{ backgroundColor: cfg.badge, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 20 }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>#{rank} Contributor</Text>
            </View>
          </LinearGradient>

          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: '900' }}>{(supporter.dailyAmount || 0).toLocaleString()}</Text>
              <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', marginTop: 2 }}>TODAY</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ color: '#22d3ee', fontSize: 16, fontWeight: '900' }}>{(supporter.weeklyAmount || 0).toLocaleString()}</Text>
              <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', marginTop: 2 }}>THIS WEEK</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={{ margin: 16, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '700' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function RoomTopSupportersDialog({ visible, onClose, supporters = [] }: RoomTopSupportersDialogProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'total'>('daily');
  const [selectedSupporter, setSelectedSupporter] = useState<(TopSupporter & { displayAmount: number }) | null>(null);
  const [selectedRank, setSelectedRank] = useState(0);

  const getSortedSupporters = () => {
    const key = activeTab === 'weekly' ? 'weeklyAmount' : activeTab === 'total' ? 'amount' : 'dailyAmount';
    return [...supporters]
      .map(s => ({ ...s, displayAmount: (s as any)[key] || 0 }))
      .filter(s => s.displayAmount > 0)
      .sort((a, b) => b.displayAmount - a.displayAmount);
  };

  const sorted = getSortedSupporters();
  const top3 = [sorted[0] || null, sorted[1] || null, sorted[2] || null];
  const rest = sorted.slice(3);

  const openProfile = (supporter: typeof sorted[0] | null, rank: number) => {
    if (!supporter) return;
    setSelectedSupporter(supporter);
    setSelectedRank(rank);
  };

  // Crown colors per rank
  const crownColors = ['#fbbf24', '#cbd5e1', '#d97706'];
  const borderColors = ['#fbbf24', '#94a3b8', '#d97706'];
  const avatarSizes = [68, 56, 56];

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} activeOpacity={1} />

          <View style={{ backgroundColor: '#0f1929', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%', overflow: 'hidden' }}>
            {/* Header with trophy + title */}
            <LinearGradient colors={['#1a2540', '#0f1929']} style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 20, paddingHorizontal: 16 }}>
              <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 6 }}>
                <X size={16} color="white" />
              </TouchableOpacity>

              {/* Trophy icon */}
              <View style={{ backgroundColor: 'rgba(251,191,36,0.15)', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', marginBottom: 10 }}>
                <Crown size={28} color="#fbbf24" fill="#fbbf24" />
              </View>

              <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' }}>Room Supporters</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' }}>Top Givers of the Room</Text>
            </LinearGradient>

            {/* Daily / Weekly tabs */}
            <View style={{ flexDirection: 'row', marginHorizontal: 24, marginTop: 16, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 30, padding: 4 }}>
              {(['daily', 'weekly', 'total'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    { flex: 1, paddingVertical: 10, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
                    activeTab === tab ? { backgroundColor: '#1e3a5f' } : {}
                  ]}
                >
                  <Text style={{ color: activeTab === tab ? '#fbbf24' : 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {tab === 'total' ? 'ALL TIME' : tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Podium */}
              {sorted.length > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32, gap: 8 }}>

                  {/* 2nd Place - left */}
                  <TouchableOpacity
                    style={{ alignItems: 'center', flex: 1 }}
                    onPress={() => openProfile(top3[1], 2)}
                    disabled={!top3[1]}
                  >
                    {top3[1] ? (
                      <>
                        <Crown size={18} color={crownColors[1]} fill={crownColors[1]} style={{ marginBottom: 4 }} />
                        <View style={{ position: 'relative' }}>
                          <View style={{ borderWidth: 2.5, borderColor: borderColors[1], borderRadius: 40, padding: 2 }}>
                            <Image cachePolicy="memory-disk" source={{ uri: top3[1].avatarUrl || 'https://picsum.photos/100' }} style={{ width: avatarSizes[1], height: avatarSizes[1], borderRadius: 30 }} />
                          </View>
                          {/* Rank badge */}
                          <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: borderColors[1], width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0f1929' }}>
                            <Text style={{ color: '#0f172a', fontSize: 9, fontWeight: '900' }}>2</Text>
                          </View>
                        </View>
                        <Text style={{ color: '#cbd5e1', fontSize: 11, fontWeight: '900', marginTop: 10, textAlign: 'center' }} numberOfLines={1}>{top3[1].username}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                          <GoldenCoin size={10} />
                          <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '900' }}>{(top3[1].displayAmount / 1000000 >= 1 ? `${(top3[1].displayAmount / 1000000).toFixed(1)}M` : top3[1].displayAmount.toLocaleString())}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                    )}
                  </TouchableOpacity>

                  {/* 1st Place - center, raised */}
                  <TouchableOpacity
                    style={{ alignItems: 'center', flex: 1, marginBottom: 12 }}
                    onPress={() => openProfile(top3[0], 1)}
                    disabled={!top3[0]}
                  >
                    {top3[0] ? (
                      <>
                        <Crown size={22} color={crownColors[0]} fill={crownColors[0]} style={{ marginBottom: 4 }} />
                        <View style={{ position: 'relative' }}>
                          {/* Glow ring */}
                          <View style={{ position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(251,191,36,0.3)' }} />
                          <View style={{ borderWidth: 3, borderColor: borderColors[0], borderRadius: 40, padding: 2 }}>
                            <Image cachePolicy="memory-disk" source={{ uri: top3[0].avatarUrl || 'https://picsum.photos/100' }} style={{ width: avatarSizes[0], height: avatarSizes[0], borderRadius: 34 }} />
                          </View>
                          <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: borderColors[0], width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0f1929' }}>
                            <Text style={{ color: '#0f172a', fontSize: 9, fontWeight: '900' }}>1</Text>
                          </View>
                        </View>
                        <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '900', marginTop: 10, textAlign: 'center' }} numberOfLines={1}>{top3[0].username}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, backgroundColor: 'rgba(251,191,36,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                          <GoldenCoin size={10} />
                          <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '900' }}>{(top3[0].displayAmount / 1000000 >= 1 ? `${(top3[0].displayAmount / 1000000).toFixed(1)}M` : top3[0].displayAmount.toLocaleString())}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                    )}
                  </TouchableOpacity>

                  {/* 3rd Place - right */}
                  <TouchableOpacity
                    style={{ alignItems: 'center', flex: 1 }}
                    onPress={() => openProfile(top3[2], 3)}
                    disabled={!top3[2]}
                  >
                    {top3[2] ? (
                      <>
                        <Crown size={18} color={crownColors[2]} fill={crownColors[2]} style={{ marginBottom: 4 }} />
                        <View style={{ position: 'relative' }}>
                          <View style={{ borderWidth: 2.5, borderColor: borderColors[2], borderRadius: 35, padding: 2 }}>
                            <Image cachePolicy="memory-disk" source={{ uri: top3[2].avatarUrl || 'https://picsum.photos/100' }} style={{ width: avatarSizes[2], height: avatarSizes[2], borderRadius: 28 }} />
                          </View>
                          <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: borderColors[2], width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0f1929' }}>
                            <Text style={{ color: '#0f172a', fontSize: 9, fontWeight: '900' }}>3</Text>
                          </View>
                        </View>
                        <Text style={{ color: '#d97706', fontSize: 11, fontWeight: '900', marginTop: 10, textAlign: 'center' }} numberOfLines={1}>{top3[2].username}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, backgroundColor: 'rgba(217,119,6,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                          <GoldenCoin size={10} />
                          <Text style={{ color: '#d97706', fontSize: 10, fontWeight: '900' }}>{(top3[2].displayAmount / 1000000 >= 1 ? `${(top3[2].displayAmount / 1000000).toFixed(1)}M` : top3[2].displayAmount.toLocaleString())}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                    )}
                  </TouchableOpacity>

                </View>
              ) : null}

              {/* Rank 4+ list */}
              {sorted.length === 0 ? (
                <View style={{ paddingVertical: 80, alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: '700' }}>No contributions found</Text>
                </View>
              ) : (
                <View style={{ paddingBottom: 40, paddingHorizontal: 16 }}>
                  {rest.map((s, idx) => (
                    <TouchableOpacity
                      key={s.uid || idx}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
                      onPress={() => openProfile(s, idx + 4)}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '900', width: 32 }}>{idx + 4}</Text>
                      <Image cachePolicy="memory-disk" source={{ uri: s.avatarUrl || 'https://picsum.photos/100' }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: 'white', fontSize: 13, fontWeight: '900' }} numberOfLines={1}>{s.username}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                        <GoldenCoin size={10} />
                        <Text style={{ color: '#fca5a5', fontSize: 12, fontWeight: '900' }}>
                          {s.displayAmount / 1000000 >= 1 ? `${(s.displayAmount / 1000000).toFixed(1)}M` : s.displayAmount.toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Supporter profile popup on tap */}
      <SupporterProfilePopup
        supporter={selectedSupporter}
        rank={selectedRank}
        onClose={() => setSelectedSupporter(null)}
      />
    </>
  );
}
