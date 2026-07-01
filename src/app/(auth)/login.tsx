import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, Animated, Dimensions, Alert, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Phone, X, ChevronDown, Search, Fingerprint } from 'lucide-react-native';
import LoginBackground from '../../components/LoginBackground';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { useUser, useFirestore, useDoc } from '../../firebase/provider';
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from '@/firebase/firestore-compat';
import { Image } from 'expo-image';

// ============================================================
// ⚡ FIREBASE CONFIG ⚡
// ============================================================
GoogleSignin.configure({
  webClientId: '373109833688-655nmcl2juhrn5kop38geb4khuu3dsl5.apps.googleusercontent.com',
});

// Firebase Auth instance
const firebaseAuth = auth();
// Required for test phone numbers to bypass Play Integrity check
if (__DEV__) {
  firebaseAuth.settings.appVerificationDisabledForTesting = true;
}

const CREATOR_ID = '901piBzTQ0VzCtAvlyyobwvAaTs1';
const { width, height } = Dimensions.get('window');

// ============================================================
// ⚡ COUNTRIES ⚡ (Web ke exact match - 25+ countries)
// ============================================================
const COUNTRIES = [
  { name: 'India', code: '+91', flag: '🇮🇳', id: 'IN' },
  { name: 'Pakistan', code: '+92', flag: '🇵🇰', id: 'PK' },
  { name: 'Bangladesh', code: '+880', flag: '🇧🇩', id: 'BD' },
  { name: 'UAE', code: '+971', flag: '🇦🇪', id: 'AE' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', id: 'SA' },
  { name: 'USA', code: '+1', flag: '🇺🇸', id: 'US' },
  { name: 'UK', code: '+44', flag: '🇬🇧', id: 'GB' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', id: 'CA' },
  { name: 'Turkey', code: '+90', flag: '🇹🇷', id: 'TR' },
  { name: 'Egypt', code: '+20', flag: '🇪🇬', id: 'EG' },
  { name: 'Jordan', code: '+962', flag: '🇯🇴', id: 'JO' },
  { name: 'Palestine', code: '+970', flag: '🇵🇸', id: 'PS' },
  { name: 'Bahrain', code: '+973', flag: '🇧🇭', id: 'BH' },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼', id: 'KW' },
  { name: 'Oman', code: '+968', flag: '🇴🇲', id: 'OM' },
  { name: 'Qatar', code: '+974', flag: '🇶🇦', id: 'QA' },
  { name: 'Iraq', code: '+964', flag: '🇮🇶', id: 'IQ' },
  { name: 'Syria', code: '+963', flag: '🇸🇾', id: 'SY' },
  { name: 'Lebanon', code: '+961', flag: '🇱🇧', id: 'LB' },
  { name: 'Yemen', code: '+967', flag: '🇾🇪', id: 'YE' },
  { name: 'Algeria', code: '+213', flag: '🇩🇿', id: 'DZ' },
  { name: 'Morocco', code: '+212', flag: '🇲🇦', id: 'MA' },
  { name: 'Libya', code: '+218', flag: '🇱🇾', id: 'LY' },
  { name: 'Tunisia', code: '+216', flag: '🇹🇳', id: 'TN' },
];

// ============================================================
// ⚡ PHONE AUTH ERROR MESSAGES ⚡
// ============================================================
const PHONE_AUTH_ERRORS: Record<string, string> = {
  'auth/missing-verification-code': 'Missing OTP code. Please enter the code received via SMS.',
  'auth/invalid-verification-code': 'Invalid or expired OTP. Please request a new code.',
  'auth/missing-phone-number': 'Please enter a valid phone number.',
  'auth/invalid-phone-number': 'Invalid phone number format. Please check and try again.',
  'auth/quota-exceeded': 'Too many OTP requests. Please wait a few minutes and try again.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/missing-verification-id': 'Verification session expired. Please start again.',
  'auth/invalid-verification-id': 'Invalid verification session. Please restart.',
  'auth/session-expired': 'OTP session expired. Please request a new code.',
  'auth/app-not-authorized': 'Firebase Phone Auth not configured in this app. Please check:\n1. SHA-1 fingerprint in Firebase Console\n2. SafetyNet/Play Integrity enabled\n3. App is signed with correct certificate',
  'auth/captcha-check-failed': 'Security check failed. Enable SafetyNet in Firebase Console > Project Settings > App Check.',
  'auth/invalid-cert-hash': 'Invalid certificate hash. The SHA-1 in Firebase Console does not match this build.',
  'default': 'Phone authentication failed. Please try again or use Google/Facebook login.',
};

const getPhoneAuthErrorMessage = (error: any): string => {

  const code = error?.code || error?.nativeErrorCode || '';
  return PHONE_AUTH_ERRORS[code] || error?.message || error?.nativeErrorMessage || PHONE_AUTH_ERRORS['default'];
};

// ============================================================
// ⚡ HELPER: Generate 6-digit ID ⚡
// ============================================================
const generateNumericID = async (fs: any, uid: string): Promise<string> => {
  if (uid === CREATOR_ID) return '0000';
  try {
    return await runTransaction(fs, async (tx: any) => {
      for (let i = 0; i < 10; i++) {
        const num = String(Math.floor(100000 + Math.random() * 900000));
        const idRef = doc(fs, 'assigned_ids', num);
        const snap = await tx.get(idRef);
        if (!snap.exists()) {
          tx.set(idRef, { uid, assignedAt: serverTimestamp() });
          return num;
        }
      }
      const fallback = String(Math.floor(100000 + Math.random() * 900000));
      const fallbackRef = doc(fs, 'assigned_ids', fallback);
      tx.set(fallbackRef, { uid, assignedAt: serverTimestamp() });
      return fallback;
    });
  } catch (e) {

    return String(Math.floor(100000 + Math.random() * 900000));
  }
};

// ============================================================
// ⚡ MAIN LOGIN SCREEN ⚡
// ============================================================
export default function LoginScreen() {
  const router = useRouter();
  const firestore = useFirestore();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Phone Login State
  const [showPhonePopup, setShowPhonePopup] = useState(false);
  const [phoneLoginStep, setPhoneLoginStep] = useState<'number' | 'code'>('number');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirm, setConfirm] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

  // Country Picker
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  // Auto-detect Country
  useEffect(() => {
    // Always default to India for users in this region
    setSelectedCountry(COUNTRIES[0]);
  }, []);

  // Branding Config
  const configDocRef = useMemo(() => {
    if (!firestore) return null;
    return doc(firestore, 'appConfig', 'global');
  }, [firestore]);
  const { data: config } = useDoc<any>(configDocRef);
  const remoteBg = config?.loginBackgroundUrl || config?.splashScreenUrl || null;

  // Floating Animation
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ============================================================
  // ⚡ USER IDENTITY SYNC (Web ke exact logic) ⚡
  // ============================================================
  const syncUserIdentity = async (uid: string, email: string | null, displayName: string | null) => {
    if (!firestore || !uid) return;
    const userRef = doc(firestore, 'users', uid);
    const profileRef = doc(firestore, 'users', uid, 'profile', uid);
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as any;
        if (data.banStatus?.isBanned) {
          const until = data.banStatus.bannedUntil?.toDate?.();
          if (!until || until > new Date()) {
            Alert.alert('Account Banned', 'Your account has been suspended.');
            return;
          }
        }
        return; // User exists, no creation needed
      }
      // Create new user
      const accountNumber = await generateNumericID(firestore, uid);
      const baseData = {
        id: uid,
        username: displayName || `Tribe_${accountNumber}`,
        accountNumber,
        accountNumberLocked: true,
        avatarUrl: '',
        wallet: { coins: 0, diamonds: 0, totalSpent: 0, dailySpent: 0, weeklySpent: 0, monthlySpent: 0 },
        level: { rich: 1, charm: 1 },
        banStatus: { isBanned: false, bannedUntil: null, reason: '' },
        isOnline: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, baseData, { merge: true });
      await setDoc(profileRef, {
        ...baseData,
        email: email || '',
        bio: 'Find your vibe, connect with your tribe.',
        inventory: { ownedItems: [], activeFrame: 'None' },
        tags: [],
        stats: { followers: 0, fans: 0, totalGifts: 0, dailyFans: 0, friends: 0, following: 0 },
      }, { merge: true });
    } catch (err) {
    }
  };

  // ============================================================
  // ⚡ POST-AUTH NAVIGATION ⚡
  // ============================================================
  const handlePostAuth = async (user: FirebaseAuthTypes.User) => {
    if (!firestore) { router.replace('/(tabs)'); return; }
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as any;
        if (data.banStatus?.isBanned) {
          const until = data.banStatus.bannedUntil?.toDate?.();
          if (!until || until > new Date()) {
            Alert.alert('Banned', 'Your account is banned.');
            return;
          }
        }
        if (data.onboardingComplete || data.username) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/onboarding');
        }
      } else {
        await syncUserIdentity(user.uid, user.email, user.displayName);
        router.replace('/(auth)/onboarding');
      }
    } catch {
      router.replace('/(tabs)');
    }
  };

  // ============================================================
  // ⚡ GOOGLE SIGN-IN ⚡
  // ============================================================
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      console.log('[Google Signin Raw Result]:', JSON.stringify(res));
      const data = res?.data || res;
      const idToken = data?.idToken || (data as any)?.authentication?.idToken || (res as any)?.idToken;
      const accessToken = data?.accessToken || (data as any)?.authentication?.accessToken || (res as any)?.accessToken || 'placeholder_access_token';
      
      if (idToken) {
        // credential expects (idToken, accessToken) - passing both prevents HostFunction empty validation crash
        const googleCredential = auth.GoogleAuthProvider.credential(idToken, accessToken);
        const result = await auth().signInWithCredential(googleCredential);
        if (result.user) await handlePostAuth(result.user);
      } else {
        throw new Error('Google Sign In succeeded but ID Token is missing. Object: ' + JSON.stringify(res));
      }
    } catch (error: any) {
      console.error('[Google Signin Error]:', error);
      Alert.alert('Google Sign In Failed', error?.message || 'Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // ============================================================
  // ⚡ FACEBOOK SIGN-IN ⚡
  // ============================================================
  const handleFacebookSignIn = async () => {
    try {
      setIsSigningIn(true);
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      if (result.isCancelled) { setIsSigningIn(false); return; }
      const accessData = await AccessToken.getCurrentAccessToken();
      if (!accessData) throw new Error('No access token');
      const facebookCredential = auth.FacebookAuthProvider.credential(accessData.accessToken);
      const fbResult = await auth().signInWithCredential(facebookCredential);
      if (fbResult.user) await handlePostAuth(fbResult.user);
    } catch (error: any) {
      Alert.alert('Facebook Sign In Failed', error?.message || 'Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // ============================================================
  // ⚡ PHONE AUTH - SEND OTP ⚡
  // ============================================================
  const handleSendCode = async () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      Alert.alert('Invalid Number', 'Enter a valid phone number (min 10 digits).');
      return;
    }
    try {
      setIsSigningIn(true);
      const formattedNumber = `${selectedCountry.code}${cleanNumber}`;

      const confirmation = await firebaseAuth.signInWithPhoneNumber(formattedNumber);
      setConfirm(confirmation);
      setPhoneLoginStep('code');
      Alert.alert('Code Sent', `OTP sent to ${formattedNumber}`);
    } catch (error: any) {
      Alert.alert('Phone Auth Failed', error?.message || 'Could not send OTP. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };


  // ============================================================
  // ⚡ PHONE AUTH - VERIFY OTP ⚡
  // ============================================================
  const handleVerifyCode = async () => {
    if (!confirm || verificationCode.length < 6) {
      Alert.alert('Incomplete', 'Please enter the complete 6-digit OTP.');
      return;
    }
    try {
      setIsSigningIn(true);
      const result = await confirm.confirm(verificationCode);
      setShowPhonePopup(false);
      setPhoneNumber('');
      setVerificationCode('');
      if (result?.user) await handlePostAuth(result.user);
    } catch (error: any) {
      Alert.alert('Verification Failed', error?.message || 'Wrong OTP. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // ============================================================
  // ⚡ UI RENDER ⚡
  // ============================================================
  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />
      {/* Background: Web exact match - LoginBackground with radial glow + 25 SVG particles */}
      <LinearGradient colors={['#0a0026', '#B027FF', '#6b0643']} className="absolute inset-0" />
      <LoginBackground floatAnim={floatAnim} />

      <View className="absolute inset-0 bg-black/35" />

      {/* Main Card */}
      <View className="flex-1 justify-center items-center px-5">
        <View className="w-full max-w-md rounded-3xl bg-white/10 border border-white/20 shadow-2xl p-6 items-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          {/* Logo */}
          <View className="h-20 w-20 rounded-2xl overflow-hidden bg-white/20 items-center justify-center mb-6">
            <Image 
              source={require('../../../assets/images/ummy-logon.png')} 
              className="h-16 w-16" 
              contentFit="contain" 
            />
          </View>

          {/* Title */}
          <View className="items-center mb-6">
            <Text className="text-3xl font-bold text-white mb-1">Ummy</Text>
            <Text className="text-sm text-white/80 font-medium">Find your vibe. Connect with your Tribe</Text>
          </View>

          {/* Auth Buttons */}
          <View className="w-full space-y-3">
            {/* Facebook */}
            <TouchableOpacity onPress={handleFacebookSignIn} disabled={isSigningIn} className="w-full h-12 rounded-xl bg-blue-600 flex-row items-center justify-center shadow-lg active:scale-95">
              <Text className="text-white font-bold text-base">Continue with Facebook</Text>
            </TouchableOpacity>

            {/* Google */}
            <TouchableOpacity onPress={handleGoogleSignIn} disabled={isSigningIn} className="w-full h-12 rounded-xl bg-white flex-row items-center justify-center shadow-lg active:scale-95">
              <Image cachePolicy="memory-disk" source={{ uri: 'https://developers.google.com/static/identity/images/g-logo.png' }} className="w-5 h-5 mr-2" />
              <Text className="text-black font-bold text-base">Sign in with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View className="flex-row items-center w-full my-6">
            <View className="flex-1 h-px bg-white/30" />
            <Text className="text-xs text-white/70 mx-3 uppercase font-medium">OR</Text>
            <View className="flex-1 h-px bg-white/30" />
          </View>

          {/* Phone Button */}
          <TouchableOpacity onPress={() => setShowPhonePopup(true)} className="w-20 h-12 rounded-xl bg-white/20 border border-white/30 items-center justify-center">
            <Phone size={22} color="white" />
          </TouchableOpacity>

          {/* Terms */}
          <Text className="text-[11px] text-white/70 leading-snug mt-6 text-center">
            By continuing you agree to the User Agreement & Privacy Policy
          </Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* ⚡ PHONE LOGIN MODAL ⚡ */}
      {/* ============================================================ */}
      <Modal visible={showPhonePopup} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-center items-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="w-full max-w-sm rounded-[32px] bg-gradient-to-b from-[#FF91B5] to-[#f472b6] border border-white/20 shadow-2xl p-6 md:p-8 items-center">
            {/* Close */}
            <TouchableOpacity onPress={() => { setShowPhonePopup(false); setPhoneLoginStep('number'); }} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full">
              <X size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>

            {/* Icon */}
            <View className="h-16 w-16 bg-white/10 rounded-3xl items-center justify-center mb-6 shadow-inner">
              <Phone size={28} color="#FFCC00" />
            </View>

            <Text className="text-2xl font-bold text-white mb-2 text-center tracking-tight">
              {phoneLoginStep === 'number' ? 'Enter Phone Number' : 'Enter OTP Code'}
            </Text>
            <Text className="text-sm font-medium text-white/60 text-center mb-8 px-2">
              {phoneLoginStep === 'number' 
                ? 'We will send you a verification code to authenticate your account securely.'
                : `A 6-digit code was sent to ${phoneNumber}`
              }
            </Text>

            {phoneLoginStep === 'number' ? (
              <View className="w-full space-y-4">
                <View className="flex-row gap-2 w-full">
                  <TouchableOpacity onPress={() => setIsCountryDropdownOpen(true)} className="h-14 w-[85px] bg-black/20 border border-white/10 rounded-2xl px-2 flex-row items-center justify-between">
                    <Text className="text-xl">{selectedCountry.flag}</Text>
                    <Text className="text-white font-bold text-xs">{selectedCountry.code}</Text>
                    <ChevronDown size={12} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                  <TextInput
                    keyboardType="phone-pad"
                    placeholder="Number"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    className="flex-1 h-14 bg-black/20 border border-white/10 rounded-2xl px-4 text-white text-lg font-bold"
                  />
                </View>

                <TouchableOpacity onPress={handleSendCode} disabled={isSigningIn || !phoneNumber} className="w-full h-14 rounded-2xl bg-[#FFCC00] items-center justify-center shadow-lg active:scale-95">
                  <Text className="text-black font-bold text-lg">{isSigningIn ? 'Sending...' : 'Send Code'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="w-full space-y-4">
                {/* Segmented OTP Input (Web jaisa) */}
                <View className="flex-row gap-2.5 justify-center">
                  {Array.from({ length: 6 }).map((_, index) => {
                    const char = verificationCode[index] || '';
                    const isFocused = verificationCode.length === index;
                    return (
                      <View key={index} className={`w-11 h-14 rounded-2xl items-center justify-center border ${isFocused ? 'border-[#FFCC00] bg-black/30' : char ? 'border-white/30 bg-black/20' : 'border-white/10 bg-black/20'}`}>
                        {char ? (
                          <Text className="text-white text-xl font-black">{char}</Text>
                        ) : isFocused ? (
                          <View className="w-1 h-5 bg-[#FFCC00] rounded-full animate-pulse" />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={6}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  className="absolute w-full h-full opacity-0"
                  autoFocus
                />

                <TouchableOpacity onPress={handleVerifyCode} disabled={isSigningIn || verificationCode.length < 6} className="w-full h-14 rounded-2xl bg-white items-center justify-center shadow-lg active:scale-95">
                  <Text className="text-[#140028] font-bold text-lg">{isSigningIn ? 'Verifying...' : 'Verify & Login'}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPhoneLoginStep('number')} className="items-center">
                  <Text className="text-white/50 text-sm font-semibold">Change Phone Number</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* ⚡ COUNTRY PICKER MODAL ⚡ */}
      {/* ============================================================ */}
      <Modal visible={isCountryDropdownOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <View className="w-full max-w-sm h-[80vh] bg-[#1a1a1a] border border-white/10 rounded-[40px] overflow-hidden">
            {/* Header */}
            <View className="p-6 border-b border-white/5">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-white">Select Country</Text>
                <TouchableOpacity onPress={() => setIsCountryDropdownOpen(false)} className="p-2 bg-white/10 rounded-full">
                  <X size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
              {/* Search */}
              <View className="relative">
                <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: 16, top: 18, zIndex: 1 }} />
                <TextInput
                  placeholder="Search country/code"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={countrySearchQuery}
                  onChangeText={setCountrySearchQuery}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white"
                />
              </View>
            </View>

            {/* List */}
            <ScrollView className="flex-1 p-2">
              {COUNTRIES.filter(c => 
                c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) || 
                c.code.includes(countrySearchQuery)
              ).map((country) => (
                <TouchableOpacity key={`${country.id}-${country.code}`} onPress={() => { setSelectedCountry(country); setIsCountryDropdownOpen(false); setCountrySearchQuery(''); }} className="w-full h-16 px-4 flex-row items-center justify-between rounded-3xl">
                  <View className="flex-row items-center gap-4">
                    <Text className="text-2xl w-8 text-center">{country.flag}</Text>
                    <View>
                      <Text className="text-white font-bold text-sm">{country.name}</Text>
                      <Text className="text-white/50 text-xs">{country.id}</Text>
                    </View>
                  </View>
                  <Text className="text-white/70 font-bold text-sm">{country.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}