import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, Modal, KeyboardAvoidingView, Platform, StyleSheet, ScrollView, Keyboard } from 'react-native';
import { Send, X, Image as ImageIcon, Loader } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from '../../hooks/use-translation';
import { Image } from 'expo-image';

interface ChatInputBarProps {
  visible: boolean;
  onClose: () => void;
  onSend: (text: string, imageUrl?: string) => void;
  onImageUpload?: (uri: string) => Promise<string | null>;
  targetLanguage: string;
  sourceLanguage?: string;
  onSelectLanguage: (code: string) => void;
  onSelectSourceLanguage?: (code: string) => void;
}

const LANGUAGES = [
  // --- Indian Languages (Priority) ---
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'as', name: 'Assamese', flag: '🇮🇳' },
  { code: 'mai', name: 'Maithili', flag: '🇮🇳' },
  { code: 'sat', name: 'Santhali', flag: '🇮🇳' },
  { code: 'ks', name: 'Kashmiri', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
  { code: 'kok', name: 'Konkani', flag: '🇮🇳' },
  { code: 'sd', name: 'Sindhi', flag: '🇮🇳' },
  { code: 'doi', name: 'Dogri', flag: '🇮🇳' },
  { code: 'mni', name: 'Manipuri', flag: '🇮🇳' },
  { code: 'brx', name: 'Bodo', flag: '🇮🇳' },
  { code: 'sa', name: 'Sanskrit', flag: '🇮🇳' },
  { code: 'bho', name: 'Bhojpuri', flag: '🇮🇳' },
  { code: 'bgc', name: 'Haryanvi', flag: '🇮🇳' },
  { code: 'raj', name: 'Rajasthani', flag: '🇮🇳' },
  { code: 'mag', name: 'Magahi', flag: '🇮🇳' },
  { code: 'chg', name: 'Chhattisgarhi', flag: '🇮🇳' },
  { code: 'si', name: 'Sinhala', flag: '🇱🇰' },
  { code: 'dz', name: 'Dzongkha', flag: '🇧🇹' },

  // --- Global Languages ---
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'my', name: 'Burmese', flag: '🇲🇲' },
  { code: 'tl', name: 'Filipino', flag: '🇵🇭' },
  { code: 'km', name: 'Khmer', flag: '🇰🇭' },
  { code: 'lo', name: 'Lao', flag: '🇱🇦' },
  { code: 'kk', name: 'Kazakh', flag: '🇰🇿' },
  { code: 'uz', name: 'Uzbek', flag: '🇺🇿' },
  { code: 'az', name: 'Azerbaijani', flag: '🇦🇿' },
  { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
  { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
  { code: 'mn', name: 'Mongolian', flag: '🇲🇳' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
  { code: 'xh', name: 'Xhosa', flag: '🇿🇦' },
  { code: 'am', name: 'Amharic', flag: '🇪🇹' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'om', name: 'Oromo', flag: '🇪🇹' },
  { code: 'so', name: 'Somali', flag: '🇸🇴' },
  { code: 'ps', name: 'Pashto', flag: '🇦🇫' },
  { code: 'ku', name: 'Kurdish', flag: '🇹🇷' },
  { code: 'tt', name: 'Tatar', flag: '🇷🇺' },
  { code: 'ug', name: 'Uyghur', flag: '🇨🇳' },
  { code: 'ti', name: 'Tigrinya', flag: '🇪🇹' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'sq', name: 'Albanian', flag: '🇦🇱' },
  { code: 'mk', name: 'Macedonian', flag: '🇲🇰' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'is', name: 'Icelandic', flag: '🇮🇸' },
  { code: 'ga', name: 'Irish', flag: '🇮🇪' },
  { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'eu', name: 'Basque', flag: '🇪🇸' },
  { code: 'ca', name: 'Catalan', flag: '🇪🇸' },
  { code: 'gl', name: 'Galician', flag: '🇪🇸' },
];

const SOURCE_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
];

export function ChatInputBar({ visible, onClose, onSend, onImageUpload, targetLanguage, sourceLanguage, onSelectLanguage, onSelectSourceLanguage }: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSend = async () => {
    if (!text.trim() && !selectedImage) return;

    let imageUrl: string | undefined;
    
    if (selectedImage && onImageUpload) {
      setIsUploading(true);
      imageUrl = await onImageUpload(selectedImage) || undefined;
      setIsUploading(false);
    }

    onSend(text.trim(), imageUrl);
    setText('');
    setSelectedImage(null);
    handleClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Transparent backdrop layer */}
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1} 
          onPress={handleClose} 
        />
        
        <View style={styles.inputContainer}>
          {selectedImage && (
            <View style={styles.imageWrapper}>
              <Image cachePolicy="memory-disk" source={{ uri: selectedImage }} style={styles.previewImage} />
              <TouchableOpacity 
                onPress={() => setSelectedImage(null)}
                style={styles.removeImageBtn}
              >
                <X size={14} color="white" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity 
              onPress={handlePickImage}
              style={styles.iconCircle}
            >
              <ImageIcon size={18} color="#475569" />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={200}
              style={styles.textInput}
            />

            {/* Language Selection Trigger inside input box row */}
            <TouchableOpacity 
              onPress={() => setShowLangPicker(!showLangPicker)}
              style={styles.langBadgeBtn}
            >
              <Text style={styles.langBadgeText}>
                {(() => {
                  const lang = LANGUAGES.find(l => l.code === targetLanguage);
                  return lang ? `${lang.flag} ${lang.code.toUpperCase()}` : '🌐 EN';
                })()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleSend}
              disabled={isUploading || (!text.trim() && !selectedImage)}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: (text.trim() || selectedImage) && !isUploading ? '#06b6d4' : '#e2e8f0'
                }
              ]}
            >
              {isUploading ? (
                <Loader size={18} color="white" />
              ) : (
                <Send size={18} color={(text.trim() || selectedImage) ? 'white' : '#94a3b8'} />
              )}
            </TouchableOpacity>
          </View>

          {/* Inline Language Picker under input row */}
          {showLangPicker && (
            <View style={styles.langPickerArea}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Translate from:</Text>
                <TouchableOpacity onPress={() => setShowLangPicker(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
                {SOURCE_LANGUAGES.map(l => (
                  <TouchableOpacity 
                    key={l.code} 
                    onPress={() => onSelectSourceLanguage?.(l.code)} 
                    style={[
                      styles.langItemBtn,
                      { backgroundColor: (sourceLanguage || 'auto') === l.code ? '#06b6d4' : '#f1f5f9' }
                    ]}
                  >
                    <Text style={[styles.langItemText, { color: (sourceLanguage || 'auto') === l.code ? 'white' : '#475569' }]}>
                      {l.flag} {l.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={[styles.pickerHeader, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 }]}>
                <Text style={styles.pickerTitle}>Translate to:</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerScroll}>
                {LANGUAGES.map(l => (
                  <TouchableOpacity 
                    key={l.code} 
                    onPress={() => { onSelectLanguage(l.code); setShowLangPicker(false); }} 
                    style={[
                      styles.langItemBtn,
                      { backgroundColor: targetLanguage === l.code ? '#a855f7' : '#f1f5f9' }
                    ]}
                  >
                    <Text style={[styles.langItemText, { color: targetLanguage === l.code ? 'white' : '#475569' }]}>
                      {l.flag} {l.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  imageWrapper: {
    marginBottom: 8,
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#0f172a',
    fontSize: 14,
    maxHeight: 64,
  },
  langBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBadgeText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '950',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPickerArea: {
    marginTop: 10,
    borderTopWidth: 0.5,
    borderColor: '#e2e8f0',
    paddingTop: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pickerTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pickerDone: {
    color: '#a855f7',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pickerScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  langItemBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  langItemText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
