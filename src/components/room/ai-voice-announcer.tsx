import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import * as Speech from 'expo-speech';

interface Announcement {
  id: string;
  text: string;
  lang?: string;
  type?: 'loot' | 'welcome' | 'gift' | 'system';
}

interface AiVoiceAnnouncerProps {
  enabled: boolean;
  language?: 'hi' | 'en';
  announcements?: Announcement[];
}

export function AiVoiceAnnouncer({ enabled, language = 'hi', announcements = [] }: AiVoiceAnnouncerProps) {
  const queueRef = useRef<Announcement[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const speakingRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!announcements?.length) return;
    announcements.forEach(a => {
      if (!queueRef.current.find(q => q.id === a.id)) {
        queueRef.current.push(a);
      }
    });
    processQueue();
  }, [announcements]);

  const processQueue = async () => {
    if (speakingRef.current || queueRef.current.length === 0) return;
    speakingRef.current = true;
    const ann = queueRef.current.shift()!;
    setCurrentAnnouncement(ann);

    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    if (enabled) {
      try {
        const phoneticText = ann.text
          .replace(/🏆/g, '')
          .replace(/🎉/g, '')
          .replace(/💖/g, '')
          .replace(/👏/g, '')
          .trim();
        await Speech.speak(phoneticText, { language: ann.lang || language, pitch: 1.0, rate: 0.85 });
      } catch {}
    }

    await new Promise(r => setTimeout(r, 2000));

    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 100, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      setCurrentAnnouncement(null);
      speakingRef.current = false;
      processQueue();
    });
  };

  return null;
}
