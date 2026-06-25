import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useFirestore, useUser, useDoc } from '../firebase/provider';
import { doc } from '@/firebase/firestore-compat';
import { useRouter } from 'expo-router';
import { useUserProfile } from '../hooks/use-user-profile';

export function GlobalBanGuard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { profile } = useUserProfile(user?.uid);

  useEffect(() => {
    if (!profile?.banStatus?.isBanned) return;

    const ban = profile.banStatus;
    const bannedUntil = ban.bannedUntil?.toDate?.() || (ban.bannedUntil?.seconds ? new Date(ban.bannedUntil.seconds * 1000) : null);

    if (bannedUntil && bannedUntil > new Date()) {
      Alert.alert(
        'Account Banned',
        `Reason: ${ban.reason || 'Violation of community guidelines'}\nExpires: ${bannedUntil.toLocaleDateString()}`,
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    }
  }, [profile?.banStatus]);

  return null;
}
