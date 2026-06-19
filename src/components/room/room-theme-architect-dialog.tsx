import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { X, Sparkles, Palette } from 'lucide-react-native';
import { useFirestore } from '../../firebase/provider';
import { doc, updateDoc } from '@/firebase/firestore-compat';

interface RoomThemeArchitectDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  isOwner: boolean;
}

const THEME_ARCH_API = 'https://api.ummylive.com/ai/theme-architect';

export function RoomThemeArchitectDialog({ visible, onClose, roomId, isOwner }: RoomThemeArchitectDialogProps) {
  const firestore = useFirestore();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ url?: string; accentColor?: string; animationId?: string } | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim() || !isOwner) return;
    setGenerating(true); setError(''); setResult(null);
    try {
      const res = await fetch(THEME_ARCH_API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), roomId }),
      });
      if (!res.ok) { setError('Failed to generate theme'); return; }
      const data = await res.json();
      setResult({ url: data.url, accentColor: data.accentColor, animationId: data.animationId });

      if (firestore && data.url) {
        await updateDoc(doc(firestore, 'chatRooms', roomId), {
          backgroundUrl: data.url,
          roomThemeId: data.themeId || null,
          accentColor: data.accentColor || null,
        });
      }
    } catch {
      setError('Network error. Try again.');
    }
    setGenerating(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-[2rem] pb-6">
          <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-white/10">
            <View className="flex-row items-center gap-2"><Palette size={16} color="rgba(255,255,255,0.6)" /><Text className="text-white text-base font-bold">AI Theme Architect</Text></View>
            <TouchableOpacity onPress={onClose} className="p-1"><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
          </View>
          <ScrollView className="px-6 pt-4" showsVerticalScrollIndicator={false}>
            <Text className="text-white/50 text-xs mb-1">Describe your dream room theme...</Text>
            <TextInput value={prompt} onChangeText={setPrompt} placeholder="e.g., A neon cyberpunk city with purple rain and pink aurora sky" placeholderTextColor="rgba(255,255,255,0.3)" className="bg-white/10 rounded-xl px-4 py-3 text-white text-sm min-h-[80px]" multiline />
            <TouchableOpacity onPress={handleGenerate} disabled={!prompt.trim() || generating || !isOwner} className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full py-3 items-center mt-3 flex-row justify-center gap-2">
              {generating ? <ActivityIndicator color="white" size="small" /> : <Sparkles size={16} color="white" />}
              <Text className="text-white font-bold text-sm">{generating ? 'Generating...' : 'Generate Theme'}</Text>
            </TouchableOpacity>
            {error ? <Text className="text-red-400 text-xs mt-2">{error}</Text> : null}
            {result ? (
              <View className="bg-white/5 rounded-xl p-4 mt-4 border border-white/10">
                <Text className="text-emerald-400 text-xs font-bold uppercase mb-2">✨ Theme Generated!</Text>
                <Text className="text-white/70 text-xs">Applied to room successfully.</Text>
                {result.accentColor && <View className="flex-row items-center mt-2"><View className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: result.accentColor }} /><Text className="text-white/50 text-[10px]">{result.accentColor}</Text></View>}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
