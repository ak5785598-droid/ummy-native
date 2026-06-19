import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Send, X, ImageIcon, Loader } from 'lucide-react-native';

interface ChatInputDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
}

export function ChatInputDialog({ isVisible, onClose, onSend }: ChatInputDialogProps) {
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSend = () => {
    if (text.trim().length > 0) {
      onSend(text.trim());
      setText('');
      onClose();
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
      >
        <TouchableOpacity 
          className="absolute inset-0 bg-black/40" 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View className="bg-[#150029] flex-row items-center p-3 border-t border-white/10 gap-2">
          {/* Image Upload Button */}
          <TouchableOpacity 
            disabled={isUploading}
            onPress={() => {
              // Mock image upload trigger
              setIsUploading(true);
              setTimeout(() => setIsUploading(false), 2000);
            }}
            className="h-11 w-11 bg-white/10 rounded-full flex items-center justify-center border border-white/5 active:scale-90"
          >
            {isUploading ? <Loader color="white" size={20} className="animate-spin" /> : <ImageIcon color="rgba(255,255,255,0.7)" size={20} />}
          </TouchableOpacity>

          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder="Say something nice..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            className="flex-1 min-h-[44px] max-h-[120px] bg-white/10 rounded-2xl px-4 text-white text-[15px]"
            multiline
          />
          <TouchableOpacity 
            onPress={handleSend}
            disabled={text.trim().length === 0}
            className={`ml-2 h-11 w-11 rounded-full flex items-center justify-center ${
              text.trim().length > 0 ? 'bg-cyan-500' : 'bg-white/10'
            }`}
          >
            <Send color={text.trim().length > 0 ? "white" : "rgba(255,255,255,0.3)"} size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
