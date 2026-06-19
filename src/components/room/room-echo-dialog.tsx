import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Send, Bot } from 'lucide-react-native';
import { Image } from 'expo-image';

interface EchoMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isBot?: boolean;
}

interface RoomEchoDialogProps {
  visible: boolean;
  onClose: () => void;
  targetUser?: { uid: string; name: string; avatarUrl: string } | null;
}

export function RoomEchoDialog({ visible, onClose, targetUser }: RoomEchoDialogProps) {
  const [messages, setMessages] = useState<EchoMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible || !targetUser) return;
    setMessages([{
      id: 'welcome',
      sender: targetUser.name,
      text: `Hello! I am the AI Echo proxy for ${targetUser.name}. Since I am currently offline, feel free to talk to my AI Echo or leave a gift! How can I help you today? 💖`,
      timestamp: new Date(),
      isBot: true,
    }]);
  }, [visible, targetUser]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !targetUser) return;
    const userMsg: EchoMessage = { id: `user-${Date.now()}`, sender: 'You', text: inputText.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      const responses = [
        `That's sweet of you! 💕`,
        `I'll let ${targetUser.name} know when they're back!`,
        `Thanks for the message! I'm just an AI proxy for ${targetUser.name}.`,
        `Haha, that's funny! 😄`,
        `I wish I could answer that, but ${targetUser.name} would be better at it!`,
        `You can leave a gift for ${targetUser.name} if you'd like! 🎁`,
      ];
      const botMsg: EchoMessage = {
        id: `bot-${Date.now()}`, sender: targetUser.name,
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(), isBot: true,
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1000);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-slate-900 rounded-t-[2rem] h-[75%]">
          <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-white/10">
            <View className="flex-row items-center gap-2">
              {targetUser ? <Image cachePolicy="memory-disk" source={{ uri: targetUser.avatarUrl }} className="w-8 h-8 rounded-full bg-slate-700" /> : <Bot size={16} color="rgba(255,255,255,0.6)" />}
              <Text className="text-white text-base font-bold">{targetUser?.name || 'AI Echo'}</Text>
              <View className="bg-cyan-600/20 px-1.5 py-0.5 rounded-full"><Text className="text-cyan-300 text-[8px] font-bold">AI</Text></View>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1"><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
            <ScrollView ref={scrollRef} className="flex-1 px-4 py-2" showsVerticalScrollIndicator={false}>
              {messages.map(msg => (
                <View key={msg.id} className={`mb-3 ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}>
                  <View className="flex-row items-center gap-1 mb-0.5">
                    {msg.isBot && <Bot size={10} color="rgba(6,182,212,0.5)" />}
                    <Text className="text-white/30 text-[8px] font-bold uppercase">{msg.sender}</Text>
                  </View>
                  <View className={`rounded-2xl px-3 py-2 max-w-[80%] ${msg.sender === 'You' ? 'bg-purple-600' : 'bg-cyan-600/20 border border-cyan-600/30'}`}>
                    <Text className="text-white text-sm">{msg.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View className="flex-row items-center gap-2 px-4 py-3 border-t border-white/10">
              <TextInput value={inputText} onChangeText={setInputText} placeholder="Chat with AI Echo..." placeholderTextColor="rgba(255,255,255,0.3)" className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-white text-sm" />
              <TouchableOpacity onPress={handleSend} disabled={!inputText.trim()} className="bg-cyan-600 w-10 h-10 rounded-full items-center justify-center"><Send size={16} color="white" /></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}
