import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label ? (
        <Text className="text-sm font-medium text-slate-700 mb-1.5">{label}</Text>
      ) : null}
      <TextInput
        className={`bg-slate-50 border ${error ? 'border-red-500' : 'border-slate-200'} rounded-xl px-4 py-3.5 text-base text-slate-900 ${className}`}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error ? (
        <Text className="text-xs text-red-500 mt-1.5">{error}</Text>
      ) : null}
    </View>
  );
}
