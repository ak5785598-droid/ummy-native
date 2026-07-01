import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Switch, FlatList } from 'react-native';
import {
  ChevronLeft,
  Camera,
  Upload,
  Globe,
  Phone,
  Calendar,
  X,
  Plus,
  Info,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUser, useFirestore } from '../../firebase/provider';
import { doc, serverTimestamp, setDoc } from '@/firebase/firestore-compat';
import rnfbStorage from '@react-native-firebase/storage';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import { AvatarFrame } from './AvatarFrame';
import { toCDN } from '../../lib/cdn';

const COUNTRIES = [
  { name: 'India', code: 'IN', flag: String.fromCodePoint(0x1F1EE, 0x1F1F3) },
  { name: 'Pakistan', code: 'PK', flag: String.fromCodePoint(0x1F1F5, 0x1F1F0) },
  { name: 'Bangladesh', code: 'BD', flag: String.fromCodePoint(0x1F1E7, 0x1F1E9) },
  { name: 'United Arab Emirates', code: 'AE', flag: String.fromCodePoint(0x1F1E6, 0x1F1EA) },
  { name: 'Saudi Arabia', code: 'SA', flag: String.fromCodePoint(0x1F1F8, 0x1F1E6) },
  { name: 'United States', code: 'US', flag: String.fromCodePoint(0x1F1FA, 0x1F1F8) },
  { name: 'United Kingdom', code: 'GB', flag: String.fromCodePoint(0x1F1EC, 0x1F1E7) },
  { name: 'Canada', code: 'CA', flag: String.fromCodePoint(0x1F1E8, 0x1F1E6) },
  { name: 'Australia', code: 'AU', flag: String.fromCodePoint(0x1F1E6, 0x1F1FA) },
  { name: 'Other', code: 'OT', flag: String.fromCodePoint(0x1F30D) },
];



// â”€â”€â”€ Country Picker Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CountryPickerModal = ({
  visible,
  selectedCountry,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedCountry: string | undefined;
  onSelect: (name: string) => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>Select Country</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={COUNTRIES}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => { onSelect(item.name); onClose(); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: selectedCountry === item.name ? '#f3f4f6' : 'white',
                borderBottomWidth: 1,
                borderBottomColor: '#f8fafc',
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>{item.flag}</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1 }}>{item.name}</Text>
              {selectedCountry === item.name && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8b5cf6' }} />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  </Modal>
);

// â”€â”€â”€ Section Field Wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FieldRow = ({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <View style={{ borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 4, marginBottom: 4 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 4, marginBottom: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      {right}
    </View>
    {children}
  </View>
);

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const EditProfileDialog = ({ profile, trigger }: { profile: any; trigger?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [birthday, setBirthday] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showBirthday, setShowBirthday] = useState(true);
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [spaceImages, setSpaceImages] = useState<(string | null)[]>(Array(8).fill(null));
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();

  const isGenderFixed = !!profile?.gender;
  const selectedCountry = COUNTRIES.find((c) => c.name === country);

  useEffect(() => {
    if (profile && open) {
      setName(profile.username || profile.name || '');
      setBio(profile.bio || '');
      setGender(profile.gender || undefined);
      setCountry(profile.country || undefined);
      setBirthday(profile.birthday || '');
      setWhatsapp(profile.whatsapp || '');
      setShowBirthday(profile.showBirthday !== false);
      setShowWhatsapp(profile.showWhatsapp !== false);
      const images = profile.spaceImages || [];
      setSpaceImages([...images, ...Array(8 - images.length).fill(null)].slice(0, 8));
      setLocalAvatarUri(null);
    }
  }, [profile, open]);

  // â”€â”€ Upload avatar image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const uploadAvatarFromUri = async (uri: string) => {
    if (!user || !firestore) return;
    setIsUploadingAvatar(true);
    try {
      const path = `users/${user.uid}/avatar_${Date.now()}.jpg`;
      const reference = rnfbStorage().ref(path);
      await reference.putFile(uri, { contentType: 'image/jpeg', cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await reference.getDownloadURL();

      const userRef = doc(firestore, 'users', user.uid);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      await setDoc(userRef, { avatarUrl: downloadURL, updatedAt: serverTimestamp() }, { merge: true });
      await setDoc(profileRef, { avatarUrl: downloadURL, updatedAt: serverTimestamp() }, { merge: true });
      setLocalAvatarUri(downloadURL);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const pickAvatarFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need gallery access to change your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadAvatarFromUri(result.assets[0].uri);
    }
  };

  const pickAvatarFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera access for a selfie.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadAvatarFromUri(result.assets[0].uri);
    }
  };

  const showAvatarOptions = () => {
    Alert.alert('Change Photo', 'Choose a source', [
      { text: 'Gallery', onPress: pickAvatarFromGallery },
      { text: 'Camera', onPress: pickAvatarFromCamera },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // â”€â”€ Upload space image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSpaceUpload = async (slotIndex: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.3,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    if (!user) return;

    setUploadingSlot(slotIndex);
    try {
      const uri = result.assets[0].uri;
      const path = `users/${user.uid}/space/img_${slotIndex}_${Date.now()}.jpg`;
      const reference = rnfbStorage().ref(path);
      await reference.putFile(uri, { contentType: 'image/jpeg', cacheControl: 'public, max-age=2592000, immutable' });
      const downloadURL = await reference.getDownloadURL();

      const newImages = [...spaceImages];
      newImages[slotIndex] = downloadURL;
      setSpaceImages(newImages);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.message || 'Could not upload image.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeSpaceImage = (index: number) => {
    const filled = spaceImages.filter((img) => img !== null);
    filled.splice(index, 1);
    setSpaceImages([...filled, ...Array(8 - filled.length).fill(null)]);
  };

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name is required.');
    if (!user || !firestore) return Alert.alert('Error', 'Please wait for the app to load and try again.');

    setIsSubmitting(true);
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const filteredSpaceImages = spaceImages.filter((img) => img !== null);

      const updateData: any = {
        username: name.trim(),
        bio: bio.trim(),
        birthday,
        whatsapp,
        showBirthday,
        showWhatsapp,
        spaceImages: filteredSpaceImages,
        updatedAt: serverTimestamp(),
      };
      if (country !== undefined) updateData.country = country;
      if (!isGenderFixed && gender) updateData.gender = gender;

      // Summary doc (fast sync for chat/rooms)
      await setDoc(
        userRef,
        { username: name.trim(), whatsapp, showWhatsapp, updatedAt: serverTimestamp() },
        { merge: true }
      );
      // Full profile doc
      await setDoc(profileRef, updateData, { merge: true });

      setOpen(false);
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAvatarUrl = localAvatarUri || profile?.avatarUrl;
  const filledSpaceImages = spaceImages.filter((img) => img !== null);

  return (
    <>
      {React.cloneElement(trigger as React.ReactElement<any>, { onPress: () => setOpen(true) })}

      <Modal visible={open} animationType="slide" statusBarTranslucent>
        {/* â”€â”€ Full-screen sheet â”€â”€ */}
        <View style={{ flex: 1, backgroundColor: 'white' }}>
          {/* Purple gradient top */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 140,
              backgroundColor: '#f3e8ff',
              zIndex: 0,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 52,
              paddingBottom: 12,
              zIndex: 10,
            }}
          >
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={{
                padding: 8,
                backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: 20,
              }}
            >
              <ChevronLeft size={22} color="#1e293b" />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 12,
                fontWeight: '900',
                color: '#0f172a',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Modify Persona
            </Text>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: '#8b5cf6',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1, zIndex: 5 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* â”€â”€ Avatar Section â”€â”€ */}
            <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 24 }}>
              <View style={{ position: 'relative' }}>
                <AvatarFrame
                  frameMediaUrl={profile?.inventory?.activeFrameMediaUrl}
                  size={120}
                >
                  {isUploadingAvatar ? (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ActivityIndicator color="white" />
                    </View>
                  ) : (
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(currentAvatarUrl) || 'https://picsum.photos/200' }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
                </AvatarFrame>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={pickAvatarFromGallery}
                  disabled={isUploadingAvatar}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: '#facc15',
                    gap: 6,
                  }}
                >
                  <Upload size={13} color="#78350f" strokeWidth={2.5} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#78350f', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Change Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={pickAvatarFromCamera}
                  disabled={isUploadingAvatar}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: '#ede9fe',
                    gap: 6,
                  }}
                >
                  <Camera size={13} color="#7c3aed" strokeWidth={2.5} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Camera
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* â”€â”€ Form Fields â”€â”€ */}
            {/* Name */}
            <FieldRow
              label="Tribe Display Name"
              right={
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '700',
                    color: name.length >= 24 ? '#ef4444' : '#cbd5e1',
                  }}
                >
                  {name.length}/24
                </Text>
              }
            >
              <TextInput
                value={name}
                onChangeText={(t) => setName(t.slice(0, 24))}
                placeholder="Enter your name"
                placeholderTextColor="#e2e8f0"
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#0f172a',
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                }}
              />
            </FieldRow>

            {/* Gender */}
            <FieldRow label="Gender">
              {isGenderFixed ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>
                    {gender === 'Female' ? `${String.fromCodePoint(0x2640)} Female` : `${String.fromCodePoint(0x2642)} Male`}
                  </Text>
                  <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Locked</Text>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 4, marginVertical: 4 }}>
                  <TouchableOpacity
                    onPress={() => setGender('Male')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: 'center',
                      borderRadius: 10,
                      backgroundColor: gender === 'Male' ? '#3b82f6' : 'transparent',
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: gender === 'Male' ? 'white' : '#94a3b8' }}>{String.fromCodePoint(0x2642)} Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setGender('Female')}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      alignItems: 'center',
                      borderRadius: 10,
                      backgroundColor: gender === 'Female' ? '#ec4899' : 'transparent',
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: gender === 'Female' ? 'white' : '#94a3b8' }}>{String.fromCodePoint(0x2640)} Female</Text>
                  </TouchableOpacity>
                </View>
              )}
            </FieldRow>

            {/* Birthday */}
            <FieldRow
              label="Birthday"
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Public View</Text>
                  <Switch
                    value={showBirthday}
                    onValueChange={setShowBirthday}
                    trackColor={{ false: '#e2e8f0', true: '#8b5cf6' }}
                    thumbColor="white"
                    style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                  />
                </View>
              }
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4, gap: 8 }}>
                <Calendar size={16} color="#cbd5e1" />
                <TextInput
                  value={birthday}
                  onChangeText={setBirthday}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#e2e8f0"
                  style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 }}
                />
              </View>
            </FieldRow>

            {/* Country */}
            <FieldRow label="Country / Region">
              <TouchableOpacity
                onPress={() => setCountryPickerOpen(true)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 10 }}
              >
                {selectedCountry ? (
                  <Text style={{ fontSize: 22 }}>{selectedCountry.flag}</Text>
                ) : (
                  <Globe size={18} color="#cbd5e1" />
                )}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: country ? '#0f172a' : '#e2e8f0',
                    flex: 1,
                  }}
                >
                  {country || 'Select Country'}
                </Text>
              </TouchableOpacity>
            </FieldRow>

            {/* WhatsApp */}
            <FieldRow
              label="WhatsApp ID"
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Public View</Text>
                  <Switch
                    value={showWhatsapp}
                    onValueChange={setShowWhatsapp}
                    trackColor={{ false: '#e2e8f0', true: '#8b5cf6' }}
                    thumbColor="white"
                    style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                  />
                </View>
              }
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4, gap: 8 }}>
                <Phone size={16} color="#cbd5e1" />
                <TextInput
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  placeholder="Enter WhatsApp Number"
                  placeholderTextColor="#e2e8f0"
                  keyboardType="phone-pad"
                  style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 }}
                />
              </View>
            </FieldRow>

            {/* Bio */}
            <FieldRow label="Personality Signature (Bio)">
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell your tribe about yourself..."
                placeholderTextColor="#e2e8f0"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: '#0f172a',
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  minHeight: 72,
                }}
              />
            </FieldRow>

            {/* â”€â”€ Space Background Slots â”€â”€ */}
            <View style={{ paddingTop: 20, paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Space Background ({filledSpaceImages.length}/8)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Info size={12} color="#cbd5e1" />
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#cbd5e1', textTransform: 'uppercase' }}>Auto-scrolling in profile</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {filledSpaceImages.map((url, i) => (
                  <View
                    key={i}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: '#f1f5f9',
                    }}
                  >
                    <Image cachePolicy="memory-disk" source={{ uri: toCDN(url!) }} style={{ width: '100%', height: '100%' }} />
                    <TouchableOpacity
                      onPress={() => removeSpaceImage(i)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <X size={11} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}

                {filledSpaceImages.length < 8 && (
                  <TouchableOpacity
                    onPress={() => handleSpaceUpload(filledSpaceImages.length)}
                    disabled={uploadingSlot !== null}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: '#a5f3fc',
                      backgroundColor: 'rgba(6,182,212,0.04)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {uploadingSlot !== null ? (
                      <ActivityIndicator size="small" color="#0ea5e9" />
                    ) : (
                      <Plus size={32} color="#67e8f9" strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Country picker modal */}
        <CountryPickerModal
          visible={countryPickerOpen}
          selectedCountry={country}
          onSelect={setCountry}
          onClose={() => setCountryPickerOpen(false)}
        />
      </Modal>
    </>
  );
};
