import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  LogOut, 
  Trash2, 
  Globe, 
  Shield, 
  UserX, 
  Bell, 
  Lock, 
  ChevronRight,
  Smartphone,
  Check,
  ChevronLeft
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser, useFirestore } from '../../firebase/provider';
import { doc, serverTimestamp, writeBatch, updateDoc } from '@/firebase/firestore-compat';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useRoomContext } from '../../context/room-context';

const LANGUAGES = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'hi', name: 'Hindi', native: 'हिंदी' },
  { id: 'bn', name: 'Bengali', native: 'বাংলা' },
  { id: 'ar', name: 'Arabic', native: 'العربية' },
  { id: 'ur', name: 'Urdu', native: 'اردو' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile } = useUserProfile(user?.uid);
  const { setActiveRoom, setMinimizedRoom } = useRoomContext();

  const [view, setView] = useState<'main' | 'language' | 'account'>('main');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Account Linking State
  const [isLinking, setIsLinking] = useState(false);
  const [phoneLoginStep, setPhoneLoginStep] = useState<'number' | 'code'>('number');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);

  const providerData = auth().currentUser?.providerData || [];
  const linkedProviders = providerData.map(p => p.providerId);
  const isGoogleLinked = linkedProviders.includes('google.com');
  const isFacebookLinked = linkedProviders.includes('facebook.com');
  const isPhoneLinked = linkedProviders.includes('phone');

  useEffect(() => {
    AsyncStorage.getItem('ummy_lang').then(lang => {
      if (lang) {
        setSelectedLanguage(lang);
      }
    });
  }, []);

  const handleLanguageSelect = async (langId: string) => {
    setSelectedLanguage(langId);
    await AsyncStorage.setItem('ummy_lang', langId);
    if (firestore && user?.uid) {
      const ref = doc(firestore, 'users', user.uid);
      const pref = doc(firestore, 'users', user.uid, 'profile', user.uid);
      await updateDoc(ref, { language: langId }).catch(() => {});
      await updateDoc(pref, { language: langId }).catch(() => {});
    }
    Alert.alert('Language Updated', 'System language has been set.');
    setTimeout(() => setView('main'), 300);
  };

  const handleLinkGoogle = async () => {
    if (!auth().currentUser) return;
    setIsLinking(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const { data } = await GoogleSignin.signIn();
      if (data?.idToken) {
        const credential = auth.GoogleAuthProvider.credential(data.idToken);
        await auth().currentUser?.linkWithCredential(credential);
        Alert.alert('Success', 'Google account linked successfully.');
      } else {
        throw new Error('Google Sign-In returned no ID token.');
      }
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        Alert.alert('Already Linked', 'This Google account is already linked to another Ummy profile.');
      } else {
        Alert.alert('Error', error.message || 'Failed to link Google.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkFacebook = async () => {
    if (!auth().currentUser) return;
    setIsLinking(true);
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) {
        setIsLinking(false);
        return;
      }
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) throw new Error('No Facebook access token retrieved.');
      const credential = auth.FacebookAuthProvider.credential(data.accessToken);
      await auth().currentUser?.linkWithCredential(credential);
      Alert.alert('Success', 'Facebook account linked successfully.');
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        Alert.alert('Already Linked', 'This Facebook account is already linked to another Ummy profile.');
      } else {
        Alert.alert('Error', error.message || 'Failed to link Facebook.');
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkPhone = async () => {
    if (!auth().currentUser) return;
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      Alert.alert('Invalid Number', 'Include your country code.');
      return;
    }
    setIsLinking(true);
    try {
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const result = await (auth().currentUser as any)?.linkWithPhoneNumber(formattedNumber);
      setConfirmResult(result);
      setPhoneLoginStep('code');
      Alert.alert('Code Sent', 'Verification code dispatched via SMS.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send SMS.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!confirmResult) return;
    setIsLinking(true);
    try {
      await confirmResult.confirm(verificationCode);
      Alert.alert('Success', 'Phone number linked successfully.');
      setPhoneLoginStep('number');
      setPhoneNumber('');
      setVerificationCode('');
      setConfirmResult(null);
    } catch (error: any) {
      Alert.alert('Invalid Code', 'Incorrect verification code.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async (providerId: string) => {
    if (!auth().currentUser) return;
    if (linkedProviders.length <= 1) {
      Alert.alert('Action Denied', 'You cannot unlink your only login method.');
      return;
    }
    Alert.alert('Unlink Account', `Are you sure you want to unlink your ${providerId} account?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unlink', style: 'destructive', onPress: async () => {
        setIsLinking(true);
        try {
          await auth().currentUser?.unlink(providerId);
          Alert.alert('Success', 'Account connection removed.');
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to unlink provider.');
        } finally {
          setIsLinking(false);
        }
      }}
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to exit the frequency?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        try {
          // STEP 1: Clear active room/minimized room to trigger cleanups
          setActiveRoom(null);
          setMinimizedRoom(null);

          // STEP 2: Wait 2 seconds for leave routines
          await new Promise(resolve => setTimeout(resolve, 2000));

          // STEP 3: Batch update status and sign out
          if (firestore && user?.uid) {
            const userRef = doc(firestore, 'users', user.uid);
            const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
            const batch = writeBatch(firestore);
            batch.update(userRef, { isOnline: false, currentRoomId: null, updatedAt: serverTimestamp() });
            batch.update(profileRef, { isOnline: false, currentRoomId: null, updatedAt: serverTimestamp() });
            await batch.commit();
          }

          await GoogleSignin.signOut().catch(() => {});
          await auth().signOut();
          router.replace('/login');
        } catch (error) {
          await GoogleSignin.signOut().catch(() => {});
          await auth().signOut().catch(() => {});
          router.replace('/login');
        }
      }}
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This cannot be undone. All data will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (firestore && user?.uid) {
            const userRef = doc(firestore, 'users', user.uid);
            const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
            const batch = writeBatch(firestore);
            batch.update(userRef, { isDeleted: true, isOnline: false, updatedAt: serverTimestamp() });
            batch.update(profileRef, { isDeleted: true, isOnline: false, updatedAt: serverTimestamp() });
            await batch.commit();
          }

          await auth().currentUser?.delete().catch(() => {});
          await GoogleSignin.signOut().catch(() => {});
          await auth().signOut();
          router.replace('/login');
        } catch (error) {
          await GoogleSignin.signOut().catch(() => {});
          await auth().signOut().catch(() => {});
          router.replace('/login');
        }
      }}
    ]);
  };

  // ----------------------------------------------------
  // Main View Render
  // ----------------------------------------------------
  if (view === 'main') {
    const activeLangName = LANGUAGES.find(l => l.id === selectedLanguage)?.name || 'English';

    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Settings</Text>
        </View>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <Text className="text-xs font-bold text-slate-400 mt-6 mb-2 uppercase tracking-wider px-1">Identity & Configuration</Text>
          <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <MenuItem 
              icon={Globe} 
              label="Language" 
              extra={activeLangName} 
              onPress={() => setView('language')} 
            />
            <MenuItem 
              icon={Shield} 
              label="Account Connections" 
              extra={`${linkedProviders.length} Linked`} 
              onPress={() => setView('account')} 
            />
            <MenuItem icon={Bell} label="Notifications" onPress={() => router.push('/notifications')} />
            <MenuItem icon={Lock} label="Privacy" onPress={() => {}} />
            <MenuItem icon={UserX} label="Blocked Users" onPress={() => {}} />
          </View>

          <Text className="text-xs font-bold text-slate-400 mt-6 mb-2 uppercase tracking-wider px-1">Exit Actions</Text>
          <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6">
            <MenuItem icon={LogOut} label="Logout" onPress={handleLogout} textColor="#ef4444" />
            <MenuItem icon={Trash2} label="Delete Account" onPress={handleDeleteAccount} textColor="#ef4444" />
          </View>

          <Text className="text-center text-slate-400 text-xs mb-8">Ummy Secure Protocol v1.4.2 • India Official</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // Language View Render
  // ----------------------------------------------------
  if (view === 'language') {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
          <TouchableOpacity onPress={() => setView('main')} className="mr-3 p-1">
            <ChevronLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Select Language</Text>
        </View>

        <ScrollView className="flex-1 px-4 mt-4" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.id;
              return (
                <TouchableOpacity
                  key={lang.id}
                  onPress={() => handleLanguageSelect(lang.id)}
                  className="flex-row items-center justify-between py-4 px-4 border-b border-slate-50"
                >
                  <View>
                    <Text className="text-sm font-semibold text-slate-800">{lang.name}</Text>
                    <Text className="text-xs text-slate-400 mt-0.5">{lang.native}</Text>
                  </View>
                  {isSelected && <Check size={20} color="#8b5cf6" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // Account View Render
  // ----------------------------------------------------
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => setView('main')} className="mr-3 p-1">
          <ChevronLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Connected Accounts</Text>
      </View>

      <ScrollView className="flex-1 px-4 mt-4" showsVerticalScrollIndicator={false}>
        {isLinking && (
          <View className="flex-row items-center justify-center p-4 bg-slate-50 rounded-xl mb-4">
            <ActivityIndicator size="small" color="#8b5cf6" className="mr-2" />
            <Text className="text-slate-500 text-sm font-medium">Processing account updates...</Text>
          </View>
        )}

        <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider px-1">Identity Providers</Text>
        <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-6">
          {/* Google */}
          <ConnectionItem
            name="Google"
            isLinked={isGoogleLinked}
            onLink={handleLinkGoogle}
            onUnlink={() => handleUnlink('google.com')}
          />
          {/* Facebook */}
          <ConnectionItem
            name="Facebook"
            isLinked={isFacebookLinked}
            onLink={handleLinkFacebook}
            onUnlink={() => handleUnlink('facebook.com')}
          />
        </View>

        <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider px-1">Phone Number</Text>
        <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden p-4">
          {isPhoneLinked ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="p-2 bg-purple-50 rounded-full">
                  <Smartphone size={20} color="#8b5cf6" />
                </View>
                <View>
                  <Text className="text-slate-800 font-semibold text-sm">Phone Linked</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">{auth().currentUser?.phoneNumber || 'Linked'}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleUnlink('phone')}
                className="px-3 py-1.5 rounded-lg bg-red-50"
              >
                <Text className="text-red-500 text-xs font-bold uppercase">Unlink</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-4">
              {phoneLoginStep === 'number' ? (
                <>
                  <Text className="text-slate-600 text-sm mb-2">Connect your phone number to authorize with SMS OTP codes.</Text>
                  <TextInput
                    placeholder="E.g. +919876543210"
                    placeholderTextColor="#94a3b8"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    className="w-full h-11 border border-slate-200 rounded-xl px-3 text-slate-800 text-sm font-medium"
                  />
                  <TouchableOpacity
                    onPress={handleLinkPhone}
                    disabled={isLinking}
                    className="w-full h-11 bg-purple-600 rounded-xl items-center justify-center mt-2"
                  >
                    <Text className="text-white font-bold text-sm">Send Verification OTP</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text className="text-slate-600 text-sm mb-2">Enter the 6-digit confirmation code sent to your phone.</Text>
                  <TextInput
                    placeholder="OTP Code"
                    placeholderTextColor="#94a3b8"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3 text-slate-800 text-center text-lg font-bold tracking-widest"
                  />
                  <View className="flex-row gap-3 mt-2">
                    <TouchableOpacity
                      onPress={() => {
                        setPhoneLoginStep('number');
                        setConfirmResult(null);
                      }}
                      className="flex-1 h-11 border border-slate-200 rounded-xl items-center justify-center"
                    >
                      <Text className="text-slate-500 font-bold text-sm">Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleVerifyPhoneCode}
                      disabled={isLinking}
                      className="flex-1 h-11 bg-purple-600 rounded-xl items-center justify-center"
                    >
                      <Text className="text-white font-bold text-sm">Verify OTP</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon: Icon, label, extra, onPress, textColor }: any) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between py-4 px-4 border-b border-slate-50">
      <View className="flex-row items-center gap-3">
        <View className="p-2 bg-purple-50 rounded-full">
          <Icon size={18} color={textColor || '#8b5cf6'} />
        </View>
        <Text className={`text-sm font-semibold uppercase tracking-wide ${textColor ? '' : 'text-slate-700'}`} style={textColor ? { color: textColor } : undefined}>{label}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        {extra && <Text className="text-xs font-semibold text-slate-400 uppercase">{extra}</Text>}
        <ChevronRight size={16} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );
}

function ConnectionItem({ name, isLinked, onLink, onUnlink }: { name: string; isLinked: boolean; onLink: () => void; onUnlink: () => void }) {
  return (
    <View className="flex-row items-center justify-between py-4 px-4 border-b border-slate-50">
      <View className="flex-row items-center gap-3">
        <Text className="text-slate-800 font-bold text-sm">{name}</Text>
        {isLinked ? (
          <View className="px-2 py-0.5 bg-emerald-50 rounded-full">
            <Text className="text-[10px] text-emerald-600 font-bold uppercase">Connected</Text>
          </View>
        ) : (
          <View className="px-2 py-0.5 bg-slate-50 rounded-full">
            <Text className="text-[10px] text-slate-400 font-bold uppercase">Disconnected</Text>
          </View>
        )}
      </View>
      {isLinked ? (
        <TouchableOpacity
          onPress={onUnlink}
          className="px-3 py-1.5 rounded-lg bg-red-50"
        >
          <Text className="text-red-500 text-xs font-bold uppercase">Unlink</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onLink}
          className="px-3 py-1.5 rounded-lg bg-purple-50"
        >
          <Text className="text-purple-600 text-xs font-bold uppercase">Link</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
