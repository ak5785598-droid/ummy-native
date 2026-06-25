import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Switch, Dimensions } from 'react-native';
import { ChevronLeft, ChevronRight, Camera, Mic, Settings, Check } from 'lucide-react-native';
import { ROOM_THEMES, RoomTheme } from '../lib/themes';
import { Image } from 'expo-image';

interface RoomSettingsDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onLeave: () => void;
  onSelectTheme?: (url: string) => void;
}

const SettingItem = ({ label, value, extra, onClick, showChevron = true, children, noBorder = false }: any) => (
  <TouchableOpacity 
    onPress={onClick}
    disabled={!onClick}
    className={`flex-row items-center justify-between px-6 py-4 bg-white active:bg-gray-50 ${!noBorder ? 'border-b border-gray-100' : ''}`}
  >
    <View className="flex-row items-center">
      <Text className="font-bold text-[14px] text-gray-800 uppercase tracking-tight">{label}</Text>
    </View>
    <View className="flex-row items-center">
      {children ? children : (
        <>
          {value && <Text className="text-xs font-bold text-gray-400 max-w-[120px] mr-2" numberOfLines={1}>{value}</Text>}
          {extra && <Text className="text-xs font-bold text-gray-400 mr-2">{extra}</Text>}
          {showChevron && <ChevronRight color="#D1D5DB" size={16} />}
        </>
      )}
    </View>
  </TouchableOpacity>
);

export function RoomSettingsDialog({ isVisible, onClose, onLeave, onSelectTheme }: RoomSettingsDialogProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingTheme, setIsEditingTheme] = useState(false);
  
  const [roomName, setRoomName] = useState("Public Room");
  const [announcement, setAnnouncement] = useState("");
  const [password, setPassword] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState(ROOM_THEMES[0].id);
  
  const [isAIVoiceEnabled, setIsAIVoiceEnabled] = useState(false);
  const [isAIListening, setIsAIListening] = useState(false);
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(false);
  const [isSuperGlow, setIsSuperGlow] = useState(true);

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        
        {/* Header */}
        <View className="px-6 pt-12 pb-4 border-b border-gray-100 flex-row items-center justify-between bg-white z-10">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2 rounded-full active:bg-gray-100">
            <ChevronLeft color="#4B5563" size={24} />
          </TouchableOpacity>
          <Text className="text-base font-black uppercase tracking-tighter text-black">Settings</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
          <View className="pb-10">
            
            {/* Profile Edit */}
            <SettingItem label="Profile" onClick={() => {}} className="py-2">
              <View className="relative">
                <View className="h-16 w-16 rounded-xl border-2 border-slate-100 shadow-sm overflow-hidden bg-slate-50 items-center justify-center">
                  <Text className="text-xl font-bold text-gray-400">P</Text>
                </View>
                <View className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-lg border border-gray-100">
                  <Camera color="#9CA3AF" size={12} />
                </View>
              </View>
              <ChevronRight color="#D1D5DB" size={16} className="ml-2" />
            </SettingItem>

            <SettingItem label="Room Name" value={roomName} onClick={() => setIsEditingName(true)} />
            <SettingItem label="Announcement" value={announcement || 'None'} onClick={() => setIsEditingAnnouncement(true)} />
            
            <SettingItem label="Microphone Test" onClick={() => {}}>
              <Mic color="#9CA3AF" size={16} />
            </SettingItem>

            <SettingItem label="AI Voice Assistant" showChevron={false}>
              <Switch value={isAIVoiceEnabled} onValueChange={setIsAIVoiceEnabled} trackColor={{ false: '#E5E7EB', true: '#10B981' }} />
            </SettingItem>

            <SettingItem label="AI Listen" showChevron={false}>
              <View className="items-end">
                <Switch value={isAIListening} onValueChange={setIsAIListening} trackColor={{ false: '#E5E7EB', true: '#10B981' }} />
                <Text className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Bolo, AI Sunt Hai</Text>
              </View>
            </SettingItem>

            <SettingItem label="Voice Captions" showChevron={false}>
              <View className="items-end">
                <Switch value={isCaptionsEnabled} onValueChange={setIsCaptionsEnabled} trackColor={{ false: '#E5E7EB', true: '#10B981' }} />
                <Text className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Live Subtitles</Text>
              </View>
            </SettingItem>

            <SettingItem label="Super Glow Mode" showChevron={false}>
              <View className="flex-row items-center">
                <Text className="text-[10px] font-bold text-yellow-500 mr-2">PRO</Text>
                <Switch value={isSuperGlow} onValueChange={setIsSuperGlow} trackColor={{ false: '#E5E7EB', true: '#EAB308' }} />
              </View>
            </SettingItem>

            <SettingItem label="Number of Mic" value="9 Seats" onClick={() => {}} />
            
            <SettingItem label="Room Password" value={password ? 'Active' : 'Off'} onClick={() => setIsEditingPassword(true)} />
            
            <SettingItem 
              label="Room Theme" 
              value={ROOM_THEMES.find(t => t.id === selectedThemeId)?.name || "Default"} 
              onClick={() => setIsEditingTheme(true)} 
            />
            
            <SettingItem label="AI Theme Architect" onClick={() => {}}>
              <Text className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">AI GENERATE ✨</Text>
            </SettingItem>
            
            <SettingItem label="Room Tag" value="Chat" onClick={() => {}} />
            <SettingItem label="Administrators" onClick={() => {}} />

            {/* Leave Room (Native Addition for easy exit) */}
            <TouchableOpacity 
              className="mt-6 mx-6 p-4 bg-red-50 rounded-2xl items-center border border-red-100"
              onPress={() => {
                onClose();
                onLeave();
              }}
            >
              <Text className="text-red-500 font-bold uppercase tracking-wider text-sm">Exit Room</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>

      {/* SUB-MODAL: Edit Room Name */}
      <Modal visible={isEditingName} animationType="slide" transparent={true}>
        <View className="flex-1 bg-white">
          <View className="px-6 pt-12 pb-4 border-b border-gray-100 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => setIsEditingName(false)} className="p-2 -ml-2 rounded-full active:bg-gray-100">
              <ChevronLeft color="#4B5563" size={24} />
            </TouchableOpacity>
            <Text className="font-bold uppercase text-lg tracking-tight text-black">Room Name</Text>
            <TouchableOpacity onPress={() => setIsEditingName(false)}>
              <Text className="text-blue-500 font-bold uppercase text-sm tracking-wider px-2">Save</Text>
            </TouchableOpacity>
          </View>
          <View className="p-6">
            <TextInput 
              value={roomName}
              onChangeText={setRoomName}
              className="h-14 bg-gray-50 rounded-xl px-4 font-bold text-black border border-gray-200"
              autoFocus
            />
          </View>
        </View>
      </Modal>

      {/* SUB-MODAL: Edit Announcement */}
      <Modal visible={isEditingAnnouncement} animationType="slide" transparent={true}>
        <View className="flex-1 bg-white">
          <View className="px-6 pt-12 pb-4 border-b border-gray-100 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => setIsEditingAnnouncement(false)} className="p-2 -ml-2 rounded-full active:bg-gray-100">
              <ChevronLeft color="#4B5563" size={24} />
            </TouchableOpacity>
            <Text className="font-bold uppercase text-lg tracking-tight text-black">Announcement</Text>
            <TouchableOpacity onPress={() => setIsEditingAnnouncement(false)}>
              <Text className="text-blue-500 font-bold uppercase text-sm tracking-wider px-2">Save</Text>
            </TouchableOpacity>
          </View>
          <View className="p-6">
            <TextInput 
              value={announcement}
              onChangeText={setAnnouncement}
              placeholder="Write a welcome message..."
              multiline
              textAlignVertical="top"
              className="h-40 bg-gray-50 rounded-xl p-4 font-bold text-black border border-gray-200"
              autoFocus
            />
          </View>
        </View>
      </Modal>

      {/* SUB-MODAL: Edit Password */}
      <Modal visible={isEditingPassword} animationType="slide" transparent={true}>
        <View className="flex-1 bg-white">
          <View className="px-6 pt-12 pb-4 border-b border-gray-100 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => setIsEditingPassword(false)} className="p-2 -ml-2 rounded-full active:bg-gray-100">
              <ChevronLeft color="#4B5563" size={24} />
            </TouchableOpacity>
            <Text className="font-bold uppercase text-lg tracking-tight text-black">Privacy Code</Text>
            <TouchableOpacity onPress={() => setIsEditingPassword(false)}>
              <Text className="text-blue-500 font-bold uppercase text-sm tracking-wider px-2">Save</Text>
            </TouchableOpacity>
          </View>
          <View className="p-8 flex-col gap-4">
            <TextInput 
              value={password}
              onChangeText={(text) => setPassword(text.replace(/[^0-9]/g, ''))}
              placeholder="0000"
              maxLength={4}
              keyboardType="number-pad"
              className="h-20 rounded-xl border-2 border-gray-200 text-4xl font-bold tracking-[1em] text-center text-black"
              autoFocus
            />
            <Text className="text-xs font-bold text-gray-400 text-center uppercase tracking-wider">
              Enter 4 digits to lock your room
            </Text>
          </View>
        </View>
      </Modal>

      {/* SUB-MODAL: Select Theme */}
      <Modal visible={isEditingTheme} animationType="slide" transparent={true}>
        <View className="flex-1 bg-white">
          <View className="px-6 pt-12 pb-4 border-b border-gray-100 flex-row items-center justify-between z-10 bg-white">
            <TouchableOpacity onPress={() => setIsEditingTheme(false)} className="p-2 -ml-2 rounded-full active:bg-gray-100">
              <ChevronLeft color="#4B5563" size={24} />
            </TouchableOpacity>
            <Text className="font-bold uppercase text-lg tracking-tight text-black">Room Theme</Text>
            <View className="w-10" />
          </View>
          
          <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap justify-between pb-10">
              {ROOM_THEMES.map((theme: RoomTheme) => (
                <TouchableOpacity
                  key={theme.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedThemeId(theme.id);
                    if (onSelectTheme) {
                      onSelectTheme(theme.url);
                    }
                    setIsEditingTheme(false);
                  }}
                  className={`w-[48%] mb-4 rounded-xl overflow-hidden border-2 ${
                    selectedThemeId === theme.id ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <View className="h-40 bg-gray-200">
                    <Image cachePolicy="memory-disk" source={{ uri: theme.url.startsWith('http') ? theme.url : `https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2000` }} 
                      className="w-full h-full"
                      contentFit="cover"
                    />
                    {selectedThemeId === theme.id && (
                      <View className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <View className="bg-blue-500 p-2 rounded-full">
                          <Check color="white" size={20} />
                        </View>
                      </View>
                    )}
                  </View>
                  <View className="p-2 bg-gray-50 border-t border-gray-100">
                    <Text className="font-bold text-xs text-gray-800 uppercase" numberOfLines={1}>{theme.name}</Text>
                    <Text className="text-[10px] text-gray-500 mt-1 capitalize">{theme.category}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

    </Modal>
  );
}
