import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, ActivityIndicator } from 'react-native';

export interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  isLoading?: boolean;
}

export function Button({ title, isLoading, className, children, ...props }: ButtonProps) {
  return (
    <TouchableOpacity
      className={`bg-primary rounded-xl h-12 flex-row items-center justify-center ${className || ''}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <ActivityIndicator color="white" /> : children || <Text className="text-white font-bold text-base">{title}</Text>}
    </TouchableOpacity>
  );
}
