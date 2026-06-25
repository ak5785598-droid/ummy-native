import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ActivityIndicator, 
  StyleSheet, Alert, ScrollView 
} from 'react-native';
import { 
  Check, ShieldAlert, Palette, Home, Sparkles, Crown, 
  Heart, Zap, ShieldCheck, Wand2, Waves, Cloud, Monitor 
} from 'lucide-react-native';
import { useFirestore } from '../../firebase/provider';
import { doc, setDoc } from '@/firebase/firestore-compat';

const THEMES = [
  {
    key: 'CLASSIC',
    title: 'Classic System',
    description: 'Professional soft-light theme with slate accents and lavender highlights.',
    icon: Home,
    color: '#3b82f6',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  {
    key: 'STELLAR_PINK',
    title: 'Stellar Pink System',
    description: 'Vibrant immersive theme with signature pink backgrounds and futuristic neon accents.',
    icon: Sparkles,
    color: '#db2777',
    bgColor: '#fdf2f8',
    borderColor: '#fbcfe8',
  },
  {
    key: 'PURPLE_MAJESTY',
    title: 'Purple Majesty',
    description: 'Deep lavender tones and royal purple accents for a high-authority feel.',
    icon: Crown,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  {
    key: 'ROSE_GLOW',
    title: 'Rose Glow',
    description: 'Soft, romantic rose and white gradients with elegant pink highlights.',
    icon: Heart,
    color: '#f43f5e',
    bgColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  {
    key: 'GOLDEN_HOUR',
    title: 'Golden Hour',
    description: 'Warm sunset peach and soft orange glow for a vibrant, energetic vibe.',
    icon: Zap,
    color: '#d97706',
    bgColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  {
    key: 'MIDNIGHT_MAROON',
    title: 'Midnight Maroon',
    description: 'High-luxury deep dark red/maroon theme for the ultimate nocturnal elite.',
    icon: ShieldCheck,
    color: '#fda4af',
    bgColor: '#4c0519',
    borderColor: '#9f1239',
    dark: true,
  },
  {
    key: 'MAGENTA_FRENZY',
    title: 'Magenta Frenzy',
    description: 'High-intensity neon pink and fuchsia gradients for maximum pop.',
    icon: Wand2,
    color: '#c084fc',
    bgColor: '#fae8ff',
    borderColor: '#f5d0fe',
  },
  {
    key: 'OCEAN_VIOLET',
    title: 'Ocean Violet',
    description: 'Deep indigo and violet tones with a clean, airy background layout.',
    icon: Waves,
    color: '#4f46e5',
    bgColor: '#e0e7ff',
    borderColor: '#c7d2fe',
  },
  {
    key: 'SKY_LAVENDER',
    title: 'Sky Lavender',
    description: 'Soft airy lavender and pink tones for a gentle, calming experience.',
    icon: Cloud,
    color: '#a78bfa',
    bgColor: '#faf5ff',
    borderColor: '#f3e8ff',
  },
  {
    key: 'GLOSSY',
    title: 'Glossy Modern',
    description: 'Ultra-premium white/slate design system with glassmorphic depth and modern typography.',
    icon: Monitor,
    color: '#ffffff',
    bgColor: '#0f172a',
    borderColor: '#1e293b',
    dark: true,
  },
];

export function VisualIdentityTab() {
  const firestore = useFirestore();
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    const unsub = doc(firestore, 'system', 'config').onSnapshot(
      (snap: any) => {
        if (snap.exists) {
          setConfig(snap.data());
        }
        setIsLoading(false);
      },
      (err: any) => {
        console.warn('[VisualIdentity] Firestore error:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [firestore]);

  const selectTheme = async (themeKey: string) => {
    if (!firestore || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await setDoc(doc(firestore, 'system', 'config'), {
        appTheme: themeKey,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      Alert.alert('Theme Synchronized', `Global design system set to ${themeKey}`);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to update global theme configuration.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  const activeTheme = config?.appTheme || 'CLASSIC';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Theme & Visual Synchronizer 🎨</Text>
        <Text style={styles.subtitle}>
          Globally switch the application's design system between Classic and Modern styles.
        </Text>
      </View>

      <View style={styles.warningCard}>
        <ShieldAlert size={20} color="#b45309" />
        <Text style={styles.warningText}>
          Changing this setting will affect ALL users currently inside the application in real-time. This is a global synchronization event.
        </Text>
      </View>

      <View style={styles.themesGrid}>
        {THEMES.map((t) => {
          const isActive = activeTheme === t.key;
          const Icon = t.icon;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => selectTheme(t.key)}
              disabled={isUpdating}
              style={[
                styles.themeCard,
                isActive ? { borderColor: t.borderColor, backgroundColor: t.bgColor } : null,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: isActive ? '#fff' : '#f1f5f9' }]}>
                  <Icon size={20} color={t.color === '#ffffff' && !isActive ? '#475569' : t.color} />
                </View>
                {isActive && (
                  <View style={[styles.checkBadge, { backgroundColor: t.color === '#ffffff' ? '#0f172a' : t.color }]}>
                    <Check size={10} color="#fff" />
                  </View>
                )}
              </View>

              <Text style={[styles.themeTitle, t.dark && isActive ? styles.lightText : null]}>
                {t.title}
              </Text>
              <Text style={[styles.themeDesc, t.dark && isActive ? styles.dimText : null]}>
                {t.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isUpdating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Synchronizing design system globally...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  warningText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    textTransform: 'uppercase',
    lineHeight: 16,
  },
  themesGrid: {
    gap: 16,
  },
  themeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  themeDesc: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
    lineHeight: 16,
  },
  lightText: {
    color: '#fff',
  },
  dimText: {
    color: '#cbd5e1',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
