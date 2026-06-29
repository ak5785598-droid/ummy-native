import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { X, Camera, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useFirestore, useUser, useStorage, useDoc } from '../../firebase/provider';
import { collection, addDoc, serverTimestamp, doc } from '@/firebase/firestore-compat';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Image } from 'expo-image';
import { getLevelFromSpent } from '../../hooks/use-user-level';

interface PublishMomentProps {
  visible: boolean;
  onClose: () => void;
}

export function PublishMoment({ visible, onClose }: PublishMomentProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [uploading, setUploading] = useState(false);

  const profileRef = React.useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid, 'profile', user.uid);
  }, [firestore, user?.uid]);

  const { data: profile } = useDoc(profileRef);

  const handlePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.3,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
      });
    }
  };

  const handlePublish = async () => {
    if (!firestore || !user?.uid || !storage) return;
    if (!content.trim() && !selectedFile) return;

    setUploading(true);

    try {
      let mediaUrl = '';
      if (selectedFile) {
        const responseUser = await fetch(selectedFile.uri);
        const ext = selectedFile.uri.split('.').pop() || 'jpg';
        const subfolder = selectedFile.type === 'video' ? 'videos' : 'images';
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const fileRef = storageRef(storage, `moments/${user.uid}/${subfolder}/${filename}`);

        const blob = await responseUser.blob();
        await uploadBytes(fileRef, blob, { cacheControl: 'public, max-age=2592000, immutable' });
        mediaUrl = await getDownloadURL(fileRef);
      }

      const momentData: any = {
        userId: user.uid,
        username: profile?.username || user.displayName || 'Tribe Member',
        avatarUrl: profile?.avatarUrl || user.photoURL || '',
        userLevel: getLevelFromSpent(profile?.wallet?.totalSpent || 0),
        userCountry: profile?.country || 'IN',
        content: content.trim(),
        type: selectedFile?.type || 'image',
        likes: 0,
        views: 0,
        reach: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      };

      if (selectedFile?.type === 'video') {
        momentData.videoUrl = mediaUrl;
      } else if (mediaUrl) {
        momentData.imageUrl = mediaUrl;
      }

      await addDoc(collection(firestore, 'moments'), momentData);

      setContent('');
      setSelectedFile(null);
      onClose();
    } catch (e) {
      console.error('[PublishMoment] Error:', e);
    }
    setUploading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[2.5rem] min-h-[60vh]">
          <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
            <Text className="text-xl font-bold text-slate-800">New Moment</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-slate-100 rounded-full">
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6 flex-1" showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              onPress={handlePick}
              className={`aspect-square rounded-2xl border-2 border-dashed items-center justify-center mb-4 ${
                selectedFile ? 'border-purple-400 bg-purple-50' : 'border-slate-300 bg-slate-50'
              }`}
            >
              {selectedFile ? (
                <View className="w-full h-full relative">
                  {selectedFile.type === 'video' ? (
                    <Image cachePolicy="memory-disk" source={{ uri: selectedFile.uri }} className="w-full h-full rounded-2xl" contentFit="cover" />
                  ) : (
                    <Image cachePolicy="memory-disk" source={{ uri: selectedFile.uri }} className="w-full h-full rounded-2xl" contentFit="cover" />
                  )}
                  <TouchableOpacity
                    onPress={() => setSelectedFile(null)}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full items-center justify-center"
                  >
                    <Trash2 size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="items-center">
                  <Camera size={36} color="#94a3b8" />
                  <Text className="text-slate-400 text-sm mt-2 font-medium">Tap to add photo/video</Text>
                  <Text className="text-slate-300 text-[10px] mt-1">Max 5MB image, 15MB video</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="What's on your mind?"
              placeholderTextColor="#94a3b8"
              multiline
              className="bg-slate-50 rounded-2xl px-4 py-3 text-base text-slate-800 min-h-[100px] mb-4"
              maxLength={500}
            />

            <TouchableOpacity
              onPress={handlePublish}
              disabled={uploading || (!content.trim() && !selectedFile)}
              className="mb-8"
            >
              <LinearGradient
                colors={(content.trim() || selectedFile) ? ['#8b5cf6', '#ec4899'] : ['#cbd5e1', '#94a3b8']}
                className="rounded-2xl py-4 items-center"
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Broadcast</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
