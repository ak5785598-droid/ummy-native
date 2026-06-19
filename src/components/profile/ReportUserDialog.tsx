import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

export const ReportUserDialog = ({ open, onOpenChange, targetUser }: any) => (
  <Modal visible={open} transparent animationType="slide">
    <View className="flex-1 bg-white pt-10 px-4">
      <Text className="text-black text-xl font-bold">Report User: {targetUser?.username}</Text>
      <TouchableOpacity onPress={() => onOpenChange(false)}><Text className="text-blue-500 mt-4">Close</Text></TouchableOpacity>
    </View>
  </Modal>
);
