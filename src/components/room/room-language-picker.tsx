import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Languages, ArrowRight } from 'lucide-react-native';
import { SOURCE_LANGUAGES } from '../../hooks/use-translation';

const TARGET_LANGUAGES = [
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
];

interface RoomLanguagePickerProps {
  visible: boolean;
  onClose: () => void;
  sourceLanguage?: string;
  targetLanguage?: string;
  onSelectSourceLanguage?: (code: string) => void;
  onSelectLanguage: (code: string) => void;
}

export function RoomLanguagePicker({ visible, onClose, sourceLanguage, targetLanguage, onSelectSourceLanguage, onSelectLanguage }: RoomLanguagePickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#0f172a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Languages size={16} color="rgba(255,255,255,0.6)" />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Translate</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ paddingHorizontal: 16, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Translate from</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {SOURCE_LANGUAGES.map(l => (
                <TouchableOpacity key={l.code} onPress={() => onSelectSourceLanguage?.(l.code)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: sourceLanguage === l.code ? '#a855f7' : 'rgba(255,255,255,0.1)', backgroundColor: sourceLanguage === l.code ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)' }}>
                  <Text style={{ marginRight: 6 }}>{l.flag}</Text>
                  <Text style={{ color: sourceLanguage === l.code ? 'white' : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 }}>Translate to</Text>
              <ArrowRight size={12} color="rgba(255,255,255,0.3)" />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TARGET_LANGUAGES.map(l => (
                <TouchableOpacity key={l.code} onPress={() => { onSelectLanguage(l.code); onClose(); }} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: targetLanguage === l.code ? '#a855f7' : 'rgba(255,255,255,0.1)', backgroundColor: targetLanguage === l.code ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)' }}>
                  <Text style={{ marginRight: 6 }}>{l.flag}</Text>
                  <Text style={{ color: targetLanguage === l.code ? 'white' : 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
