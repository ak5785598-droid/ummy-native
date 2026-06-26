import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Vibration, Dimensions, Alert } from 'react-native';
import { X, ChevronDown, Zap, Send } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '../../firebase/provider';
import { CosmicExplosion } from './gift-cosmic-explosion';
import { collection, query, orderBy, doc, serverTimestamp, writeBatch, increment, getDoc, setDoc } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';
import { getLevelFromSpent } from '../../hooks/use-user-level';
import { getCpLevelFromValue } from '../../lib/level-utils';
import { Gift, RoomParticipant } from '../../lib/types';
import { Image } from 'expo-image';
import { GoldenCoin } from '../GoldenCoin';

const { width } = Dimensions.get('window');

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

interface GiftPickerProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  participants: RoomParticipant[];
  initialRecipient?: RoomParticipant | null;
  onGiftSent?: () => void;
  onLocalGiftEvent?: (event: any) => void;
}

const CATEGORIES = ['Hot', 'Lucky', 'Luxury', 'Event', 'Customized'];
const QUANTITIES = ['1', '10', '99', '520', '1314'];

export function GiftPicker({ visible, onClose, roomId, participants, initialRecipient, onGiftSent, onLocalGiftEvent }: GiftPickerProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);

  const [activeCategory, setActiveCategory] = useState('Hot');
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('1');
  const [isSending, setIsSending] = useState(false);
  const [showQuantityPopup, setShowQuantityPopup] = useState(false);
  const [comboState, setComboState] = useState<{ active: boolean; multiplier: number; gift: Gift | null } | null>(null);
  const [showCosmic, setShowCosmic] = useState(false);
  const [cosmicGift, setCosmicGift] = useState<{ name: string; image: string | null } | null>(null);
  
  const comboClicksRef = useRef(1);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const giftsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'gifts');
  }, [firestore]);

  const { data: dbGifts } = useCollection<Gift>(giftsQuery);

  const groupedGifts = useMemo(() => {
    if (!dbGifts) return {};
    const groups: Record<string, Gift[]> = { Hot: [], Lucky: [], Luxury: [], Event: [], Customized: [] };
    dbGifts.forEach((g) => {
      const cat = g.category || 'Hot';
      if (groups[cat]) groups[cat].push({ ...g, id: g.id });
      else groups['Event'].push({ ...g, id: g.id });
    });
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0));
    });
    return groups;
  }, [dbGifts]);

  const currentGifts = groupedGifts[activeCategory] || [];

  const seatedParticipants = useMemo(() => {
    const seated = participants.filter(p => p.seatIndex > 0).sort((a, b) => a.seatIndex - b.seatIndex);
    const audience = participants.filter(p => !p.seatIndex || p.seatIndex === 0);
    const all = [...seated, ...audience];
    if (initialRecipient && !all.find(p => p.uid === initialRecipient.uid)) {
      all.push(initialRecipient);
    }
    return all;
  }, [participants, initialRecipient]);

  const hasInitialized = React.useRef(false);
  const lastRecipientUid = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!visible) {
      hasInitialized.current = false;
      lastRecipientUid.current = null;
      return;
    }
    if (initialRecipient) {
      if (lastRecipientUid.current !== initialRecipient.uid) {
        setSelectedUids([initialRecipient.uid]);
        lastRecipientUid.current = initialRecipient.uid;
        hasInitialized.current = true;
      }
    } else if (!hasInitialized.current && seatedParticipants.length > 0) {
      setSelectedUids([seatedParticipants[0].uid]);
      hasInitialized.current = true;
    }
  }, [visible, initialRecipient?.uid, seatedParticipants]);

  const toggleRecipient = (uid: string) => {
    setSelectedUids([uid]);
  };

  const selectAll = () => {
    setSelectedUids(seatedParticipants.map(p => p.uid));
  };

  // ============ SMART REWARD LOGIC HELPER ============
  const shouldGiveReward = (comboClickCount: number, giftPrice: number): boolean => {
    if (comboClickCount === 1) return Math.random() < 0.30;
    if (comboClickCount === 2) return Math.random() < 0.25;
    if (comboClickCount === 3 || comboClickCount === 4) return false;
    if (comboClickCount >= 5 && comboClickCount <= 10) return Math.random() < 0.80;
    if (comboClickCount > 10) return Math.random() < 0.90;
    if (giftPrice > 5000) {
      if (comboClickCount >= 3 && comboClickCount <= 6) return Math.random() < 0.70;
    }
    return Math.random() < 0.10;
  };

  const executeSend = async (gift: Gift, qty: number, uids: string[], comboMultiplier: number) => {
    console.log('[GiftPicker] executeSend called:', { giftName: gift.name, qty, uids, comboMultiplier });
    if (!firestore || !user?.uid || !userProfile) {
      console.log('[GiftPicker] executeSend aborted: missing firestore/user/userProfile');
      return null;
    }

    const validUids = (uids || []).filter(uid => typeof uid === 'string' && uid.trim() !== '');
    console.log('[GiftPicker] validUids:', validUids, 'total input:', uids?.length);
    if (validUids.length === 0) {
      console.log('[GiftPicker] executeSend aborted: no valid UIDs');
      return null;
    }

    const totalCost = gift.price * qty * validUids.length;
    const userCoins = userProfile.wallet?.coins || 0;
    
    console.log('[GiftPicker] cost check:', { totalCost, userCoins, price: gift.price, qty, recipients: validUids.length });
    if (userCoins < totalCost) {
      console.log('[GiftPicker] executeSend aborted: insufficient coins');
      return null;
    }

    let winAmount = 0;
    let selectedMult = comboMultiplier;
    const isLuckyGift = gift.category === 'Lucky';

    if (isLuckyGift) {
      const shouldReward = shouldGiveReward(comboMultiplier, gift.price);
      if (shouldReward) {
        if (comboMultiplier <= 1) {
          const rand = Math.random();
          if (rand < 0.85) selectedMult = 1;
          else if (rand < 0.93) selectedMult = 2;
          else if (rand < 0.98) selectedMult = 3;
          else selectedMult = 5;
        }
        if (selectedMult > 1) {
          const rawWin = gift.price * qty * selectedMult;
          winAmount = Math.min(rawWin, totalCost * 2);
        }
      }
    }

    try {
      const batch = writeBatch(firestore);

      const senderProfileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const senderUserRef = doc(firestore, 'users', user.uid);
      const newTotalSpent = (userProfile?.wallet?.totalSpent || 0) + totalCost;
      const newLevel = getLevelFromSpent(newTotalSpent);
      
      const coinUpdate = {
        'wallet.coins': increment(winAmount - totalCost),
        'wallet.totalSpent': increment(totalCost),
        'wallet.dailySpent': increment(totalCost),
        'wallet.weeklySpent': increment(totalCost),
        'wallet.monthlySpent': increment(totalCost),
        'level.rich': newLevel,
        updatedAt: serverTimestamp(),
      };
      batch.update(senderProfileRef, coinUpdate);
      batch.update(senderUserRef, coinUpdate);

      validUids.forEach(uid => {
        const recipientProfileRef = doc(firestore, 'users', uid, 'profile', uid);
        const diamondReward = Math.floor((gift.price * qty) * 0.4);
        
        batch.update(recipientProfileRef, {
          'wallet.diamonds': increment(diamondReward),
          'stats.dailyGiftsReceived': increment(diamondReward),
          [`stats.receivedGifts.${gift.id || gift.name}`]: increment(qty),
          [`stats.giftDetails.${gift.id || gift.name}_name`]: gift.name || "Gift",
          [`stats.giftDetails.${gift.id || gift.name}_imageUrl`]: gift.imageUrl || null,
          updatedAt: serverTimestamp(),
        });
      });

      const supporterRef = doc(firestore, 'chatRooms', roomId, 'topSupporters', user.uid);
      batch.set(supporterRef, {
        uid: user.uid,
        username: userProfile?.username || user?.displayName || 'User',
        avatarUrl: userProfile?.avatarUrl || user?.photoURL || null,
        amount: increment(totalCost),
        dailyAmount: increment(totalCost),
        weeklyAmount: increment(totalCost),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const roomRef = doc(firestore, 'chatRooms', roomId);
      batch.update(roomRef, {
        'stats.totalGifts': increment(totalCost),
        'stats.dailyGifts': increment(totalCost),
        'rocket.progress': increment(totalCost),
        updatedAt: serverTimestamp(),
      });

      try {
        const battleRef = doc(firestore, 'chatRooms', roomId, 'features', 'giftBattle');
        const battleSnap = await getDoc(battleRef);
        if (battleSnap && battleSnap.exists()) {
          const battleData = battleSnap.data();
          if (battleData.isActive) {
            let scoreLeftInc = 0, scoreRightInc = 0;
            if (battleData.leftUser?.uid && validUids.includes(battleData.leftUser.uid)) scoreLeftInc += totalCost;
            if (battleData.rightUser?.uid && validUids.includes(battleData.rightUser.uid)) scoreRightInc += totalCost;
            if (scoreLeftInc > 0 || scoreRightInc > 0) {
              const updates: Record<string, any> = {};
              if (scoreLeftInc > 0) updates.scoreLeft = increment(scoreLeftInc);
              if (scoreRightInc > 0) updates.scoreRight = increment(scoreRightInc);
              if (totalCost >= 500) updates.takeoverEffect = scoreLeftInc >= scoreRightInc ? 'gold' : 'cosmic';
              batch.update(battleRef, updates);
            }
          }
        }
      } catch (err) { console.warn("Failed to update Gift Battle scores in native:", err); }

      // CP Level: increment cpValue when gifting CP partner
      try {
        const senderPartnerUid = userProfile?.relationship?.partnerUid;
        const senderCpType = userProfile?.relationship?.type;
        if (senderPartnerUid && senderCpType && senderCpType !== 'None' && validUids.includes(senderPartnerUid)) {
          const sortedIds = [user.uid, senderPartnerUid].sort();
          const pairId = sortedIds.join('_');
          const cpRef = doc(firestore, 'cpPairs', pairId);
          const cpSnap = await getDoc(cpRef);
          const oldCpValue = cpSnap.exists() ? (cpSnap.data()?.cpValue || 0) : 0;
          const newCpValue = oldCpValue + totalCost;
          const newCpLevel = getCpLevelFromValue(newCpValue);
          batch.set(cpRef, {
            cpValue: increment(totalCost),
            level: newCpLevel,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch (err) { console.warn("Failed to update CP level:", err); }

      const firstRecipient = participants.find(p => p.uid === validUids[0]);
      const messagesRef = collection(firestore, 'chatRooms', roomId, 'messages');
      const msgRef = doc(messagesRef);
      
      batch.set(msgRef, {
        type: 'gift',
        senderId: user.uid,
        senderName: userProfile?.username || user?.displayName || 'User',
        giftId: gift.id || null,
        giftName: gift.name || null,
        giftValue: totalCost,
        animationId: gift.animationId || null,
        imageUrl: gift.imageUrl || null,
        animationUrl: gift.animationUrl || null,
        videoUrl: gift.videoUrl || null,
        soundUrl: gift.soundUrl || null,
        tier: gift.tier || 'normal',
        recipientId: firstRecipient?.uid || null,
        receiverName: firstRecipient?.name || 'User',
        recipientSeat: firstRecipient?.seatIndex || 0,
        text: `sent ${gift.name} x${qty} to ${validUids.length > 1 ? `${validUids.length} users` : (firstRecipient?.name || 'User')}`,
        timestamp: serverTimestamp(),
      });

      await batch.commit();
      console.log('[GiftPicker] batch.commit() SUCCESS — gift sent to:', validUids);

      // Track supporter points: 5 coins = 1 point for each recipient
      try {
        const supportPoints = Math.floor(totalCost / 5);
        if (supportPoints > 0) {
          const now = new Date();
          const currentWeek = getISOWeek(now);
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          for (const recipientUid of validUids) {
            if (recipientUid === user.uid) continue;
            const supportId = `${recipientUid}_${user.uid}`;
            const supportRef = doc(firestore, 'supporters', supportId);

            // Read existing doc to check if week/month reset needed
            let resetWeekly = false;
            let resetMonthly = false;
            try {
              const existing = await getDoc(supportRef);
              if (existing.exists()) {
                const data = existing.data();
                const lastGift = data.lastGiftAt?.toDate?.() || (data.lastGiftAt ? new Date(data.lastGiftAt) : null);
                if (lastGift) {
                  if (getISOWeek(lastGift) !== currentWeek) resetWeekly = true;
                  if (lastGift.getMonth() !== currentMonth || lastGift.getFullYear() !== currentYear) resetMonthly = true;
                } else {
                  resetWeekly = true;
                  resetMonthly = true;
                }
              }
            } catch {}

            await setDoc(supportRef, {
              receiverId: recipientUid,
              supporterId: user.uid,
              supporterName: userProfile?.username || user?.displayName || 'User',
              supporterAvatar: userProfile?.avatarUrl || user?.photoURL || '',
              totalPoints: increment(supportPoints),
              ...(resetWeekly ? { weeklyPoints: supportPoints } : { weeklyPoints: increment(supportPoints) }),
              ...(resetMonthly ? { monthlyPoints: supportPoints } : { monthlyPoints: increment(supportPoints) }),
              lastGiftAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        }
      } catch (err) { console.warn('[GiftPicker] Supporter points error:', err); }

      Vibration.vibrate(100);

      if (onLocalGiftEvent) {
        onLocalGiftEvent({
          id: msgRef.id || `${Date.now()}`,
          type: 'gift',
          senderId: user.uid,
          senderName: userProfile?.username || user?.displayName || 'User',
          giftName: gift.name,
          giftId: gift.id,
          animationId: gift.animationId || null,
          imageUrl: gift.imageUrl || null,
          animationUrl: gift.animationUrl || null,
          videoUrl: gift.videoUrl || null,
          tier: gift.tier || 'normal',
          quantity: qty,
        });
      }

      onGiftSent?.();
      
      return { totalCost, winAmount, selectedMult, isLuckyGift };
    } catch (error: any) {
      console.error('[GiftPicker] Send error:', error?.message || error);
      throw error;
    }
  };

  const startComboTimer = (gift: Gift, multiplier: number, totalWinAmount: number, isLucky: boolean) => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    setComboState({ active: true, multiplier, gift });
    
    comboTimerRef.current = setTimeout(() => {
      setComboState(null);
      comboClicksRef.current = 1;
    }, 5000);
  };

  const handleSend = async () => {
    if (!selectedGift || selectedUids.length === 0 || isSending) return;
    
    setIsSending(true);
    const qty = parseInt(quantity) || 1;
    
    try {
      const result = await executeSend(selectedGift, qty, selectedUids, 1);
      
      if (result) {
        if (selectedGift.animationId === 'cosmic') {
          setCosmicGift({ name: selectedGift.name, image: selectedGift.imageUrl || null });
          setShowCosmic(true);
        }
        comboClicksRef.current = 1;
        startComboTimer(selectedGift, result.selectedMult, result.winAmount, !!result.isLuckyGift);
        onClose();
      } else {
        const totalCost = selectedGift.price * qty * selectedUids.length;
        if ((userProfile?.wallet?.coins || 0) < totalCost) {
          Alert.alert('Insufficient Coins', `You need ${totalCost.toLocaleString()} coins but have ${(userProfile?.wallet?.coins || 0).toLocaleString()}.`);
        } else if (selectedUids.length === 0) {
          Alert.alert('No Recipient', 'Please select a recipient.');
        } else {
          Alert.alert('Gift Failed', 'Unable to send gift. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('[GiftPicker] handleSend error:', err?.message || err);
      Alert.alert('Gift Failed', err?.message || 'An unexpected error occurred.');
    }
    
    setIsSending(false);
  };

  const handleComboPress = async () => {
    if (!selectedGift || !comboState || isSending) return;
    
    setIsSending(true);
    comboClicksRef.current += 1;
    const qty = parseInt(quantity) || 1;
    
    const result = await executeSend(comboState.gift!, qty, selectedUids, comboClicksRef.current);
    
    if (result) {
      setComboState({ ...comboState, multiplier: comboClicksRef.current });
      
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        setComboState(null);
        comboClicksRef.current = 1;
      }, 5000);
    }
    setIsSending(false);
  };

  const totalCost = selectedGift ? selectedGift.price * (parseInt(quantity) || 1) * selectedUids.length : 0;
  const userCoins = userProfile?.wallet?.coins || 0;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide">
        <View className="flex-1 justify-end">
          <View style={{ backgroundColor: '#0b0e14', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>Send Gift</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={selectAll}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: selectedUids.length === seatedParticipants.length ? '#06b6d4' : 'rgba(255,255,255,0.1)' }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>ALL</Text>
                </TouchableOpacity>
                {seatedParticipants.map((p) => (
                  <TouchableOpacity
                    key={p.uid}
                    onPress={() => toggleRecipient(p.uid)}
                    style={{ alignItems: 'center', opacity: selectedUids.includes(p.uid) ? 1 : 0.5, marginHorizontal: 4 }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: selectedUids.includes(p.uid) ? 2 : 0, borderColor: '#22d3ee' }}>
                      <Image cachePolicy="memory-disk" source={{ uri: p.avatarUrl || 'https://picsum.photos/100' }} style={{ width: '100%', height: '100%' }} />
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, marginTop: 2 }} numberOfLines={1}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2 border-b border-white/5" contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: activeCategory === cat ? '#7c3aed' : 'rgba(255,255,255,0.05)' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: activeCategory === cat ? 'white' : 'rgba(255,255,255,0.5)' }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={{ height: 280 }} className="px-4 py-2" showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {currentGifts.map((gift) => (
                  <TouchableOpacity
                    key={gift.id}
                    onPress={() => setSelectedGift(gift)}
                    style={{
                      width: (width - 48) / 4 - 8,
                      aspectRatio: 1,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 6,
                      overflow: 'hidden',
                      backgroundColor: selectedGift?.id === gift.id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                      borderWidth: selectedGift?.id === gift.id ? 2 : 1,
                      borderColor: selectedGift?.id === gift.id ? '#a855f7' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {gift.imageUrl ? (
                      <Image cachePolicy="memory-disk" source={{ uri: gift.imageUrl }} style={{ width: 50, height: 50, marginBottom: 2 }} contentFit="contain" />
                    ) : (
                      <Text style={{ fontSize: 28, marginBottom: 2 }}>🎁</Text>
                    )}
                    <Text style={{ color: 'white', fontSize: 9, fontWeight: '700' }} numberOfLines={1}>{gift.name}</Text>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 }}>
                       <GoldenCoin size={15} />
                       <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: '700' }}>{gift.price}</Text>
                     </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.5)' }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                 <GoldenCoin size={26} />
                 <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '700' }}>{userCoins.toLocaleString()}</Text>
               </View>

              <TouchableOpacity 
                onPress={() => setShowQuantityPopup(!showQuantityPopup)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>x{quantity}</Text>
                <ChevronDown size={14} color="white" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleSend}
                disabled={!selectedGift || selectedUids.length === 0 || isSending || totalCost > userCoins}
                style={{ opacity: (!selectedGift || selectedUids.length === 0 || totalCost > userCoins) ? 0.5 : 1 }}
              >
                <LinearGradient 
                  colors={selectedGift && totalCost <= userCoins ? ['#06b6d4', '#0891b2'] : ['#374151', '#4b5563']}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Send size={14} color="white" />
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                    {isSending ? '...' : `${totalCost.toLocaleString()}`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {showQuantityPopup && (
              <>
                <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onPress={() => setShowQuantityPopup(false)} activeOpacity={1} />
                <View style={{ position: 'absolute', bottom: 64, right: 16, zIndex: 100, backgroundColor: '#1e293b', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  {QUANTITIES.map((q) => (
                    <TouchableOpacity
                      key={q}
                      onPress={() => { setQuantity(q); setShowQuantityPopup(false); }}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: quantity === q ? '#7c3aed' : 'transparent' }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: quantity === q ? 'white' : 'rgba(255,255,255,0.7)' }}>x{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {comboState?.active && (
        <View className="absolute top-32 right-4 z-50">
          <LinearGradient colors={['#f59e0b', '#eab308']} className="rounded-full px-4 py-2 flex-row items-center gap-2 shadow-lg">
            <Text className="text-white font-bold text-sm">
              {comboState.gift?.name} x{comboState.multiplier}
            </Text>
          </LinearGradient>
        </View>
      )}

      {comboState?.active && (
        <TouchableOpacity 
          onPress={handleComboPress}
          className="absolute bottom-32 right-6 z-50"
        >
          <LinearGradient colors={['#fbbf24', '#eab308']} className="w-16 h-16 rounded-full items-center justify-center shadow-lg border-2 border-yellow-300">
            <Text className="text-white font-black text-lg">x{comboState.multiplier}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <CosmicExplosion
        visible={showCosmic}
        giftName={cosmicGift?.name || ''}
        senderName={userProfile?.username || user?.displayName || 'User'}
        giftImage={cosmicGift?.image}
        onComplete={() => { setShowCosmic(false); setCosmicGift(null); }}
      />
    </>
  );
}
