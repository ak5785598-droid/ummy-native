import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Plus, 
  Heart, 
  HelpCircle, 
  X, 
  Lock, 
  Wrench, 
  RotateCw, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  ChevronRight,
  Save,
  Search,
  Sparkles,
  Star,
  Unlink
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore, useCollection } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { toCDN } from '@/lib/cdn';
import { doc, onSnapshot, updateDoc, setDoc, serverTimestamp, collection, query, where, limit, getDocs, deleteDoc } from '@/firebase/firestore-compat';
import { FURNITURE_CATALOG, FurnitureItem } from '../../constants/cp-furniture-catalog';
import { Image } from 'expo-image';
import { CpHouseBackground } from '../../components/cp-house/CpHouseBackground';

const { width, height } = Dimensions.get('window');
const CELL_SIZE = 28;

interface PlacedItem {
  id: string;
  catalogId: string;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
}

export default function CpHouseScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile } = useUserProfile(user?.uid);
  
  const [activeMainTab, setActiveMainTab] = useState<'cp' | 'friend'>('cp');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [showPropose, setShowPropose] = useState(false);
  const [selectedProposeType, setSelectedProposeType] = useState<'CP' | 'BFF' | 'Love'>('Love');
  const [isSendingProposal, setIsSendingProposal] = useState(false);

  // Mansion Editor states
  const [isEditMode, setIsEditMode] = useState(false);
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [savingMansion, setSavingMansion] = useState(false);

  const [config, setConfig] = useState<any>({
    cpBgUrl: '',
    cpBgType: 'solid',
    friendBgUrl: '',
    friendBgType: 'solid'
  });

  // Listen to global configurations
  useEffect(() => {
    if (!firestore) return;
    const docRef = doc(firestore, 'settings', 'global'); // Web maps appConfig/global, check settings/global or fallback
    const unsubscribe = onSnapshot(docRef, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig({
          cpBgUrl: data.cpBgUrl || '',
          cpBgType: data.cpBgType || 'solid',
          friendBgUrl: data.friendBgUrl || '',
          friendBgType: data.friendBgType || 'solid'
        });
      }
    }, () => {});
    return () => unsubscribe();
  }, [firestore]);

  // Sync CP relationship data
  const cpQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'cpPairs'), where('participantIds', 'array-contains', user.uid), limit(1));
  }, [firestore, user?.uid]);

  const { data: cpData } = useCollection(cpQuery);
  const activeCp = cpData?.[0];
  const partnerUid = activeCp?.participantIds?.find((id: string) => id !== user?.uid);
  const { profile: partnerProfile } = useUserProfile(partnerUid);

  useEffect(() => {
    if (activeCp?.mansionLayout) {
      setPlacedItems(activeCp.mansionLayout);
    } else {
      setPlacedItems([]);
    }
  }, [activeCp]);

  const backgroundImageUrl = useMemo(() => {
    if (activeMainTab === 'cp' && config?.cpBgType === 'image' && config?.cpBgUrl) {
      return config.cpBgUrl;
    }
    if (activeMainTab === 'friend' && config?.friendBgType === 'image' && config?.friendBgUrl) {
      return config.friendBgUrl;
    }
    return null;
  }, [activeMainTab, config]);

  // Handle user search by account number or nickname
  const handleSearchUsers = async () => {
    if (!searchQuery.trim() || !firestore) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      // search by accountNumber
      const q1 = query(collection(firestore, 'users'), where('accountNumber', '==', searchQuery.trim()), limit(5));
      const snap1 = await getDocs(q1);
      const results: any[] = [];
      snap1.forEach((d: any) => {
        if (d.id !== user?.uid) results.push({ uid: d.id, ...d.data() });
      });
      setSearchResults(results);
    } catch (error) {
      console.warn("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleProposeTarget = (target: any) => {
    setSelectedTarget(target);
    setShowSearch(false);
    setShowPropose(true);
  };

  const handleSendProposal = async () => {
    if (!user?.uid || !selectedTarget || !firestore) return;
    setIsSendingProposal(true);
    try {
      const proposalId = `${user.uid}_to_${selectedTarget.uid}`;
      const proposalRef = doc(firestore, 'proposals', proposalId);
      await setDoc(proposalRef, {
        fromUid: user.uid,
        toUid: selectedTarget.uid,
        fromUsername: userProfile?.username || 'Gamer',
        fromAvatarUrl: userProfile?.avatarUrl || '',
        toUsername: selectedTarget.username || 'Gamer',
        toAvatar: selectedTarget.avatarUrl || '',
        type: selectedProposeType,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      Alert.alert('Proposal Sent!', `Awaiting response from ${selectedTarget.username}.`);
      setShowPropose(false);
      setSelectedTarget(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send proposal.');
    } finally {
      setIsSendingProposal(false);
    }
  };

  // --- MANSION EDITOR CONTROLS ---
  const handlePlaceItem = (catalogId: string) => {
    const catalogItem = FURNITURE_CATALOG.find(item => item.id === catalogId);
    if (!catalogItem) return;

    const cpLevel = activeCp?.level || 1;
    if (cpLevel < catalogItem.unlockLevel) {
      Alert.alert('Item Locked', `Unlock this item by reaching CP Level ${catalogItem.unlockLevel}!`);
      return;
    }

    if (catalogItem.price > 0 && (userProfile?.wallet?.coins || 0) < catalogItem.price) {
      Alert.alert('Insufficient Coins', `You need ${catalogItem.price} coins to purchase this item.`);
      return;
    }

    const newItem: PlacedItem = {
      id: `${catalogId}_${Date.now()}`,
      catalogId,
      x: 2,
      y: 2,
      rotation: 0
    };

    setPlacedItems(prev => [...prev, newItem]);
    setSelectedItemIdx(placedItems.length);
    setIsCatalogOpen(false);
  };

  const handleMoveItem = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (selectedItemIdx === null) return;
    setPlacedItems(prev => prev.map((item, idx) => {
      if (idx !== selectedItemIdx) return item;
      let { x, y } = item;
      if (direction === 'up' && x > 0) x -= 1;
      if (direction === 'down' && x < 4) x += 1;
      if (direction === 'left' && y > 0) y -= 1;
      if (direction === 'right' && y < 4) y += 1;
      return { ...item, x, y };
    }));
  };

  const handleRotateItem = () => {
    if (selectedItemIdx === null) return;
    setPlacedItems(prev => prev.map((item, idx) => {
      if (idx !== selectedItemIdx) return item;
      const nextRotation = ((item.rotation + 90) % 360) as PlacedItem['rotation'];
      return { ...item, rotation: nextRotation };
    }));
  };

  const handleRemoveItem = () => {
    if (selectedItemIdx === null) return;
    setPlacedItems(prev => prev.filter((_, idx) => idx !== selectedItemIdx));
    setSelectedItemIdx(null);
  };

  const handleSaveMansion = async () => {
    if (!firestore || !activeCp?.id) return;
    setSavingMansion(true);
    try {
      const cpRef = doc(firestore, 'cpPairs', activeCp.id);
      await updateDoc(cpRef, {
        mansionLayout: placedItems,
        updatedAt: serverTimestamp()
      });
      setIsEditMode(false);
      setSelectedItemIdx(null);
      Alert.alert('Mansion Saved!', 'Your couple sanctuary has been updated.');
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not save layout.');
    } finally {
      setSavingMansion(false);
    }
  };

  const [isBreakingCp, setIsBreakingCp] = useState(false);
  const handleBreakCp = async () => {
    if (!firestore || !user?.uid || !activeCp?.participantIds) return;
    const partnerUid = activeCp.participantIds.find((id: string) => id !== user.uid);
    const partnerName = partnerProfile?.username || 'partner';
    const cpType = activeCp.type || 'CP';

    Alert.alert(
      'Break Relationship',
      `Are you sure you want to end your ${cpType} with ${partnerName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Break',
          style: 'destructive',
          onPress: async () => {
            setIsBreakingCp(true);
            try {
              await updateDoc(doc(firestore, 'users', user.uid, 'profile', user.uid), {
                relationship: { type: 'None', partnerUid: '', partnerName: '', partnerAvatar: '', level: 0, startDate: '' }
              });
              if (partnerUid) {
                await updateDoc(doc(firestore, 'users', partnerUid, 'profile', partnerUid), {
                  relationship: { type: 'None', partnerUid: '', partnerName: '', partnerAvatar: '', level: 0, startDate: '' }
                });
              }
              try { await deleteDoc(doc(firestore, 'cpPairs', activeCp.id)); } catch {}
              Alert.alert('Done', `Your ${cpType} with ${partnerName} has ended.`);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to break relationship.');
            } finally {
              setIsBreakingCp(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: activeMainTab === 'cp' ? '#0a0018' : '#000d1a' }}>
      {/* Premium animated couple background */}
      <CpHouseBackground mode={activeMainTab === 'cp' ? 'cp' : 'friend'} />

      {/* Remote image overlay (if admin has set one) */}
      {backgroundImageUrl ? (
        <Image
          cachePolicy="memory-disk"
          source={{ uri: toCDN(backgroundImageUrl) }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.35 }]}
          contentFit="cover"
        />
      ) : null}


      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header Overlay */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 bg-black/20 rounded-full">
            <ChevronLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View className="flex-row gap-6">
            <TouchableOpacity onPress={() => setActiveMainTab('cp')}>
              <Text className={`text-base font-black ${activeMainTab === 'cp' ? 'text-white border-b-2 border-white' : 'text-white/60'}`}>CP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveMainTab('friend')}>
              <Text className={`text-base font-black ${activeMainTab === 'friend' ? 'text-white border-b-2 border-white' : 'text-white/60'}`}>Friend</Text>
            </TouchableOpacity>
          </View>
          <View className="w-10" />
        </View>

        {/* Couple Sanctuary — centre lobby card */}
        <View className="flex-1 justify-center items-center px-6">

          {/* Glassmorphic couple card */}
          <View style={{
            width: '100%',
            borderRadius: 28,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: activeMainTab === 'cp' ? 'rgba(244,63,94,0.3)' : 'rgba(14,165,233,0.3)',
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}>
            {/* Card header */}
            <View style={{ padding: 16, paddingBottom: 8, alignItems: 'center' }}>
              <Text style={{ color: activeMainTab === 'cp' ? '#f43f5e' : '#0ea5e9', fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
                {activeMainTab === 'cp' ? '💖 Couple Sanctuary' : '🤝 Friend Space'}
              </Text>
            </View>

            {/* Avatar pair */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingHorizontal: 24, paddingBottom: 16 }}>
              {/* Me */}
              <View style={{ alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 72, height: 72, borderRadius: 36, padding: 2.5,
                  backgroundColor: activeMainTab === 'cp' ? 'rgba(244,63,94,0.4)' : 'rgba(14,165,233,0.4)',
                  shadowColor: activeMainTab === 'cp' ? '#f43f5e' : '#0ea5e9',
                  shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.65, shadowRadius: 14, elevation: 8,
                }}>
                  <View style={{ width: '100%', height: '100%', borderRadius: 33, overflow: 'hidden', backgroundColor: '#0a0018' }}>
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(userProfile?.avatarUrl) || 'https://via.placeholder.com/150' }} style={{ width: '100%', height: '100%' }} />
                  </View>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 }}>
                  {userProfile?.username?.split(' ')[0] || 'Me'}
                </Text>
              </View>

              {/* Heart connector */}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Heart size={30} color={activeCp ? '#f43f5e' : 'rgba(255,255,255,0.4)'} fill={activeCp ? '#f43f5e' : 'transparent'} />
                {activeCp && (
                  <Text style={{ color: '#fbbf24', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>
                    Lv.{activeCp?.level || 1}
                  </Text>
                )}
              </View>

              {/* Partner */}
              {partnerProfile ? (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <View style={{
                    width: 72, height: 72, borderRadius: 36, padding: 2.5,
                    backgroundColor: activeMainTab === 'cp' ? 'rgba(139,92,246,0.4)' : 'rgba(34,211,238,0.4)',
                    shadowColor: activeMainTab === 'cp' ? '#8b5cf6' : '#22d3ee',
                    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.65, shadowRadius: 14, elevation: 8,
                  }}>
                    <View style={{ width: '100%', height: '100%', borderRadius: 33, overflow: 'hidden', backgroundColor: '#0a0018' }}>
                      <Image cachePolicy="memory-disk" source={{ uri: toCDN(partnerProfile.avatarUrl) || 'https://via.placeholder.com/150' }} style={{ width: '100%', height: '100%' }} />
                    </View>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 }}>
                    {partnerProfile?.username?.split(' ')[0] || 'Partner'}
                  </Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setShowSearch(true)}
                    style={{
                      width: 72, height: 72, borderRadius: 36,
                      borderWidth: 2, borderStyle: 'dashed',
                      borderColor: activeMainTab === 'cp' ? 'rgba(244,63,94,0.5)' : 'rgba(14,165,233,0.5)',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Plus size={26} color={activeMainTab === 'cp' ? '#f43f5e' : '#0ea5e9'} />
                  </TouchableOpacity>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>Partner</Text>
                </View>
              )}
            </View>

            {/* CP stats strip */}
            {activeCp && (
              <View style={{
                flexDirection: 'row',
                borderTopWidth: 1,
                borderTopColor: activeMainTab === 'cp' ? 'rgba(244,63,94,0.2)' : 'rgba(14,165,233,0.2)',
              }}>
                {[
                  { label: 'Score', value: activeCp?.cpValue?.toLocaleString() || '0' },
                  { label: 'Level', value: `Lv.${activeCp?.level || 1}` },
                  { label: 'Days', value: `${activeCp?.createdAt ? Math.floor((Date.now() - (activeCp.createdAt?.toMillis?.() || Date.now())) / 86400000) : 0}d` },
                ].map((stat, i, arr) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 12,
                      borderRightWidth: i < arr.length - 1 ? 1 : 0,
                      borderRightColor: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>{stat.value}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Break CP Button */}
            {activeCp && (
              <TouchableOpacity onPress={handleBreakCp} disabled={isBreakingCp}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.08)' }}>
                {isBreakingCp ? <ActivityIndicator size={14} color="#EF4444" /> : <Unlink size={14} color="#EF4444" />}
                <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800' }}>{isBreakingCp ? 'Breaking...' : 'Break Relationship'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Isometric mansion layout editor (Only active in edit mode) */}
        {isEditMode && activeCp && (
          <View style={{
            position: 'absolute', bottom: 6, left: 12, right: 12,
            backgroundColor: 'rgba(10,0,30,0.88)', borderRadius: 24,
            padding: 16, borderWidth: 1,
            borderColor: 'rgba(244,63,94,0.25)',
          }}>
            <View style={{ gap: 12 }}>
              {/* Isometric Board grid */}
              <View style={{ width: '100%', height: 176, backgroundColor: '#030008', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={{ transform: [{ rotateX: '60deg' }, { rotate: '-45deg' }], width: 140, height: 140, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(244,63,94,0.05)', position: 'relative' }}
                >
                  {Array.from({ length: 25 }).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                        left: (i % 5) * CELL_SIZE, top: Math.floor(i / 5) * CELL_SIZE,
                        width: CELL_SIZE, height: CELL_SIZE,
                      }}
                    />
                  ))}
                  {placedItems.map((placed, idx) => {
                    const catalogItem = FURNITURE_CATALOG.find(item => item.id === placed.catalogId);
                    if (!catalogItem) return null;
                    const isSelected = selectedItemIdx === idx;
                    return (
                      <TouchableOpacity
                        key={placed.id}
                        onPress={() => setSelectedItemIdx(idx)}
                        style={{
                          position: 'absolute',
                          left: placed.x * CELL_SIZE, top: placed.y * CELL_SIZE,
                          width: catalogItem.gridWidth * CELL_SIZE, height: catalogItem.gridLength * CELL_SIZE,
                          transform: [{ rotate: `${placed.rotation}deg` }],
                          borderWidth: isSelected ? 1 : 0, borderColor: '#22d3ee', borderStyle: 'dashed',
                        }}
                      >
                        {catalogItem.renderSvg(isSelected ? '#22d3ee' : '#ec4899')}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Editor Console */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2 }}>Mansion Editor</Text>
                  <TouchableOpacity
                    onPress={() => setIsCatalogOpen(true)}
                    style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#22d3ee', borderRadius: 20 }}
                  >
                    <Text style={{ color: '#000', fontSize: 9, fontWeight: '900' }}>+ FURNITURE</Text>
                  </TouchableOpacity>
                </View>

                {selectedItemIdx !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity onPress={handleRotateItem} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                        <RotateCw size={14} color="#94a3b8" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleRemoveItem} style={{ padding: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <View style={{ width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 4, alignItems: 'center', justifyContent: 'space-around', gap: 2 }}>
                      <TouchableOpacity onPress={() => handleMoveItem('up')} style={{ padding: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 }}><ChevronUp size={10} color="#94a3b8" /></TouchableOpacity>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity onPress={() => handleMoveItem('left')} style={{ padding: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 }}><ChevronLeft size={10} color="#94a3b8" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleMoveItem('right')} style={{ padding: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 }}><ChevronRight size={10} color="#94a3b8" /></TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => handleMoveItem('down')} style={{ padding: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 }}><ChevronDown size={10} color="#94a3b8" /></TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontStyle: 'italic', textAlign: 'center', paddingVertical: 6 }}>Tap a placed item to adjust it</Text>
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={handleSaveMansion}
                    disabled={savingMansion}
                    style={{ flex: 1, height: 38, backgroundColor: '#10b981', borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Save size={12} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Save Mansion</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setIsEditMode(false); setSelectedItemIdx(null); }}
                    style={{ paddingHorizontal: 16, height: 38, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 10, textTransform: 'uppercase' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Bottom CTA (Design Room trigger) */}
        {!isEditMode && activeCp && (
          <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setIsEditMode(true)}
              style={{
                borderRadius: 30, overflow: 'hidden',
                shadowColor: '#f43f5e', shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.55, shadowRadius: 16, elevation: 10,
              }}
            >
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: 28, paddingVertical: 14,
                backgroundColor: 'rgba(10,0,24,0.7)',
                borderWidth: 1, borderColor: 'rgba(244,63,94,0.5)', borderRadius: 30,
              }}>
                <Wrench size={16} color="#f43f5e" />
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' }}>Design Room</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* User Search Dialog Modal */}
        <Modal visible={showSearch} onRequestClose={() => setShowSearch(false)} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#0b0e1e] border-t border-white/10 rounded-t-3xl p-5 space-y-4 max-h-[80vh]">
              <View className="flex-row justify-between items-center pb-2 border-b border-white/5">
                <Text className="font-black text-sm text-white uppercase">Search Partner</Text>
                <TouchableOpacity onPress={() => setShowSearch(false)} className="p-1">
                  <X size={20} color="#cbd5e1" />
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-2">
                <TextInput
                  placeholder="Enter User ID/AccountNumber"
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 h-11 border border-white/10 rounded-xl px-3 text-white text-sm"
                />
                <TouchableOpacity 
                  onPress={handleSearchUsers}
                  disabled={isSearching}
                  className="w-12 h-11 bg-pink-500 rounded-xl items-center justify-center"
                >
                  <Search size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-3 mt-2">
                {isSearching && <ActivityIndicator size="small" color="#ec4899" className="my-4" />}
                {searchResults.map((target) => (
                  <View key={target.uid} className="flex-row items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 rounded-full overflow-hidden border border-white/10 bg-slate-900">
                        <Image cachePolicy="memory-disk" source={{ uri: toCDN(target.avatarUrl) || 'https://via.placeholder.com/150' }} className="h-full w-full" />
                      </View>
                      <View>
                        <Text className="text-white text-xs font-bold">{target.username}</Text>
                        <Text className="text-[9px] text-slate-400 mt-0.5">ID: {target.accountNumber || '000000'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleProposeTarget(target)}
                      className="bg-pink-500 px-3 py-1.5 rounded-lg"
                    >
                      <Text className="text-white text-[10px] font-bold uppercase">Propose</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Propose CP dialog modal */}
        <Modal visible={showPropose} onRequestClose={() => { setShowPropose(false); setSelectedTarget(null); }} transparent animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/70 px-6">
            <View className="w-full max-w-sm bg-[#160124] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <View className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-rose-500/20 to-transparent" />
              
              <View className="items-center text-center space-y-4 pt-4 mb-6">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 rounded-full overflow-hidden border border-white/20">
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(selectedTarget?.avatarUrl) || 'https://via.placeholder.com/150' }} className="h-full w-full" />
                  </View>
                  <View className="bg-rose-500 p-1.5 rounded-full">
                    <Heart size={16} color="#fff" fill="#fff" />
                  </View>
                  <View className="h-12 w-12 rounded-full border border-dashed border-white/30 items-center justify-center">
                    <Sparkles size={18} color="#ffffff60" />
                  </View>
                </View>
                <View className="items-center mt-2">
                  <Text className="text-white text-base font-black uppercase tracking-tight">Express Feelings</Text>
                  <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">To {selectedTarget?.username}</Text>
                </View>
              </View>

              <View className="space-y-2 mb-6">
                {[
                  { id: 'Love', label: 'True Love', icon: Heart, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' },
                  { id: 'CP', label: 'CP Partner', icon: Sparkles, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' },
                  { id: 'BFF', label: 'Eternal BFF', icon: Star, color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedProposeType === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => setSelectedProposeType(type.id as any)}
                      className={`flex-row items-center gap-3 p-3 rounded-2xl border ${
                        isSelected ? 'bg-white/10 border-white/20' : 'bg-white/5 border-transparent'
                      }`}
                    >
                      <View className="h-8 w-8 rounded-lg items-center justify-center" style={{ backgroundColor: type.bg }}>
                        <Icon size={16} color={type.color} fill={type.id === 'Love' && isSelected ? type.color : 'transparent'} />
                      </View>
                      <View className="flex-1 text-left">
                        <Text className="text-white text-xs font-bold uppercase">{type.label}</Text>
                        <Text className="text-[8px] text-slate-400 uppercase tracking-tighter">Special Badge & Entrance</Text>
                      </View>
                      <View className={`h-4.5 w-4.5 rounded-full border-2 items-center justify-center ${
                        isSelected ? 'bg-rose-500 border-rose-500' : 'border-white/20'
                      }`} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity 
                  onPress={() => { setShowPropose(false); setSelectedTarget(null); }}
                  className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl items-center justify-center"
                >
                  <Text className="text-white text-xs font-bold uppercase">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSendProposal}
                  disabled={isSendingProposal}
                  className="flex-1 h-11 bg-gradient-to-r from-rose-600 to-indigo-600 rounded-xl items-center justify-center"
                >
                  <Text className="text-white text-xs font-bold uppercase">Propose</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Catalog Modal */}
        <Modal visible={isCatalogOpen} onRequestClose={() => setIsCatalogOpen(false)} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-white border-t border-pink-100 rounded-t-3xl p-5 max-h-[70vh]">
              <View className="flex-row justify-between items-center pb-2 border-b border-slate-100 mb-4">
                <Text className="font-black text-sm text-slate-800 uppercase">Furniture Catalog</Text>
                <TouchableOpacity onPress={() => setIsCatalogOpen(false)} className="p-1">
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4" showsVerticalScrollIndicator={false}>
                <View className="flex-row flex-wrap justify-between">
                  {FURNITURE_CATALOG.map((item) => {
                    const cpLevel = activeCp?.level || 1;
                    const isLocked = cpLevel < item.unlockLevel;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handlePlaceItem(item.id)}
                        disabled={isLocked}
                        style={{ width: (width - 48) / 3 }}
                        className={`p-2 border rounded-xl items-center mb-3 relative bg-slate-50 ${
                          isLocked ? 'border-slate-100 opacity-40' : 'border-pink-100'
                        }`}
                      >
                        <View className="h-12 w-12 items-center justify-center mb-1">
                          {item.renderSvg()}
                        </View>
                        <Text className="text-[9px] font-black text-slate-800 truncate text-center w-full" numberOfLines={1}>{item.name}</Text>
                        <Text className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">{item.price > 0 ? `${item.price} Coins` : 'FREE'}</Text>
                        {isLocked && (
                          <View className="absolute inset-0 bg-white/60 items-center justify-center gap-1 rounded-xl">
                            <Lock size={12} color="#fb7185" />
                            <Text className="text-[7px] font-black text-rose-400">LVL {item.unlockLevel}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}
