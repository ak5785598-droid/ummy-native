import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, StyleSheet, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useUser } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { Send, User, X, Check } from 'lucide-react-native';
import { Image } from 'expo-image';

const CREATOR_ID = '901piBzTQ0VzCtAvlyyobwvAaTs1';

export const SellerTransferDialog = ({ trigger }: any) => {
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [foundRecipient, setFoundRecipient] = useState<any>(null);

  const { user } = useUser();
  const { profile: userProfile } = useUserProfile(user?.uid);

  const isAuthorized = userProfile?.tags?.some((t: string) => 
    ['Seller', 'Seller center', 'Coin Seller'].includes(t)
  ) || user?.uid === CREATOR_ID;

  // Auto-close if permission is lost
  useEffect(() => {
    if (open && !isAuthorized && user?.uid !== CREATOR_ID) {
      setOpen(false);
      Alert.alert('Certification Suspended', 'Your Seller Center access has been revoked.');
    }
  }, [isAuthorized, open, user?.uid]);

  // Recipient Lookup with debounce
  useEffect(() => {
    if (recipientId.length < 1) {
      setFoundRecipient(null);
      return;
    }

    const lookup = async () => {
      setIsSearching(true);
      try {
        const snap = await firestore()
          .collection('users')
          .where('accountNumber', '==', recipientId.trim())
          .limit(1)
          .get();

        if (!snap.empty) {
          setFoundRecipient({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setFoundRecipient(null);
        }
      } catch (err) {
        console.warn('[Seller Transfer] Lookup failed:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(lookup, 500);
    return () => clearTimeout(timer);
  }, [recipientId]);

  const handleTransfer = async () => {
    if (!user || !foundRecipient || !amount || !userProfile) return;

    const coinsToTransfer = parseInt(amount);
    if (isNaN(coinsToTransfer) || coinsToTransfer <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    const currentBalance = userProfile.wallet?.coins || 0;
    if (coinsToTransfer > currentBalance) {
      Alert.alert('Insufficient Balance', 'You do not have enough coins for this transfer.');
      return;
    }

    if (foundRecipient.id === user.uid) {
      Alert.alert('Invalid Transfer', 'Cannot transfer coins to your own account.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Fresh authorization check
      const freshUserSnap = await firestore().collection('users').doc(user.uid).get();
      const freshTags = freshUserSnap.data()?.tags || [];
      const sellerTags = ['Seller', 'Seller center', 'Coin Seller'];
      const isStillAuthorized = freshTags.some((t: string) => sellerTags.includes(t)) || user.uid === CREATOR_ID;

      if (!isStillAuthorized) {
        Alert.alert('Authority Revoked', 'Your seller certification is no longer active.');
        setOpen(false);
        return;
      }

      // 2. Transaction batch execution
      const batch = firestore().batch();
      const senderRef = firestore().collection('users').doc(user.uid);
      const senderProfileRef = firestore().collection('users').doc(user.uid).collection('profile').doc(user.uid);
      const receiverRef = firestore().collection('users').doc(foundRecipient.id);
      const receiverProfileRef = firestore().collection('users').doc(foundRecipient.id).collection('profile').doc(foundRecipient.id);
      const receiverNotifRef = firestore().collection('users').doc(foundRecipient.id).collection('notifications').doc();

      batch.update(senderProfileRef, { 
        'wallet.coins': firestore.FieldValue.increment(-coinsToTransfer),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      batch.update(receiverProfileRef, { 
        'wallet.coins': firestore.FieldValue.increment(coinsToTransfer),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      batch.set(receiverNotifRef, {
        title: 'Coins Dispatched',
        content: `You received ${coinsToTransfer.toLocaleString()} Gold Coins from Official Seller.`,
        type: 'system',
        timestamp: firestore.FieldValue.serverTimestamp(),
        isRead: false
      });

      await batch.commit();

      Alert.alert('Transfer Successful', `Transferred ${coinsToTransfer.toLocaleString()} Gold Coins to ${foundRecipient.username}.`);
      setOpen(false);
      setRecipientId('');
      setAmount('');
      setFoundRecipient(null);
    } catch (err: any) {
      Alert.alert('Transfer Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)}>{trigger}</TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.header}>
              <Text style={styles.title}>Seller Center</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Recipient Account ID</Text>
                <TextInput
                  placeholder="Enter Account Number"
                  value={recipientId}
                  onChangeText={setRecipientId}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                {isSearching && <ActivityIndicator size="small" color="#ef4444" style={{ marginTop: 8 }} />}
                {!isSearching && foundRecipient && (
                  <View style={styles.recipientCard}>
                    <User size={16} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text style={styles.recipientText}>{foundRecipient.username}</Text>
                  </View>
                )}
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={styles.label}>Coins Amount</Text>
                <TextInput
                  placeholder="Enter Transfer Amount"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <Text style={styles.balanceText}>
                  Your balance: 🪙 {userProfile?.wallet?.coins?.toLocaleString() || 0}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleTransfer}
                disabled={isProcessing || !foundRecipient || !amount}
                style={[
                  styles.submitBtn,
                  (!foundRecipient || !amount) && styles.submitBtnDisabled
                ]}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Send size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Dispatch Coins</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    textTransform: 'uppercase'
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#f8fafc'
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  recipientText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
    textTransform: 'uppercase'
  },
  balanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 6,
    marginLeft: 4
  },
  submitBtn: {
    height: 50,
    backgroundColor: '#ef4444',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnDisabled: {
    backgroundColor: '#cbd5e1'
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase'
  }
});
