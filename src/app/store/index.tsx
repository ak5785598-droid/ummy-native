import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, StyleSheet, FlatList, Dimensions, BackHandler, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, ShoppingBag, Check, X, Play, Gift,
  Activity, Palette, MessageSquare, Ticket, ImageIcon, User
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '@/firebase/provider';
import { useUserProfile } from '@/hooks/use-user-profile';
import { collection, query, orderBy, onSnapshot, doc, increment, serverTimestamp, arrayUnion, updateDoc, where, getDocs, limit as firestoreLimit, writeBatch } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';
import { AvatarFrame } from '@/components/profile/AvatarFrame';
import { GoldenCoin } from '@/components/GoldenCoin';

const LOCAL_FRAME_ASSETS: Record<string, any> = {
  'sea_sands': require('../../../assets/images/sea_sands_frame.png'),
  'sea_sands_frame': require('../../../assets/images/sea_sands_frame.png'),
  'basra': require('../../../assets/images/basra_frame.png'),
  'basra_frame': require('../../../assets/images/basra_frame.png'),
  'top3family_topuser': require('../../../assets/images/top3family_topuser.png'),
  'top2family_topuser': require('../../../assets/images/top2family_topuser.png'),
};

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

// ─── Static Wave Items ─────────────────────────────────────────────────────
const STATIC_WAVE_ITEMS = [
  { id: 'w-lovelyshine', name: 'Lovely Shine', type: 'Wave', price: 59999, durationDays: 7, description: 'Magical blue glow with floating hearts.', color: '#60a5fa' },
  { id: 'w-waveflew', name: 'Waveflew', type: 'Wave', price: 10000, durationDays: 7, description: 'Premium 3D Glossy frequency wave.', color: '#e2e8f0' },
  { id: 'w-tonepink', name: 'Tone Pink', type: 'Wave', price: 30000, durationDays: 7, description: '3D Glossy Pink rhythmic frequency.', color: '#f472b6' },
  { id: 'w-vox', name: 'Vox', type: 'Wave', price: 30500, durationDays: 7, description: 'Crystal blue 3D glossy voice wave.', color: '#3b82f6' },
  { id: 'w-reso', name: 'Reso', type: 'Wave', price: 20000, durationDays: 7, description: 'Neon green resonance 3D glossy wave.', color: '#22c55e' },
  { id: 'w-echo', name: 'Echo', type: 'Wave', price: 25999, durationDays: 7, description: 'Vibrant orange echo 3D glossy frequency.', color: '#f97316' },
];

const STATIC_ENTRY_ITEMS: any[] = [];

const STATIC_FRAME_ITEMS = [
  { id: 'f-fire-ring', name: 'Fire Ring Frame', type: 'Frame', price: 500000, durationDays: 30, description: 'Animated fire ring avatar frame with blazing flames.', videoUrl: 'https://firebasestorage.googleapis.com/v0/b/studio-7826224327-e0efc.firebasestorage.app/o/store%2Fframes%2Ffire_ring_optimized.gif?alt=media' },
  { id: 'sea_sands', name: 'Sea Sands Frame', type: 'Frame', price: 300000, durationDays: 30, description: 'Beautiful summer sea beach sand style frame with rising bubbles.', imageUrl: 'sea_sands' },
  { id: 'basra', name: 'Basra Golden Frame', type: 'Frame', price: 320000, durationDays: 30, description: 'Exclusive tea cup and branches gold frame with star glimmers.', imageUrl: 'basra' },
  { id: 'top3family_topuser', name: 'Top 3 Family User Frame', type: 'Frame', price: 0, durationDays: 30, description: 'Exclusive Top 3 Family User Reward Frame.', imageUrl: 'top3family_topuser', notForSale: true },
  { id: 'top2family_topuser', name: 'Top 2 Family User Frame', type: 'Frame', price: 0, durationDays: 30, description: 'Exclusive Top 2 Family User Reward Frame.', imageUrl: 'top2family_topuser', notForSale: true }
];

// ─── Tab definition ─────────────────────────────────────────────────────────
const TABS = ['Store', 'My Items'];

export default function StoreScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile } = useUserProfile(user?.uid);

  const [activeTab, setActiveTab] = useState('Store');
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [roomThemes, setRoomThemes] = useState<any[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeType, setActiveType] = useState('All');
  const [activatingEntry, setActivatingEntry] = useState<string | null>(null);
  const [activatingItem, setActivatingItem] = useState<string | null>(null);
  const [showRecipientSearch, setShowRecipientSearch] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [isSearchingRecipient, setIsSearchingRecipient] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

  // Back handler: preview → category → exit
  useEffect(() => {
    const onBackPress = () => {
      if (previewItem) { setPreviewItem(null); return true; }
      if (activeType !== 'All') { setActiveType('All'); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [previewItem, activeType]);

  // Fetch dynamic store items from Firestore
  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'storeItems'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap: any) => {
      setStoreItems(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      setIsLoadingStore(false);
    }, () => {
      setIsLoadingStore(false);
    });
    return () => unsub();
  }, [firestore]);

  // Fetch room themes
  useEffect(() => {
    if (!firestore) return;
    const q = query(collection(firestore, 'roomThemes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap: any) => {
      setRoomThemes(snap.docs.map((d: any) => ({ id: d.id, ...d.data(), type: 'Theme' })));
    }, () => {});
    return () => unsub();
  }, [firestore]);

  // Combine all items
  const allItems = useMemo(() => {
    const dynamic = storeItems.map(item => {
      const rawUrl = item.imageUrl || item.url || null;
      const isVideoUrl = rawUrl && (rawUrl.includes('.mp4') || rawUrl.includes('video'));
      const imageUrl = isVideoUrl ? null : rawUrl;
      const videoUrl = isVideoUrl ? rawUrl : (item.videoUrl || null);
      let entryType = item.entryType || null;
      if (item.category === 'Entry' && !entryType) {
        const name = (item.name || '').toLowerCase();
        if (name.includes('dragon')) entryType = 'dragon';
        else if (name.includes('lion')) entryType = 'lion';
        else entryType = 'line';
      }
      return {
        ...item,
        imageUrl,
        videoUrl,
        entryType,
        type: item.category || item.type,
        description: item.description || `Premium ${item.name} asset.`,
      };
    });
    const themes = roomThemes.filter(t => (t.price || 0) > 0).map(t => ({
      ...t,
      description: t.description || `High-fidelity ${t.name} background.`,
    }));
    return [...dynamic, ...themes, ...STATIC_WAVE_ITEMS, ...STATIC_ENTRY_ITEMS, ...STATIC_FRAME_ITEMS];
  }, [storeItems, roomThemes]);

  const TYPE_FILTERS = useMemo(() => {
    const types = ['All', ...Array.from(new Set(allItems.map(i => i.type).filter(Boolean)))];
    return types;
  }, [allItems]);

  const filteredItems = useMemo(() => {
    if (activeType === 'All') return allItems;
    return allItems.filter(i => i.type === activeType);
  }, [allItems, activeType]);

  // My Items: owned + valid
  const purchasedItems = useMemo(() => {
    const inventory = userProfile?.inventory as any;
    if (!inventory?.ownedItems) return [];
    const ownedIds: string[] = inventory.ownedItems;
    const expiries = inventory.expiries || {};
    const now = new Date();
    const validIds = ownedIds.filter(id => {
      const exp = expiries[id];
      if (!exp) return true;
      const expDate = exp?.toDate ? exp.toDate() : new Date(exp);
      return expDate > now;
    });
    return allItems.filter(i => validIds.includes(i.id));
  }, [userProfile, allItems]);

  const isItemOwned = (itemId: string) => {
    const inventory = userProfile?.inventory as any;
    if (!inventory?.ownedItems?.includes(itemId)) return false;
    const exp = inventory.expiries?.[itemId];
    if (!exp) return true;
    const expDate = exp?.toDate ? exp.toDate() : new Date(exp);
    return expDate > new Date();
  };

  const activeEntryEffect = (userProfile?.inventory as any)?.activeEntryEffect || null;
  const activeFrameId = (userProfile?.inventory as any)?.activeFrame || null;
  const activeWaveId = (userProfile?.inventory as any)?.activeWave || null;
  const activeBubbleId = (userProfile?.inventory as any)?.activeBubble || null;

  const getPrice = (basePrice: number, duration: number) =>
    duration === 7 ? basePrice : Math.floor((basePrice / 7) * 3);

  const handlePurchase = async () => {
    if (!previewItem || !user || !firestore || isProcessing) return;
    const finalPrice = getPrice(previewItem.price, selectedDuration);
    const coins = userProfile?.wallet?.coins || 0;
    if (coins < finalPrice) {
      Alert.alert('Insufficient Coins', `You need ${finalPrice.toLocaleString()} coins but have ${coins.toLocaleString()}.`);
      return;
    }
    setIsProcessing(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + selectedDuration);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const userRef = doc(firestore, 'users', user.uid);
      const updateData: any = {
        'wallet.coins': increment(-finalPrice),
        'inventory.ownedItems': arrayUnion(previewItem.id),
        [`inventory.expiries.${previewItem.id}`]: expiryDate.toISOString(),
        updatedAt: serverTimestamp(),
      };
      if (previewItem.type === 'Entry') {
        let entryType = previewItem.entryType;
        if (!entryType) {
          const name = (previewItem.name || '').toLowerCase();
          if (name.includes('dragon')) entryType = 'dragon';
          else if (name.includes('lion')) entryType = 'lion';
          else entryType = 'line';
        }
        const entryVideo = previewItem.videoUrl || previewItem.imageUrl || null;
        updateData['inventory.entryTypes'] = arrayUnion(entryType);
        updateData['inventory.activeEntryEffect'] = entryType;
        updateData['inventory.activeEntryVideoUrl'] = entryVideo;
      }
      const batch = writeBatch(firestore);
      batch.set(profileRef, updateData, { merge: true });
      batch.set(userRef, { 'wallet.coins': increment(-finalPrice), updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit();
      Alert.alert('✅ Purchase Successful!', `${previewItem.name} added to your inventory.`);
      setPreviewItem(null);
    } catch (err: any) {
      Alert.alert('Purchase Failed', err.message || 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  };

  const searchRecipients = async (q: string) => {
    if (!firestore || q.length < 2) { setRecipientResults([]); return; }
    setIsSearchingRecipient(true);
    try {
      const snap = await getDocs(query(
        collection(firestore, 'users'),
        where('username', '>=', q.toLowerCase()),
        where('username', '<=', q.toLowerCase() + '\uf8ff'),
        firestoreLimit(10)
      ));
      setRecipientResults(snap.docs
        .map((d: any) => ({ uid: d.id, ...d.data() }))
        .filter((u: any) => u.uid !== user?.uid)
      );
    } catch {}
    setIsSearchingRecipient(false);
  };

  const handleSendAsGift = async () => {
    if (!previewItem || !user || !firestore || !selectedRecipient || isProcessing) return;
    const finalPrice = getPrice(previewItem.price, selectedDuration);
    const coins = userProfile?.wallet?.coins || 0;
    if (coins < finalPrice) {
      Alert.alert('Insufficient Coins', `You need ${finalPrice.toLocaleString()} coins but have ${coins.toLocaleString()}.`);
      return;
    }
    setIsProcessing(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + selectedDuration);
      const senderProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const senderUserRef = doc(firestore, 'users', user.uid);
      const recipientProfileRef = doc(firestore, 'users', selectedRecipient.uid, 'profile', selectedRecipient.uid);
      const deductData = {
        'wallet.coins': increment(-finalPrice),
        updatedAt: serverTimestamp(),
      };
      const batch = writeBatch(firestore);
      batch.set(senderProfileRef, deductData, { merge: true });
      batch.set(senderUserRef, deductData, { merge: true });
      batch.set(recipientProfileRef, {
        'inventory.ownedItems': arrayUnion(previewItem.id),
        [`inventory.expiries.${previewItem.id}`]: expiryDate.toISOString(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await batch.commit();
      Alert.alert('✅ Gift Sent!', `${previewItem.name} sent to ${selectedRecipient.username || 'user'}.`);
      setSelectedRecipient(null);
      setShowRecipientSearch(false);
      setPreviewItem(null);
    } catch (err: any) {
      Alert.alert('Send Failed', err.message || 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseEntryEffect = async (item: any) => {
    if (!user || !firestore || activatingEntry) return;
    setActivatingEntry(item.id);
    try {
      let entryType = item.entryType;
      if (!entryType) {
        const name = (item.name || '').toLowerCase();
        if (name.includes('dragon')) entryType = 'dragon';
        else if (name.includes('lion')) entryType = 'lion';
        else entryType = 'line';
      }
      const videoUrl = item.videoUrl || item.imageUrl || null;
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      await updateDoc(profileRef, {
        'inventory.activeEntryEffect': entryType,
        'inventory.activeEntryVideoUrl': videoUrl,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('✅ Activated!', `${item.name} is now your active entry effect.`);
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not activate entry effect.');
    } finally {
      setActivatingEntry(null);
    }
  };

  const handleUseItem = async (item: any) => {
    if (!user || !firestore || activatingItem) return;
    setActivatingItem(item.id);
    try {
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const userRef = doc(firestore, 'users', user.uid);
      const itemUrl = item.videoUrl || item.imageUrl || null;
      let field: string;
      if (item.type === 'Frame') { field = 'inventory.activeFrame'; }
      else if (item.type === 'Wave') { field = 'inventory.activeWave'; }
      else if (item.type === 'Bubble') { field = 'inventory.activeBubble'; }
      else { setActivatingItem(null); return; }
      const urlField = field + 'MediaUrl';
      const updateData: any = { [field]: item.id, updatedAt: serverTimestamp() };
      if (itemUrl) updateData[urlField] = itemUrl;
      await updateDoc(profileRef, updateData);
      await updateDoc(userRef, updateData);
      Alert.alert('✅ Activated!', `${item.name} is now your active ${item.type.toLowerCase()}.`);
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not activate item.');
    } finally {
      setActivatingItem(null);
    }
  };

  const handleRemoveItem = async (item: any) => {
    if (!user || !firestore) return;
    Alert.alert('Remove Item', `Remove ${item.name} from active?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
            const userRef = doc(firestore, 'users', user.uid);
            let field: string;
            if (item.type === 'Frame') field = 'inventory.activeFrame';
            else if (item.type === 'Wave') field = 'inventory.activeWave';
            else if (item.type === 'Bubble') field = 'inventory.activeBubble';
            else if (item.type === 'Entry') field = 'inventory.activeEntryEffect';
            else return;
            const urlField = field + 'MediaUrl';
            const updateData: any = { [field]: null, updatedAt: serverTimestamp() };
            if (field !== 'inventory.activeEntryEffect') updateData[urlField] = null;
            if (field === 'inventory.activeEntryEffect') updateData['inventory.activeEntryVideoUrl'] = null;
            await updateDoc(profileRef, updateData);
            await updateDoc(userRef, updateData);
            Alert.alert('✅ Removed', `${item.name} deactivated.`);
          } catch (err: any) {
            Alert.alert('Failed', err.message || 'Could not remove item.');
          }
        }
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const owned = isItemOwned(item.id);
    const rawMediaUrl = item.imageUrl || item.url || item.videoUrl || null;
    const mediaUrl = (typeof rawMediaUrl === 'string' && rawMediaUrl.startsWith('http')) ? rawMediaUrl : null;
    const isVideo = mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('.webm') || mediaUrl.includes('video'));
    const isEntryItem = item.type === 'Entry';
    let itemEntryType = item.entryType;
    if (isEntryItem && !itemEntryType) {
      const name = (item.name || '').toLowerCase();
      if (name.includes('dragon')) itemEntryType = 'dragon';
      else if (name.includes('lion')) itemEntryType = 'lion';
      else itemEntryType = 'line';
    }
    const isActiveEntry = isEntryItem && owned && activeEntryEffect === itemEntryType;
    const isFrameItem = item.type === 'Frame';
    const isActiveFrame = isFrameItem && owned && activeFrameId === item.id;
    const isActiveWave = item.type === 'Wave' && owned && activeWaveId === item.id;
    const isActiveBubble = item.type === 'Bubble' && owned && activeBubbleId === item.id;
    const isAnyActive = isActiveEntry || isActiveFrame || isActiveWave || isActiveBubble;
    const isUsableItem = isEntryItem || isFrameItem || item.type === 'Wave' || item.type === 'Bubble';

    const localAsset = LOCAL_FRAME_ASSETS[item.id];

    return (
      <TouchableOpacity
        style={[styles.itemCard, owned && styles.itemCardOwned, isAnyActive && { borderColor: '#fbbf24', borderWidth: 2 }]}
        onPress={() => { setPreviewItem(item); setSelectedDuration(7); }}
        activeOpacity={0.8}
      >
        {/* Media Preview */}
        <View style={styles.itemMedia}>
          {isFrameItem ? (
            <AvatarFrame
              size={54}
              frameMediaUrl={localAsset ? item.id : mediaUrl}
            >
              <View style={{ width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} color="rgba(255,255,255,0.25)" />
              </View>
            </AvatarFrame>
          ) : localAsset ? (
            <Image source={localAsset} style={styles.mediaFill} contentFit="contain" />
          ) : mediaUrl ? (
            <Image cachePolicy="memory-disk" source={{ uri: mediaUrl }} style={styles.mediaFill} contentFit="contain" />
          ) : (
            <View style={styles.mediaPlaceholder}>
              {item.type === 'Wave' ? <Activity size={28} color={item.color || '#94a3b8'} /> :
               item.type === 'Frame' ? <ImageIcon size={28} color="#94a3b8" /> :
               item.type === 'Theme' ? <Palette size={28} color="#94a3b8" /> :
               item.type === 'Bubble' ? <MessageSquare size={28} color="#94a3b8" /> :
               item.type === 'Entry' ? <Play size={28} color={item.color || '#fbbf24'} /> :
               <ShoppingBag size={28} color="#94a3b8" />}
            </View>
          )}
          {(isActiveEntry || isActiveFrame) && (
            <View style={[styles.ownedBadge, { backgroundColor: '#fbbf24' }]}>
              <Play size={10} color="#000" fill="#000" />
            </View>
          )}
          {owned && !isActiveEntry && !isActiveFrame && (
            <View style={styles.ownedBadge}>
              <Check size={10} color="#fff" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemType}>{item.type}</Text>
          {owned && isUsableItem ? (
            isAnyActive ? (
              <TouchableOpacity
                onPress={() => handleRemoveItem(item)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#fbbf24' }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24' }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#fbbf24' }}>ACTIVE</Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: '#ef4444', marginLeft: 2 }}>REMOVE</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => isEntryItem ? handleUseEntryEffect(item) : handleUseItem(item)}
                disabled={activatingEntry === item.id || activatingItem === item.id}
                style={{ backgroundColor: '#fbbf24', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#000' }}>
                  {(activatingEntry === item.id || activatingItem === item.id) ? '...' : 'USE'}
                </Text>
              </TouchableOpacity>
            )
          ) : item.notForSale ? (
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>Not for Sale</Text>
          ) : (
            <View style={styles.priceRow}>
              <GoldenCoin size={20} />
              <Text style={styles.priceText}>{item.price?.toLocaleString()}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Store</Text>
          <View style={[styles.coinBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <GoldenCoin size={24} />
            <Text style={styles.coinBadgeText}>{(userProfile?.wallet?.coins || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Store' ? (
          <>
            {/* Type Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              {TYPE_FILTERS.map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setActiveType(type)}
                  style={[styles.filterChip, activeType === type && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, activeType === type && styles.filterChipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isLoadingStore ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#7c3aed" size="large" />
              </View>
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={item => item.id}
                numColumns={2}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
                columnWrapperStyle={{ gap: 12 }}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                showsVerticalScrollIndicator={false}
                initialNumToRender={6}
                maxToRenderPerBatch={4}
                windowSize={3}
                removeClippedSubviews
                bounces={false}
              />
            )}
          </>
        ) : (
          /* My Items tab */
          purchasedItems.length === 0 ? (
            <View style={styles.centerBox}>
              <ShoppingBag size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Items Yet</Text>
              <Text style={styles.emptyDesc}>Purchase items from the Store to see them here.</Text>
            </View>
          ) : (
            <FlatList
              data={purchasedItems}
              keyExtractor={item => item.id}
              numColumns={2}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
              columnWrapperStyle={{ gap: 12 }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              showsVerticalScrollIndicator={false}
              windowSize={5}
              maxToRenderPerBatch={10}
              removeClippedSubviews
            />
          )
        )}
      </SafeAreaView>

      {/* Item Preview Modal */}
      <Modal visible={!!previewItem} transparent animationType="slide" onRequestClose={() => setPreviewItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {previewItem && (
              <>
                {/* Close */}
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewItem(null)}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>

                {/* Preview Media */}
                <View style={[styles.modalMedia, { alignItems: 'center', justifyContent: 'center' }]}>
                  {previewItem.type === 'Frame' ? (
                    <AvatarFrame
                      size={120}
                      frameMediaUrl={LOCAL_FRAME_ASSETS[previewItem.id] ? previewItem.id : (((typeof previewItem.videoUrl === 'string' && previewItem.videoUrl.startsWith('http')) ? previewItem.videoUrl : null) || ((typeof previewItem.imageUrl === 'string' && previewItem.imageUrl.startsWith('http')) ? previewItem.imageUrl : null))}
                    >
                      {userProfile?.avatarUrl && typeof userProfile.avatarUrl === 'string' && userProfile.avatarUrl.startsWith('http') ? (
                        <Image cachePolicy="memory-disk" source={{ uri: userProfile.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
                            {userProfile?.username ? userProfile.username[0].toUpperCase() : 'U'}
                          </Text>
                        </View>
                      )}
                    </AvatarFrame>
                  ) : (
                    (() => {
                      const rawUrl = previewItem.videoUrl || previewItem.imageUrl;
                      const validUrl = typeof rawUrl === 'string' && rawUrl.startsWith('http') ? rawUrl : null;
                      if (validUrl) return (
                        <Image cachePolicy="memory-disk" source={{ uri: validUrl }} style={styles.modalMediaFill} contentFit="contain" />
                      );
                      return (
                        <View style={styles.modalMediaPlaceholder}>
                          <ShoppingBag size={48} color="#cbd5e1" />
                        </View>
                      );
                    })()
                  )}
                </View>

                <Text style={styles.modalItemName}>{previewItem.name}</Text>
                <Text style={styles.modalItemType}>{previewItem.type}</Text>
                <Text style={styles.modalItemDesc}>{previewItem.description}</Text>

                {/* Duration selector */}
                <View style={styles.durationRow}>
                  {[7, 3].map(d => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setSelectedDuration(d)}
                      style={[styles.durationChip, selectedDuration === d && styles.durationChipActive]}
                    >
                      <Text style={[styles.durationText, selectedDuration === d && styles.durationTextActive]}>{d} Days</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <GoldenCoin size={18} />
                        <Text style={[styles.durationPrice, { marginTop: 0 }, selectedDuration === d && styles.durationTextActive]}>
                          {getPrice(previewItem.price, d).toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {isItemOwned(previewItem.id) ? (
                  <View style={styles.ownedBox}>
                    <Check size={16} color="#10b981" />
                    <Text style={styles.ownedText}>Already Owned & Active</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.buyBtn, { flex: 1 }, isProcessing && { opacity: 0.6 }]}
                      onPress={handlePurchase}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Text style={styles.buyBtnText}>Buy</Text>
                          <GoldenCoin size={24} />
                          <Text style={styles.buyBtnText}>{getPrice(previewItem.price, selectedDuration).toLocaleString()}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sendBtn, { flex: 1 }, isProcessing && { opacity: 0.6 }]}
                      onPress={() => setShowRecipientSearch(true)}
                      disabled={isProcessing}
                    >
                      <Text style={styles.sendBtnText}>Send as Gift</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Recipient Search Modal */}
      <Modal visible={showRecipientSearch} transparent animationType="slide" onRequestClose={() => { setShowRecipientSearch(false); setSelectedRecipient(null); setRecipientQuery(''); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '70%' }]}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setShowRecipientSearch(false); setSelectedRecipient(null); setRecipientQuery(''); }}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
            <Text style={[styles.modalItemName, { marginBottom: 12 }]}>Send as Gift</Text>
            <Text style={[styles.modalItemDesc, { marginBottom: 12 }]}>Search username to send this frame</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 14, height: 44, justifyContent: 'center' }}>
                <TextInput
                  placeholder="Search username..."
                  placeholderTextColor="#94a3b8"
                  value={recipientQuery}
                  onChangeText={(t) => { setRecipientQuery(t); searchRecipients(t); }}
                  style={{ fontSize: 14, color: '#0f172a', padding: 0 }}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {isSearchingRecipient && <ActivityIndicator size="small" color="#7c3aed" style={{ marginVertical: 12 }} />}

            <FlatList
              data={recipientResults}
              keyExtractor={(item: any) => item.uid}
              style={{ maxHeight: 280 }}
              ListEmptyComponent={!isSearchingRecipient && recipientQuery.length >= 2 ? (
                <Text style={{ textAlign: 'center', color: '#94a3b8', paddingVertical: 20, fontSize: 13 }}>No users found</Text>
              ) : null}
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: selectedRecipient?.uid === item.uid ? '#f0fdf4' : '#f8fafc', marginBottom: 6, borderWidth: 1.5, borderColor: selectedRecipient?.uid === item.uid ? '#10b981' : 'transparent' }}
                  onPress={() => setSelectedRecipient(item)}
                >
                  {item.avatarUrl && typeof item.avatarUrl === 'string' && item.avatarUrl.startsWith('http') ? (
                    <Image source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} cachePolicy="memory-disk" contentFit="cover" />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#64748b' }}>{(item.username || '?')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{item.username || 'Unknown'}</Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>ID: {item.id || item.uid}</Text>
                  </View>
                  {selectedRecipient?.uid === item.uid && <Check size={18} color="#10b981" />}
                </TouchableOpacity>
              )}
            />

            {selectedRecipient && (
              <TouchableOpacity
                style={[styles.sendBtn, { marginTop: 12 }, isProcessing && { opacity: 0.6 }]}
                onPress={handleSendAsGift}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Text style={styles.sendBtnText}>Send to {selectedRecipient.username}</Text>
                    <GoldenCoin size={24} />
                    <Text style={styles.sendBtnText}>{getPrice(previewItem?.price || 0, selectedDuration).toLocaleString()}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  coinBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#fde68a' },
  coinBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#7c3aed', fontWeight: '700' },
  filterScroll: { flexGrow: 0, flexShrink: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#fff' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  itemCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  itemCardOwned: { borderColor: '#a78bfa' },
  itemMedia: { width: '100%', height: 120, backgroundColor: 'transparent', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  mediaFill: { width: '100%', height: '100%' },
  mediaPlaceholder: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  ownedBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#10b981', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { padding: 10 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  itemType: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coinEmoji: { fontSize: 12 },
  priceText: { fontSize: 13, fontWeight: '700', color: '#d97706' },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a', marginTop: 16, textTransform: 'uppercase' },
  emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalCloseBtn: { position: 'absolute', top: 16, right: 16, padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 },
  modalMedia: { width: '100%', height: 220, backgroundColor: 'transparent', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  modalMediaFill: { width: '100%', height: '100%' },
  modalMediaPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalItemName: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  modalItemType: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginVertical: 4 },
  modalItemDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 16 },
  durationRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  durationChip: { flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, alignItems: 'center' },
  durationChipActive: { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' },
  durationText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  durationTextActive: { color: '#7c3aed' },
  durationPrice: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  ownedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 14, paddingVertical: 14 },
  ownedText: { fontSize: 14, fontWeight: '700', color: '#059669' },
  buyBtn: { backgroundColor: '#7c3aed', borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#7c3aed', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  buyBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
  sendBtn: { backgroundColor: '#059669', borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: '#059669', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  sendBtnText: { fontSize: 15, fontWeight: '900', color: '#fff' },
});
