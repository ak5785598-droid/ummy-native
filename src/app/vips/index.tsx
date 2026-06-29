import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Dimensions, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Crown, 
  Star, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Lock, 
  Settings, 
  HelpCircle, 
  EyeOff, 
  UserCheck, 
  Volume2, 
  MessageSquare, 
  Gift, 
  Compass, 
  Users, 
  ShieldAlert, 
  Award,
  Heart,
  Flame,
  Key,
  CheckCircle,
  Gem,
  Radio
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser, useFirestore } from '../../firebase/provider';
import { useUserProfile } from '../../hooks/use-user-profile';
import { doc, onSnapshot, updateDoc, increment, writeBatch, serverTimestamp, getDoc } from '@/firebase/firestore-compat';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { toCDN } from '@/lib/cdn';

const { width } = Dimensions.get('window');

// --- DATA STRUCTURES ---
const SVIP_LEVELS_DATA = [
  { level: 1, name: 'SVIP 1', points: '1.5M', exp: 1500000, validity: '7 Days', maintPoints: '375K', maintExp: 375000, theme: 'owl' },
  { level: 2, name: 'SVIP 2', points: '3.0M', exp: 3000000, validity: '7 Days', maintPoints: '375K', maintExp: 375000, theme: 'owl' },
  { level: 3, name: 'SVIP 3', points: '6.25M', exp: 6250000, validity: '15 Days', maintPoints: '1.25M', maintExp: 1250000, theme: 'owl' },
  { level: 4, name: 'SVIP 4', points: '12.5M', exp: 12500000, validity: '15 Days', maintPoints: '1.25M', maintExp: 1250000, theme: 'owl' },
  { level: 5, name: 'SVIP 5', points: '25.0M', exp: 25000000, validity: '15 Days', maintPoints: '1.25M', maintExp: 1250000, theme: 'owl' },
  { level: 6, name: 'SVIP 6', points: '50.0M', exp: 50000000, validity: '15 Days', maintPoints: '1.25M', maintExp: 1250000, theme: 'owl' },
  { level: 7, name: 'SVIP 7', points: '75.0M', exp: 75000000, validity: '30 Days', maintPoints: '5.0M', maintExp: 5000000, theme: 'wolf' },
  { level: 8, name: 'SVIP 8', points: '100.0M', exp: 100000000, validity: '30 Days', maintPoints: '5.0M', maintExp: 5000000, theme: 'wolf' },
  { level: 9, name: 'SVIP 9', points: '150.0M', exp: 150000000, validity: '30 Days', maintPoints: '5.0M', maintExp: 5000000, theme: 'wolf' },
  { level: 10, name: 'SVIP 10', points: '200.0M', exp: 200000000, validity: '30 Days', maintPoints: '5.0M', maintExp: 5000000, theme: 'wolf' },
  { level: 11, name: 'SVIP 11', points: '275.0M', exp: 275000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 12, name: 'SVIP 12', points: '350.0M', exp: 350000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 13, name: 'SVIP 13', points: '425.0M', exp: 425000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 14, name: 'SVIP 14', points: '500.0M', exp: 500000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 15, name: 'SVIP 15', points: '575.0M', exp: 575000000, validity: '45 Days', maintPoints: '20.0M', maintExp: 20000000, theme: 'lion' },
  { level: 16, name: 'SVIP 16', points: '650.0M', exp: 650000000, validity: '60 Days', maintPoints: '100.0M', maintExp: 100000000, theme: 'dragon' },
  { level: 17, name: 'SVIP 17', points: '700.0M', exp: 700000000, validity: '60 Days', maintPoints: '100.0M', maintExp: 100000000, theme: 'dragon' },
  { level: 18, name: 'SVIP 18', points: '750.0M', exp: 750000000, validity: '60 Days', maintPoints: '100.0M', maintExp: 100000000, theme: 'dragon' },
];

const SVIP_PRIVILEGES_DATA = [
  { id: 1, name: 'SVIP Badge', desc: 'Premium level status marker', level: 1, icon: Award, category: 'Identity' },
  { id: 2, name: 'Silver-Wing Frame', desc: 'Noble Owl Avatar frame decoration', level: 1, icon: Crown, category: 'Identity' },
  { id: 3, name: 'Owl Chat Bubble', desc: 'Distinctive blue message border', level: 2, icon: MessageSquare, category: 'Interaction' },
  { id: 4, name: 'Entering Sound', desc: 'Audio sound wave chime on room entry', level: 2, icon: Volume2, category: 'VFX' },
  { id: 5, name: 'Golden Wave Mic', desc: 'Gilded mic waves in rooms', level: 3, icon: Radio, category: 'Interaction' },
  { id: 6, name: 'Silver Greeting Card', desc: 'Gleaming Owl entry greeting card', level: 4, icon: ShieldAlert, category: 'VFX' },
  { id: 7, name: 'Owl Portal Ride', desc: 'Animated Owl flight entry ride', level: 4, icon: Compass, category: 'VFX' },
  { id: 8, name: 'Mysterious Visitor', desc: 'Visit profiles with 100% stealth', level: 5, icon: EyeOff, category: 'Stealth' },
  { id: 9, name: 'Exclusive Owl Gift', desc: 'Unlock Owl core token gifting item', level: 5, icon: Gift, category: 'Gifts' },
  { id: 10, name: 'Weekly Coin Rebate', desc: 'Daily claimable coin multiplier bonuses', level: 6, icon: Zap, category: 'Rebates' },
  { id: 11, name: 'Wolf Velvet Frame', desc: 'Dark purple neon wolf border decoration', level: 7, icon: Crown, category: 'Identity' },
  { id: 12, name: 'Hide Gift Record', desc: 'Stealthily receive/send without record', level: 8, icon: Lock, category: 'Stealth' },
  { id: 13, name: 'Purple Crescent Ride', desc: 'Hovering moon ride portal entrance', level: 8, icon: Compass, category: 'VFX' },
  { id: 14, name: 'Rank Hiding', desc: 'Become completely invisible on charts', level: 9, icon: UserCheck, category: 'Stealth' },
  { id: 15, name: 'Wolf Neon Bubble', desc: 'Luminous violet chat bubble border', level: 9, icon: MessageSquare, category: 'Interaction' },
  { id: 16, name: 'Private Space Album', desc: 'Hidden album with access key control', level: 10, icon: Key, category: 'Interaction' },
  { id: 17, name: 'Fiery Lion Frame', desc: 'Solar ruby-red fiery card outline', level: 11, icon: Crown, category: 'Identity' },
  { id: 18, name: 'Lion Crimson Nameplate', desc: 'Stand out with bold red nameplate text', level: 11, icon: Flame, category: 'Identity' },
  { id: 19, name: 'Room Stealth Entry', desc: 'Enter any chatroom in absolute silence', level: 12, icon: EyeOff, category: 'Stealth' },
  { id: 20, name: 'Lion Portal Ride', desc: 'Fiery solar lion chariot entry portal', level: 12, icon: Compass, category: 'VFX' },
  { id: 21, name: 'Absolute Kick Immunity', desc: 'Immunity against all kicks & bans', level: 13, icon: ShieldCheck, category: 'Stealth' },
  { id: 22, name: 'Lion Crimson Bubble', desc: 'Glowing crimson flame chat outline', level: 14, icon: MessageSquare, category: 'Interaction' },
  { id: 23, name: 'CP Room Decoration', desc: 'Custom themed luxury CP room design', level: 14, icon: Heart, category: 'Interaction' },
  { id: 24, name: 'Custom Micro-Badge', desc: 'Personalized mini icon next to name', level: 15, icon: Award, category: 'Identity' },
  { id: 25, name: 'Obsidian Dragon Frame', desc: 'Cosmic scale dragon wings ornament', level: 16, icon: Crown, category: 'Identity' },
  { id: 26, name: 'Dragon Flight Ride', desc: 'Grand majestic dragon mount ride VFX', level: 16, icon: Compass, category: 'VFX' },
  { id: 27, name: 'Diamond Conversion Buff', desc: 'Higher limit for coin-to-diamond swaps', level: 17, icon: Gem, category: 'Rebates' },
  { id: 28, name: 'VIP Liaison Officer', desc: '24/7 dedicated support representative', level: 17, icon: Users, category: 'Interaction' },
  { id: 29, name: 'Imperial Dragon Bubble', desc: 'Dragon scales neon border overlay', level: 18, icon: MessageSquare, category: 'Interaction' },
  { id: 30, name: 'Global Server Broadcast', desc: 'Announce presence to all rooms globally', level: 18, icon: Radio, category: 'VFX' },
  { id: 31, name: 'Infinite Validity Lock', desc: 'Never downgrade; level locked forever', level: 18, icon: Crown, category: 'Rebates' },
];

// ─────────────────────────────────────────────────────────────
// BackgroundMascot — Full-screen top backdrop mascot per theme
// Same animation quality as the original Owl backdrop
// ─────────────────────────────────────────────────────────────
const BackgroundMascot = ({ theme }: { theme: string }) => {
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim   = useRef(new Animated.Value(1)).current;
  const flutterAnim = useRef(new Animated.Value(0)).current; // wings/ears/mane
  const glowAnim    = useRef(new Animated.Value(0.5)).current; // eye/fire glow

  useEffect(() => {
    breatheAnim.setValue(0); blinkAnim.setValue(1);
    flutterAnim.setValue(0); glowAnim.setValue(0.5);

    // Body float
    Animated.loop(Animated.sequence([
      Animated.timing(breatheAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(breatheAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ])).start();

    // Wing/ear/mane flutter
    Animated.loop(Animated.sequence([
      Animated.timing(flutterAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(flutterAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    // Eye/fire glow pulse
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
    ])).start();

    // Periodic blink
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.05, duration: 110, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,    duration: 110, useNativeDriver: true }),
      ]).start();
    }, 4000);

    return () => clearInterval(blinkInterval);
  }, [theme]);

  if (theme === 'owl') return (
    <Animated.View style={{
      position: 'absolute', top: 40, left: 0, right: 0, height: 400,
      alignItems: 'center', opacity: 0.75,
      transform: [{ translateY: breatheAnim.interpolate({ inputRange: [0,1], outputRange: [0,-8] }) }]
    }}>
      <View style={{ width: 380, height: 400, justifyContent: 'center', alignItems: 'center' }}>
        {/* Left wing */}
        <Animated.View style={{ position:'absolute', left:0, top:0, width:190, height:400, transformOrigin:[190,290,0],
          transform:[{ rotate: flutterAnim.interpolate({ inputRange:[0,1], outputRange:['0deg','-8deg'] }) }] }}>
          <Svg width="190" height="400" viewBox="0 0 180 380">
            <Defs><SvgLinearGradient id="bgOwlWL" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#4f46e5" stopOpacity="0.9"/>
              <Stop offset="70%" stopColor="#818cf8" stopOpacity="0.6"/>
              <Stop offset="100%" stopColor="#d946ef" stopOpacity="0.25"/>
            </SvgLinearGradient></Defs>
            <Path d="M 180 280 C 130 260, 50 180, 20 120 C 60 120, 110 160, 150 200 C 110 170, 70 110, 40 70 C 80 80, 120 120, 160 170 C 130 120, 100 60, 80 20 C 120 40, 150 90, 170 150 C 175 110, 178 50, 180 0 Z" fill="url(#bgOwlWL)" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.5"/>
          </Svg>
        </Animated.View>
        {/* Right wing */}
        <Animated.View style={{ position:'absolute', right:0, top:0, width:190, height:400, transformOrigin:[0,290,0],
          transform:[{ rotate: flutterAnim.interpolate({ inputRange:[0,1], outputRange:['0deg','8deg'] }) }] }}>
          <Svg width="190" height="400" viewBox="180 0 180 380">
            <Defs><SvgLinearGradient id="bgOwlWR" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#d946ef" stopOpacity="0.25"/>
              <Stop offset="30%" stopColor="#818cf8" stopOpacity="0.6"/>
              <Stop offset="100%" stopColor="#4f46e5" stopOpacity="0.9"/>
            </SvgLinearGradient></Defs>
            <Path d="M 180 0 C 182 50, 185 110, 190 150 C 210 90, 240 40, 280 20 C 260 60, 230 120, 200 170 C 240 120, 280 80, 320 70 C 290 110, 250 170, 210 200 C 250 160, 300 120, 340 120 C 310 180, 230 260, 180 280 Z" fill="url(#bgOwlWR)" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.5"/>
          </Svg>
        </Animated.View>
        {/* Head + face */}
        <View style={{ position:'absolute', width:380, height:400, justifyContent:'center', alignItems:'center' }}>
          <Svg width="380" height="400" viewBox="0 0 360 380">
            <Defs>
              <SvgLinearGradient id="bgOwlEyeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#ffd700"/><Stop offset="100%" stopColor="#ff8800"/>
              </SvgLinearGradient>
              <SvgLinearGradient id="bgOwlF" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#4338ca" stopOpacity="0.95"/>
                <Stop offset="100%" stopColor="#1e1b4b" stopOpacity="1"/>
              </SvgLinearGradient>
            </Defs>
            {/* Body/head shape */}
            <Path d="M 105 105 L 180 140 L 255 105 L 220 205 L 180 228 L 140 205 Z" fill="url(#bgOwlF)" stroke="#818cf8" strokeWidth="3" strokeOpacity="0.9"/>
            {/* Ear tufts */}
            <Path d="M 110 112 L 72 58 L 138 92 Z" fill="#6366f1" stroke="#a5b4fc" strokeWidth="2" opacity="1"/>
            <Path d="M 250 112 L 288 58 L 222 92 Z" fill="#6366f1" stroke="#a5b4fc" strokeWidth="2" opacity="1"/>
            {/* Eye rings - thick */}
            <Circle cx="150" cy="142" r="30" fill="#0c0a2e" stroke="#ffd700" strokeWidth="4"/>
            <Circle cx="210" cy="142" r="30" fill="#0c0a2e" stroke="#ffd700" strokeWidth="4"/>
            {/* Facial disc arc */}
            <Path d="M 108 128 C 112 105, 140 95, 180 95 C 220 95, 248 105, 252 128" fill="none" stroke="#a5b4fc" strokeWidth="2" opacity="0.7"/>
            {/* Beak */}
            <Path d="M 172 155 L 162 195 L 198 195 Z" fill="#f59e0b" stroke="#d97706" strokeWidth="2"/>
            {/* Chest chevron feathers */}
            <Path d="M 148 215 L 180 242 L 212 215 M 158 232 L 180 254 L 202 232" stroke="#fbbf24" strokeWidth="2.5" strokeOpacity="0.7" fill="none"/>
          </Svg>
          {/* Blinking glowing eyes */}
          {[150, 210].map((x) => (
            <Animated.View key={x} style={{ position:'absolute', top:142-18, left:x-18, width:36, height:36, transform:[{ scaleY: blinkAnim }] }}>
              <Svg width="36" height="36" viewBox="0 0 36 36">
                <Circle cx="18" cy="18" r="18" fill="url(#bgOwlEyeGlow)"/>
                <Circle cx="24" cy="12" r="6" fill="#ffffff" opacity="0.95"/>
              </Svg>
            </Animated.View>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  if (theme === 'wolf') return (
    <Animated.View style={{
      position:'absolute', top:40, left:0, right:0, height:400,
      alignItems:'center', opacity:0.75,
      transform:[{ translateY: breatheAnim.interpolate({ inputRange:[0,1], outputRange:[0,-8] }) }]
    }}>
      <View style={{ width:380, height:400, justifyContent:'center', alignItems:'center' }}>
        {/* Left ear flutter */}
        <Animated.View style={{ position:'absolute', left:42, top:10, width:100, height:150, transformOrigin:[100,150,0],
          transform:[{ rotate: flutterAnim.interpolate({ inputRange:[0,1], outputRange:['-3deg','5deg'] }) }] }}>
          <Svg width="100" height="150" viewBox="0 0 80 120">
            <Defs><SvgLinearGradient id="bgWolfEarL" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7c3aed" stopOpacity="1"/>
              <Stop offset="100%" stopColor="#3b0764" stopOpacity="0.8"/>
            </SvgLinearGradient></Defs>
            <Path d="M 40 110 L 5 0 L 75 80 Z" fill="url(#bgWolfEarL)" stroke="#a78bfa" strokeWidth="2"/>
            <Path d="M 40 110 L 15 10 L 70 80 Z" fill="#6d28d9" opacity="0.7"/>
          </Svg>
        </Animated.View>
        {/* Right ear flutter */}
        <Animated.View style={{ position:'absolute', right:42, top:10, width:100, height:150, transformOrigin:[0,150,0],
          transform:[{ rotate: flutterAnim.interpolate({ inputRange:[0,1], outputRange:['3deg','-5deg'] }) }] }}>
          <Svg width="100" height="150" viewBox="0 0 80 120">
            <Defs><SvgLinearGradient id="bgWolfEarR" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#7c3aed" stopOpacity="1"/>
              <Stop offset="100%" stopColor="#3b0764" stopOpacity="0.8"/>
            </SvgLinearGradient></Defs>
            <Path d="M 40 110 L 75 0 L 5 80 Z" fill="url(#bgWolfEarR)" stroke="#a78bfa" strokeWidth="2"/>
            <Path d="M 40 110 L 65 10 L 10 80 Z" fill="#6d28d9" opacity="0.7"/>
          </Svg>
        </Animated.View>
        {/* Body + face */}
        <Svg width="380" height="400" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <SvgLinearGradient id="bgWolfBody" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#5b21b6" stopOpacity="1"/>
              <Stop offset="100%" stopColor="#0d0020" stopOpacity="1"/>
            </SvgLinearGradient>
          </Defs>
          {/* Head */}
          <Path d="M 100 115 C 95 80, 108 52, 132 40 C 152 30, 167 26, 190 26 C 213 26, 228 30, 248 40 C 272 52, 285 80, 280 115 C 274 148, 252 200, 190 215 C 128 200, 106 148, 100 115 Z" fill="url(#bgWolfBody)" stroke="#7c3aed" strokeWidth="3"/>
          {/* Muzzle */}
          <Path d="M 148 135 C 142 162, 160 188, 190 192 C 220 188, 238 162, 232 135 C 220 126, 160 126, 148 135 Z" fill="#2e1065" stroke="#6d28d9" strokeWidth="2" opacity="0.9"/>
          {/* Angry brow lines */}
          <Path d="M 108 98 L 145 88" stroke="#d946ef" strokeWidth="4" strokeLinecap="round"/>
          <Path d="M 272 98 L 235 88" stroke="#d946ef" strokeWidth="4" strokeLinecap="round"/>
          {/* Eye sockets */}
          <Circle cx="148" cy="104" r="28" fill="#0a0014" stroke="#a855f7" strokeWidth="4"/>
          <Circle cx="232" cy="104" r="28" fill="#0a0014" stroke="#a855f7" strokeWidth="4"/>
          {/* Fangs */}
          <Path d="M 168 170 L 162 200 L 174 170 Z" fill="white" opacity="0.9"/>
          <Path d="M 212 170 L 218 200 L 206 170 Z" fill="white" opacity="0.9"/>
          {/* Mouth line */}
          <Path d="M 162 170 Q 190 182 218 170" stroke="#1e0a3c" strokeWidth="3" fill="none"/>
          {/* Side fur strokes */}
          <Path d="M 104 115 C 98 98, 96 78, 100 58" stroke="#7c3aed" strokeWidth="3" fill="none" opacity="0.7"/>
          <Path d="M 110 125 C 104 106, 102 84, 106 64" stroke="#6d28d9" strokeWidth="2" fill="none" opacity="0.5"/>
          <Path d="M 276 115 C 282 98, 284 78, 280 58" stroke="#7c3aed" strokeWidth="3" fill="none" opacity="0.7"/>
          <Path d="M 270 125 C 276 106, 278 84, 274 64" stroke="#6d28d9" strokeWidth="2" fill="none" opacity="0.5"/>
          {/* Nose */}
          <Path d="M 180 148 L 190 155 L 200 148 C 197 140, 183 140, 180 148 Z" fill="#1e0a3c" stroke="#7c3aed" strokeWidth="1.5"/>
        </Svg>
        {/* Glowing pulsing eyes */}
        {[148, 232].map((x) => (
          <Animated.View key={x} style={{ position:'absolute', top:104-20, left:x-20, width:40, height:40,
            opacity: glowAnim, transform:[{ scaleY: blinkAnim }] }}>
            <Svg width="40" height="40" viewBox="0 0 40 40">
              <Defs><SvgLinearGradient id="bgWEye" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#c084fc"/><Stop offset="100%" stopColor="#ec4899"/>
              </SvgLinearGradient></Defs>
              <Circle cx="20" cy="20" r="20" fill="url(#bgWEye)"/>
              <Circle cx="27" cy="13" r="7" fill="white" opacity="0.95"/>
            </Svg>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );

  if (theme === 'lion') return (
    <Animated.View style={{
      position:'absolute', top:20, left:0, right:0, height:420,
      alignItems:'center', opacity:0.75,
      transform:[{ translateY: breatheAnim.interpolate({ inputRange:[0,1], outputRange:[0,-8] }) }]
    }}>
      <View style={{ width:380, height:420, justifyContent:'center', alignItems:'center' }}>
        {/* Mane rays pulsing */}
        <Animated.View style={{ position:'absolute', width:380, height:420, alignItems:'center', justifyContent:'center',
          transform:[{ scale: flutterAnim.interpolate({ inputRange:[0,1], outputRange:[1, 1.08] }) }] }}>
          <Svg width="360" height="360" viewBox="0 0 320 320">
            {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 160 + 88 * Math.cos(rad), y1 = 160 + 88 * Math.sin(rad);
              const x2 = 160 + 152 * Math.cos(rad), y2 = 160 + 152 * Math.sin(rad);
              return <Path key={i} d={`M${x1},${y1} L${x2},${y2}`}
                stroke={i % 2 === 0 ? '#fbbf24' : '#f97316'}
                strokeWidth={i % 2 === 0 ? '6' : '3.5'} strokeLinecap="round" opacity="0.9"/>;
            })}
          </Svg>
        </Animated.View>
        {/* Mane circle + face */}
        <Svg width="380" height="420" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <SvgLinearGradient id="bgLionMane" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#dc2626" stopOpacity="1"/>
              <Stop offset="100%" stopColor="#7c2d12" stopOpacity="1"/>
            </SvgLinearGradient>
            <SvgLinearGradient id="bgLionFace" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#fb923c" stopOpacity="1"/>
              <Stop offset="100%" stopColor="#c2410c" stopOpacity="1"/>
            </SvgLinearGradient>
            <SvgLinearGradient id="bgLEye" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#fbbf24"/><Stop offset="100%" stopColor="#f97316"/>
            </SvgLinearGradient>
          </Defs>
          {/* Mane */}
          <Circle cx="190" cy="215" r="96" fill="url(#bgLionMane)" stroke="#ef4444" strokeWidth="3"/>
          {/* Face */}
          <Circle cx="190" cy="218" r="68" fill="url(#bgLionFace)" stroke="#fb923c" strokeWidth="2"/>
          {/* Crown */}
          <Path d="M 146 138 L 154 116 L 166 138 L 180 104 L 190 132 L 200 104 L 214 138 L 226 116 L 234 138"
            fill="#fbbf24" stroke="#d97706" strokeWidth="2.5" opacity="1"/>
          {/* Eye rings */}
          <Circle cx="162" cy="202" r="27" fill="#1f0a00" stroke="#fbbf24" strokeWidth="4"/>
          <Circle cx="218" cy="202" r="27" fill="#1f0a00" stroke="#fbbf24" strokeWidth="4"/>
          {/* Nose */}
          <Path d="M 180 232 L 190 240 L 200 232 C 197 222, 183 222, 180 232 Z" fill="#7f1d1d" stroke="#991b1b" strokeWidth="2"/>
          {/* Mouth */}
          <Path d="M 170 244 Q 190 258 210 244" stroke="#7f1d1d" strokeWidth="3" fill="none"/>
          <Path d="M 190 240 L 190 244" stroke="#7f1d1d" strokeWidth="3"/>
          {/* Whisker dots */}
          <Circle cx="144" cy="236" r="4.5" fill="rgba(255,251,235,0.6)"/>
          <Circle cx="156" cy="244" r="4.5" fill="rgba(255,251,235,0.6)"/>
          <Circle cx="224" cy="236" r="4.5" fill="rgba(255,251,235,0.6)"/>
          <Circle cx="236" cy="244" r="4.5" fill="rgba(255,251,235,0.6)"/>
        </Svg>
        {/* Blinking eyes */}
        {[162, 218].map((x) => (
          <Animated.View key={x} style={{ position:'absolute', top:202-20, left:x-20, width:40, height:40,
            transform:[{ scaleY: blinkAnim }] }}>
            <Svg width="40" height="40" viewBox="0 0 40 40">
              <Defs><SvgLinearGradient id="bgLEye2" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#fbbf24"/><Stop offset="100%" stopColor="#f97316"/>
              </SvgLinearGradient></Defs>
              <Circle cx="20" cy="20" r="20" fill="url(#bgLEye2)"/>
              <Circle cx="27" cy="13" r="7" fill="white" opacity="0.95"/>
            </Svg>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );




  // DRAGON
  return (
    <Animated.View style={{
      position:'absolute', top:30, left:0, right:0, height:410,
      alignItems:'center', opacity:0.75,
      transform:[{ translateY: breatheAnim.interpolate({ inputRange:[0,1], outputRange:[0,-8] }) }]
    }}>
      <View style={{ width:380, height:410, justifyContent:'center', alignItems:'center' }}>
        {/* Left wing */}
        <Animated.View style={{ position:'absolute', left:0, top:0, width:190, height:410, transformOrigin:[190,300,0],
          transform:[{ rotate: flutterAnim.interpolate({ inputRange:[0,1], outputRange:['0deg','-10deg'] }) }] }}>
          <Svg width="190" height="410" viewBox="0 0 180 390">
            <Defs><SvgLinearGradient id="bgDrWL" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#78350f" stopOpacity="1"/>
              <Stop offset="60%" stopColor="#d97706" stopOpacity="0.7"/>
              <Stop offset="100%" stopColor="#eab308" stopOpacity="0.3"/>
            </SvgLinearGradient></Defs>
            <Path d="M 180 290 C 140 260, 70 180, 30 110 C 65 115, 115 160, 155 210 C 115 175, 72 108, 42 62 C 82 78, 125 125, 162 175 C 135 118, 102 52, 82 8 C 125 35, 155 95, 174 158 C 177 108, 179 50, 180 0 Z"
              fill="url(#bgDrWL)" stroke="#d97706" strokeWidth="2" strokeOpacity="0.8"/>
            <Path d="M 180 290 C 145 255, 90 195, 55 138" stroke="#fbbf24" strokeWidth="3" fill="none" opacity="0.7"/>
            <Path d="M 180 200 C 155 170, 115 130, 85 88" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.5"/>
            <Path d="M 180 130 C 162 108, 138 82, 118 55" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.4"/>
          </Svg>
        </Animated.View>
        {/* Right wing */}
        <Animated.View style={{ position:'absolute', right:0, top:0, width:190, height:410, transformOrigin:[0,300,0],
          transform:[{ rotate: flutterAnim.interpolate({ inputRange:[0,1], outputRange:['0deg','10deg'] }) }] }}>
          <Svg width="190" height="410" viewBox="180 0 180 390">
            <Defs><SvgLinearGradient id="bgDrWR" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#eab308" stopOpacity="0.3"/>
              <Stop offset="40%" stopColor="#d97706" stopOpacity="0.7"/>
              <Stop offset="100%" stopColor="#78350f" stopOpacity="1"/>
            </SvgLinearGradient></Defs>
            <Path d="M 180 0 C 181 50, 183 108, 186 158 C 205 95, 235 35, 278 8 C 258 52, 225 118, 198 175 C 235 125, 278 78, 318 62 C 288 108, 245 175, 205 210 C 245 160, 295 115, 330 110 C 290 180, 220 260, 180 290 Z"
              fill="url(#bgDrWR)" stroke="#d97706" strokeWidth="2" strokeOpacity="0.8"/>
            <Path d="M 180 290 C 215 255, 270 195, 305 138" stroke="#fbbf24" strokeWidth="3" fill="none" opacity="0.7"/>
            <Path d="M 180 200 C 205 170, 245 130, 275 88" stroke="#f59e0b" strokeWidth="2" fill="none" opacity="0.5"/>
            <Path d="M 180 130 C 198 108, 222 82, 242 55" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.4"/>
          </Svg>
        </Animated.View>
        {/* Head + body */}
        <Svg width="380" height="410" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <SvgLinearGradient id="bgDrBody" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#44403c" stopOpacity="1"/>
              <Stop offset="100%" stopColor="#0c0a09" stopOpacity="1"/>
            </SvgLinearGradient>
            <SvgLinearGradient id="bgDrScl" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#eab308" stopOpacity="0.9"/>
              <Stop offset="100%" stopColor="#d97706" stopOpacity="0.5"/>
            </SvgLinearGradient>
            <SvgLinearGradient id="bgDrEye" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#fbbf24"/><Stop offset="100%" stopColor="#dc2626"/>
            </SvgLinearGradient>
          </Defs>
          {/* Head */}
          <Path d="M 100 125 C 94 85, 112 55, 142 42 C 160 32, 175 28, 190 28 C 205 28, 220 32, 238 42 C 268 55, 286 85, 280 125 C 274 162, 252 215, 190 230 C 128 215, 106 162, 100 125 Z"
            fill="url(#bgDrBody)" stroke="#d97706" strokeWidth="3"/>
          {/* Left horn */}
          <Path d="M 122 82 L 88 18 L 126 74 Z" fill="#d97706" stroke="#fbbf24" strokeWidth="2" opacity="1"/>
          <Path d="M 122 82 L 98 24 L 124 74 Z" fill="#fbbf24" opacity="0.7"/>
          {/* Right horn */}
          <Path d="M 258 82 L 292 18 L 254 74 Z" fill="#d97706" stroke="#fbbf24" strokeWidth="2" opacity="1"/>
          <Path d="M 258 82 L 282 24 L 256 74 Z" fill="#fbbf24" opacity="0.7"/>
          {/* Scale rows */}
          {[[120,110,20],[140,100,20],[160,93,18],[180,90,16],[200,93,18],[220,100,20],[240,110,20]].map(([x,y,r],i) =>
            <Path key={i} d={`M${x},${y} Q${x+r/2},${y-r} ${x+r},${y} Q${x+r/2},${y-5} ${x},${y} Z`} fill="url(#bgDrScl)" stroke="#d97706" strokeWidth="1"/>
          )}
          {[[130,125,18],[150,116,18],[170,109,16],[190,107,14],[210,109,16],[230,116,18],[250,125,18]].map(([x,y,r],i) =>
            <Path key={i+10} d={`M${x},${y} Q${x+r/2},${y-r} ${x+r},${y} Q${x+r/2},${y-4} ${x},${y} Z`} fill="url(#bgDrScl)" opacity="0.7"/>
          )}
          {/* Eye sockets */}
          <Circle cx="148" cy="125" r="28" fill="#0a0005" stroke="#eab308" strokeWidth="4"/>
          <Circle cx="232" cy="125" r="28" fill="#0a0005" stroke="#eab308" strokeWidth="4"/>
          {/* Slit pupils */}
          <Path d="M 148 110 L 148 140" stroke="#050303" strokeWidth="9" strokeLinecap="round"/>
          <Path d="M 232 110 L 232 140" stroke="#050303" strokeWidth="9" strokeLinecap="round"/>
          {/* Nostrils */}
          <Circle cx="172" cy="162" r="7" fill="#0a0005" stroke="#d97706" strokeWidth="1.5"/>
          <Circle cx="208" cy="162" r="7" fill="#0a0005" stroke="#d97706" strokeWidth="1.5"/>
          {/* Jaw */}
          <Path d="M 130 178 Q 190 205 250 178" fill="none" stroke="#1c1917" strokeWidth="4"/>
          {/* Chin scale diamonds */}
          <Path d="M 178 188 L 184 200 L 190 188 L 184 182 Z" fill="#d97706" opacity="0.8"/>
          <Path d="M 196 185 L 202 196 L 208 185 L 202 179 Z" fill="#d97706" opacity="0.8"/>
        </Svg>
        {/* Glowing eyes */}
        {[148, 232].map((x) => (
          <Animated.View key={x} style={{ position:'absolute', top:125-20, left:x-20, width:40, height:40,
            opacity: glowAnim, transform:[{ scaleY: blinkAnim }] }}>
            <Svg width="40" height="40" viewBox="0 0 40 40">
              <Defs><SvgLinearGradient id="bgDEye" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#fbbf24"/><Stop offset="100%" stopColor="#dc2626"/>
              </SvgLinearGradient></Defs>
              <Circle cx="20" cy="20" r="20" fill="url(#bgDEye)"/>
              <Circle cx="27" cy="13" r="7" fill="white" opacity="0.9"/>
            </Svg>
          </Animated.View>
        ))}
        {/* Fire breath pulse */}
        <Animated.View style={{ position:'absolute', bottom:30, width:380, alignItems:'center',
          opacity: glowAnim.interpolate({ inputRange:[0,1], outputRange:[0.2,0.8] }) }}>
          <Svg width="320" height="80" viewBox="0 0 300 60">
            <Defs><SvgLinearGradient id="bgFire" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#fbbf24" stopOpacity="1"/>
              <Stop offset="100%" stopColor="#dc2626" stopOpacity="0"/>
            </SvgLinearGradient></Defs>
            <Path d="M 80 0 Q 150 70 220 0 Q 150 48 80 0 Z" fill="url(#bgFire)"/>
            <Path d="M 108 0 Q 150 55 192 0 Q 150 36 108 0 Z" fill="#fbbf24" opacity="0.6"/>
            <Path d="M 130 0 Q 150 38 170 0 Q 150 24 130 0 Z" fill="white" opacity="0.4"/>
          </Svg>
        </Animated.View>
      </View>
    </Animated.View>
  );
};




const AnimatedMascot = ({ theme, colors, level }: { theme: string; colors: { bg: string; gradient: string[] }; level: number }) => {
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0.5)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    floatAnim.setValue(0); glowAnim.setValue(0.5); scaleAnim.setValue(1);
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -10, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0,   duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim,  { toValue: 1,   duration: 900,  easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowAnim,  { toValue: 0.3, duration: 900,  easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.04, duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 2800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [theme]);

  const g = colors.gradient;
  const SIZE = 180;

  const renderBody = () => {
    if (theme === 'owl') return (
      <Svg width={SIZE} height={SIZE} viewBox="0 0 180 180">
        <Defs>
          <SvgLinearGradient id="owlBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1a3a6b" />
            <Stop offset="100%" stopColor="#030920" />
          </SvgLinearGradient>
          <SvgLinearGradient id="owlEye" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={g[0]} />
            <Stop offset="100%" stopColor={g[1]} />
          </SvgLinearGradient>
          <SvgLinearGradient id="owlWing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={g[0]} stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#030920" stopOpacity="0.4" />
          </SvgLinearGradient>
        </Defs>
        {/* Wings */}
        <Path d="M30,95 C10,70 8,140 32,150 C48,140 54,115 60,95 C50,100 38,100 30,95 Z" fill="url(#owlWing)" />
        <Path d="M150,95 C170,70 172,140 148,150 C132,140 126,115 120,95 C130,100 142,100 150,95 Z" fill="url(#owlWing)" />
        {/* Body */}
        <Path d="M55,70 C55,120 65,165 90,165 C115,165 125,120 125,70 C125,45 110,30 90,30 C70,30 55,45 55,70 Z" fill="url(#owlBody)" />
        {/* Ear tufts */}
        <Path d="M66,46 L52,12 L74,40 Z" fill="#d97706" />
        <Path d="M66,46 L58,18 L74,40 Z" fill="#fbbf24" opacity="0.8" />
        <Path d="M114,46 L128,12 L106,40 Z" fill="#d97706" />
        <Path d="M114,46 L122,18 L106,40 Z" fill="#fbbf24" opacity="0.8" />
        {/* Eye rings */}
        <Circle cx="71" cy="78" r="24" fill="#04060f" stroke="#fbbf24" strokeWidth="3" />
        <Circle cx="109" cy="78" r="24" fill="#04060f" stroke="#fbbf24" strokeWidth="3" />
        {/* Eye iris */}
        <Circle cx="71" cy="78" r="17" fill="url(#owlEye)" />
        <Circle cx="109" cy="78" r="17" fill="url(#owlEye)" />
        {/* Pupil */}
        <Circle cx="71" cy="78" r="9" fill="#000814" />
        <Circle cx="109" cy="78" r="9" fill="#000814" />
        {/* Eye glint */}
        <Circle cx="64" cy="70" r="5" fill="white" opacity="0.9" />
        <Circle cx="102" cy="70" r="5" fill="white" opacity="0.9" />
        <Circle cx="68" cy="73" r="2" fill="white" opacity="0.5" />
        <Circle cx="106" cy="73" r="2" fill="white" opacity="0.5" />
        {/* Beak */}
        <Path d="M82,92 C78,88 74,96 80,102 L90,110 L100,102 C106,96 102,88 98,92 C95,88 85,88 82,92 Z" fill="#fbbf24" />
        <Path d="M90,110 L88,103 L92,103 Z" fill="#d97706" />
        {/* Facial disc */}
        <Path d="M60,68 C60,55 70,48 90,48 C110,48 120,55 120,68" fill="none" stroke={g[1]} strokeWidth="1.5" opacity="0.4" />
        {/* Chest feather pattern */}
        <Path d="M75,120 Q90,130 105,120 M70,135 Q90,147 110,135" stroke={g[1]} strokeWidth="1" opacity="0.3" fill="none" />
        {/* Level glow ring below */}
        <Circle cx="90" cy="90" r="86" fill="none" stroke={g[1]} strokeWidth="0.8" opacity="0.15" />
      </Svg>
    );

    if (theme === 'wolf') return (
      <Svg width={SIZE} height={SIZE} viewBox="0 0 180 180">
        <Defs>
          <SvgLinearGradient id="wolfBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#3b0764" />
            <Stop offset="100%" stopColor="#0d0020" />
          </SvgLinearGradient>
          <SvgLinearGradient id="wolfEye" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={g[0]} />
            <Stop offset="100%" stopColor={g[2]} />
          </SvgLinearGradient>
          <SvgLinearGradient id="wolfMuzzle" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#4c1d95" />
            <Stop offset="100%" stopColor="#1e0a3c" />
          </SvgLinearGradient>
        </Defs>
        {/* Main head/body */}
        <Path d="M45,90 C38,65 42,40 60,28 C70,22 80,18 90,18 C100,18 110,22 120,28 C138,40 142,65 135,90 C130,110 118,145 90,155 C62,145 50,110 45,90 Z" fill="url(#wolfBody)" />
        {/* Pointed left ear */}
        <Path d="M58,38 L35,5 L65,32 Z" fill="#4c1d95" />
        <Path d="M60,36 L42,10 L65,32 Z" fill="#7c3aed" opacity="0.6" />
        {/* Pointed right ear */}
        <Path d="M122,38 L145,5 L115,32 Z" fill="#4c1d95" />
        <Path d="M120,36 L138,10 L115,32 Z" fill="#7c3aed" opacity="0.6" />
        {/* Fur detail lines - left side */}
        <Path d="M48,75 C45,68 44,58 47,48" stroke="#6d28d9" strokeWidth="1.2" fill="none" opacity="0.6" />
        <Path d="M52,82 C48,72 46,60 50,50" stroke="#7c3aed" strokeWidth="1" fill="none" opacity="0.4" />
        {/* Fur detail lines - right side */}
        <Path d="M132,75 C135,68 136,58 133,48" stroke="#6d28d9" strokeWidth="1.2" fill="none" opacity="0.6" />
        <Path d="M128,82 C132,72 134,60 130,50" stroke="#7c3aed" strokeWidth="1" fill="none" opacity="0.4" />
        {/* Muzzle */}
        <Path d="M68,95 C65,110 72,130 90,135 C108,130 115,110 112,95 C106,88 74,88 68,95 Z" fill="url(#wolfMuzzle)" />
        {/* Nose */}
        <Path d="M82,96 L90,100 L98,96 C96,91 84,91 82,96 Z" fill="#1e0a3c" />
        <Path d="M85,95 L90,97 L95,95" stroke={g[1]} strokeWidth="0.8" fill="none" opacity="0.6" />
        {/* Eyes */}
        <Circle cx="68" cy="74" r="16" fill="#0a0014" stroke={g[1]} strokeWidth="2.5" />
        <Circle cx="112" cy="74" r="16" fill="#0a0014" stroke={g[1]} strokeWidth="2.5" />
        <Circle cx="68" cy="74" r="11" fill="url(#wolfEye)" />
        <Circle cx="112" cy="74" r="11" fill="url(#wolfEye)" />
        <Circle cx="68" cy="74" r="5" fill="#000814" />
        <Circle cx="112" cy="74" r="5" fill="#000814" />
        {/* Glints */}
        <Circle cx="62" cy="67" r="4" fill="white" opacity="0.9" />
        <Circle cx="106" cy="67" r="4" fill="white" opacity="0.9" />
        {/* Fangs */}
        <Path d="M80,118 L76,132 L82,118 Z" fill="white" opacity="0.85" />
        <Path d="M100,118 L104,132 L98,118 Z" fill="white" opacity="0.85" />
        {/* Mouth line */}
        <Path d="M76,118 Q90,126 104,118" stroke="#1e0a3c" strokeWidth="1.5" fill="none" />
        {/* Brow ridge - angry look */}
        <Path d="M52,62 L68,58" stroke={g[1]} strokeWidth="2" opacity="0.7" />
        <Path d="M128,62 L112,58" stroke={g[1]} strokeWidth="2" opacity="0.7" />
      </Svg>
    );

    if (theme === 'lion') return (
      <Svg width={SIZE} height={SIZE} viewBox="0 0 180 180">
        <Defs>
          <SvgLinearGradient id="maneGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#dc2626" />
            <Stop offset="100%" stopColor="#7c2d12" />
          </SvgLinearGradient>
          <SvgLinearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#f97316" />
            <Stop offset="100%" stopColor="#c2410c" />
          </SvgLinearGradient>
          <SvgLinearGradient id="lionEye" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={g[1]} />
            <Stop offset="100%" stopColor={g[2]} />
          </SvgLinearGradient>
        </Defs>
        {/* Mane rays (16 rays) */}
        {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 90 + 54 * Math.cos(rad);
          const y1 = 90 + 54 * Math.sin(rad);
          const x2 = 90 + 80 * Math.cos(rad);
          const y2 = 90 + 80 * Math.sin(rad);
          return <Path key={i} d={`M${x1},${y1} L${x2},${y2}`} stroke={i % 2 === 0 ? '#fbbf24' : '#f97316'} strokeWidth={i % 2 === 0 ? '3.5' : '2'} strokeLinecap="round" />;
        })}
        {/* Mane outer circle */}
        <Circle cx="90" cy="90" r="52" fill="url(#maneGrad)" />
        <Circle cx="90" cy="90" r="50" fill="url(#maneGrad)" opacity="0.8" />
        {/* Mane texture lines */}
        <Path d="M55,65 C58,80 58,100 55,115" stroke="#991b1b" strokeWidth="1.5" fill="none" opacity="0.5" />
        <Path d="M125,65 C122,80 122,100 125,115" stroke="#991b1b" strokeWidth="1.5" fill="none" opacity="0.5" />
        {/* Face */}
        <Circle cx="90" cy="93" r="38" fill="url(#faceGrad)" />
        {/* Crown */}
        <Path d="M62,52 L66,38 L74,52 L82,32 L90,50 L98,32 L106,52 L114,38 L118,52" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
        <Path d="M68,52 L90,46 L112,52" fill="#fbbf24" opacity="0.5" />
        {/* Eyes */}
        <Circle cx="72" cy="85" r="14" fill="#1f0a00" stroke="#fbbf24" strokeWidth="2.5" />
        <Circle cx="108" cy="85" r="14" fill="#1f0a00" stroke="#fbbf24" strokeWidth="2.5" />
        <Circle cx="72" cy="85" r="9" fill="url(#lionEye)" />
        <Circle cx="108" cy="85" r="9" fill="url(#lionEye)" />
        <Circle cx="72" cy="85" r="4" fill="#1f0a00" />
        <Circle cx="108" cy="85" r="4" fill="#1f0a00" />
        {/* Glints */}
        <Circle cx="66" cy="78" r="4" fill="white" opacity="0.9" />
        <Circle cx="102" cy="78" r="4" fill="white" opacity="0.9" />
        {/* Nose */}
        <Path d="M83,100 L90,105 L97,100 C95,95 85,95 83,100 Z" fill="#7f1d1d" />
        {/* Mouth */}
        <Path d="M78,108 Q90,118 102,108" stroke="#7f1d1d" strokeWidth="1.5" fill="none" />
        <Path d="M90,105 L90,108" stroke="#7f1d1d" strokeWidth="1.5" />
        {/* Whisker dots */}
        <Circle cx="62" cy="104" r="2" fill="rgba(255,251,235,0.5)" />
        <Circle cx="68" cy="108" r="2" fill="rgba(255,251,235,0.5)" />
        <Circle cx="118" cy="104" r="2" fill="rgba(255,251,235,0.5)" />
        <Circle cx="112" cy="108" r="2" fill="rgba(255,251,235,0.5)" />
        {/* Chin fur */}
        <Path d="M78,118 C82,128 98,128 102,118" stroke="#c2410c" strokeWidth="1.2" fill="none" opacity="0.5" />
      </Svg>
    );

    // dragon
    return (
      <Svg width={SIZE} height={SIZE} viewBox="0 0 180 180">
        <Defs>
          <SvgLinearGradient id="dragonBody" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1c1917" />
            <Stop offset="100%" stopColor="#050304" />
          </SvgLinearGradient>
          <SvgLinearGradient id="dragonScale" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={g[0]} stopOpacity="0.7" />
            <Stop offset="100%" stopColor={g[1]} stopOpacity="0.3" />
          </SvgLinearGradient>
          <SvgLinearGradient id="dragonEye" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#dc2626" />
          </SvgLinearGradient>
        </Defs>
        {/* Star-burst glow behind */}
        {[0,45,90,135].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 90 + 58 * Math.cos(rad); const y1 = 90 + 58 * Math.sin(rad);
          const x2 = 90 - 58 * Math.cos(rad); const y2 = 90 - 58 * Math.sin(rad);
          return <Path key={i} d={`M${x1},${y1} L${x2},${y2}`} stroke={g[1]} strokeWidth="1" opacity="0.2" />;
        })}
        {/* Head */}
        <Path d="M40,95 C38,65 48,40 68,26 C76,20 84,17 90,17 C96,17 104,20 112,26 C132,40 142,65 140,95 C136,125 120,158 90,162 C60,158 44,125 40,95 Z" fill="url(#dragonBody)" />
        {/* Left Horn */}
        <Path d="M60,38 L38,5 L58,35 Z" fill={g[1]} />
        <Path d="M60,38 L42,10 L58,35 Z" fill={g[0]} opacity="0.7" />
        <Path d="M56,36 L40,8 L56,33 Z" fill="#fbbf24" opacity="0.5" />
        {/* Right Horn */}
        <Path d="M120,38 L142,5 L122,35 Z" fill={g[1]} />
        <Path d="M120,38 L138,10 L122,35 Z" fill={g[0]} opacity="0.7" />
        <Path d="M124,36 L140,8 L124,33 Z" fill="#fbbf24" opacity="0.5" />
        {/* Scale rows */}
        {[[52,58,18],[64,52,18],[76,46,18],[88,44,16],[100,46,18],[112,52,18],[124,58,18]].map(([x,y,r], i) =>
          <Path key={i} d={`M${x},${y} Q${x+(r/2)},${y-r} ${x+r},${y} Q${x+(r/2)},${y-4} ${x},${y} Z`} fill="url(#dragonScale)" />
        )}
        {[[58,72,16],[70,66,16],[82,62,14],[90,60,14],[98,62,14],[110,66,16],[122,72,16]].map(([x,y,r], i) =>
          <Path key={i} d={`M${x},${y} Q${x+(r/2)},${y-r} ${x+r},${y} Q${x+(r/2)},${y-4} ${x},${y} Z`} fill="url(#dragonScale)" opacity="0.6" />
        )}
        {/* Eyes */}
        <Circle cx="66" cy="82" r="16" fill="#0a0005" stroke="#fbbf24" strokeWidth="2.5" />
        <Circle cx="114" cy="82" r="16" fill="#0a0005" stroke="#fbbf24" strokeWidth="2.5" />
        <Circle cx="66" cy="82" r="11" fill="url(#dragonEye)" />
        <Circle cx="114" cy="82" r="11" fill="url(#dragonEye)" />
        {/* Slit pupils */}
        <Path d="M66,70 L66,94" stroke="#0a0005" strokeWidth="5" strokeLinecap="round" />
        <Path d="M114,70 L114,94" stroke="#0a0005" strokeWidth="5" strokeLinecap="round" />
        {/* Glint */}
        <Circle cx="60" cy="75" r="4" fill="white" opacity="0.85" />
        <Circle cx="108" cy="75" r="4" fill="white" opacity="0.85" />
        {/* Nostrils */}
        <Circle cx="80" cy="110" r="4" fill="#0a0005" />
        <Circle cx="100" cy="110" r="4" fill="#0a0005" />
        <Path d="M78,108 Q80,113 82,108" stroke={g[1]} strokeWidth="0.8" fill="none" opacity="0.6" />
        <Path d="M98,108 Q100,113 102,108" stroke={g[1]} strokeWidth="0.8" fill="none" opacity="0.6" />
        {/* Jaw/Mouth */}
        <Path d="M62,118 Q90,138 118,118" fill="none" stroke="#0a0005" strokeWidth="2" />
        {/* Fire-glow under mouth */}
        <Path d="M70,128 Q90,145 110,128" fill="none" stroke={g[1]} strokeWidth="1.5" opacity="0.5" />
        <Path d="M78,133 Q90,146 102,133" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.35" />
        {/* Gold chin scales */}
        <Path d="M78,125 L82,132 L86,125 Z" fill={g[1]} opacity="0.5" />
        <Path d="M88,128 L90,134 L92,128 Z" fill={g[1]} opacity="0.5" />
        <Path d="M94,125 L98,132 L102,125 Z" fill={g[1]} opacity="0.5" />
      </Svg>
    );
  };

  return (
    <Animated.View style={{
      transform: [{ translateY: floatAnim }, { scale: scaleAnim }],
      width: SIZE, height: SIZE,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {renderBody()}
      {/* Animated eye glow overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: SIZE, height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: colors.bg,
          opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }),
        }}
      />
    </Animated.View>
  );
};

export default function VipsClubScreen() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { profile: userProfile } = useUserProfile(user?.uid);

  // States
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [vipConfig, setVipConfig] = useState<any>({
    bgType: 'dynamic',
    bgUrl: '',
    levels: {}
  });

  // Animated values for Mystical Owl animations
  const owlBreatheAnim = React.useRef(new Animated.Value(0)).current;
  const owlBlinkAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // 1. Slow cosmic breathing cycle (Wings float up/down & head tilts softly)
    Animated.loop(
      Animated.sequence([
        Animated.timing(owlBreatheAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(owlBreatheAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // 2. Periodic natural eye blinking cycle
    const blinkInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(owlBlinkAnim, {
          toValue: 0.1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(owlBlinkAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        })
      ]).start();
    }, 4500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Stealth toggles state
  const [stealthSettings, setStealthSettings] = useState({
    mysteriousVisitor: false,
    hideGiftRecord: false,
    rankInvisible: false,
    roomInvisible: false,
    avoidBeingKicked: false,
  });

  // Sync real-time VIP config from Firestore
  useEffect(() => {
    if (!firestore) return;
    const docRef = doc(firestore, 'settings', 'svipConfig');
    const unsubscribe = onSnapshot(docRef, (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        setVipConfig({
          bgType: data.bgType || 'dynamic',
          bgUrl: data.bgUrl || '',
          levels: data.levels || {}
        });
      }
    }, (err: any) => {
      console.warn("VIP settings sync error:", err);
    });

    return () => unsubscribe();
  }, [firestore]);

  // Sync profile toggles
  useEffect(() => {
    if (userProfile) {
      setStealthSettings({
        mysteriousVisitor: !!userProfile.mysteriousVisitor,
        hideGiftRecord: !!userProfile.hideGiftRecord,
        rankInvisible: !!userProfile.rankInvisible,
        roomInvisible: !!userProfile.roomInvisible,
        avoidBeingKicked: !!userProfile.avoidBeingKicked,
      });
    }
  }, [userProfile]);

  const userSvipLevel = userProfile?.svip || 0;
  const activeLevelData = SVIP_LEVELS_DATA.find(l => l.level === selectedLevel) || SVIP_LEVELS_DATA[0];
  const activeTheme = activeLevelData.theme;

  const levelBgUrl = vipConfig?.levels?.[selectedLevel]?.bgUrl;
  const showCustomBg = !!levelBgUrl;
  const isVideoBg = showCustomBg && (levelBgUrl.includes('.mp4') || levelBgUrl.includes('video'));

  const unlockedCount = SVIP_PRIVILEGES_DATA.filter(p => p.level <= userSvipLevel).length;

  const handleToggleChange = async (key: keyof typeof stealthSettings, requiredLevel: number) => {
    if (userSvipLevel < requiredLevel) {
      Alert.alert('Privilege Locked', `This toggle requires SVIP ${requiredLevel} or higher!`);
      return;
    }
    if (!user?.uid || !firestore) return;

    const newStatus = !stealthSettings[key];
    setStealthSettings(prev => ({ ...prev, [key]: newStatus }));

    try {
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      await updateDoc(profileRef, { [key]: newStatus });
      // Also write to root users doc for leaderboard/kick checks
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { [key]: newStatus });
    } catch (e: any) {
      Alert.alert('Sync Failed', e.message || 'Could not update settings.');
      setStealthSettings(prev => ({ ...prev, [key]: !newStatus }));
    }
  };

  // ── SVIP Purchase Handler ──────────────────────────────────────────────
  const handlePurchaseSvip = async () => {
    if (!user?.uid || !firestore) return;

    const targetLevel = SVIP_LEVELS_DATA.find(l => l.level === selectedLevel);
    if (!targetLevel) return;

    const currentSpent = userProfile?.wallet?.totalSpent || 0;
    const targetExp = targetLevel.exp;

    if (currentSpent >= targetExp) {
      Alert.alert('Already Reached', `You are already at or above SVIP ${selectedLevel}!`);
      return;
    }

    const expNeeded = targetExp - currentSpent;
    const cost = expNeeded; // 1:1 ratio — 1 coin = 1 EXP

    const currentCoins = userProfile?.wallet?.coins || 0;
    if (currentCoins < cost) {
      Alert.alert('Insufficient Coins', `You need ${cost.toLocaleString('en-IN')} coins but have ${currentCoins.toLocaleString('en-IN')}. Please recharge first.`);
      return;
    }

    Alert.alert(
      'Confirm SVIP Purchase',
      `Upgrade to SVIP ${selectedLevel}?\n\nCost: ${cost.toLocaleString('en-IN')} coins\nCurrent EXP: ${currentSpent.toLocaleString('en-IN')}\nNew EXP: ${targetExp.toLocaleString('en-IN')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Buy Now', onPress: () => executeSvipPurchase(targetLevel, cost) },
      ]
    );
  };

  const executeSvipPurchase = async (targetLevel: typeof SVIP_LEVELS_DATA[number], cost: number) => {
    if (!user?.uid || !firestore) return;
    setIsPurchasing(true);

    try {
      // Fresh balance check
      const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
      const snap = await getDoc(profileRef);
      const freshCoins = snap.exists()
        ? ((snap.data() as any)?.wallet?.coins ?? (userProfile?.wallet?.coins ?? 0))
        : (userProfile?.wallet?.coins ?? 0);

      if (freshCoins < cost) {
        Alert.alert('Insufficient Coins', `Balance changed. You now have ${freshCoins.toLocaleString('en-IN')} coins.`);
        setIsPurchasing(false);
        return;
      }

      const userRef = doc(firestore, 'users', user.uid);
      const batch = writeBatch(firestore);

      // Deduct coins + increment totalSpent (triggers autoPromoteSvip CF)
      const purchaseUpdate = {
        'wallet.coins': increment(-cost),
        'wallet.totalSpent': increment(cost),
        updatedAt: serverTimestamp(),
      };

      batch.update(profileRef, purchaseUpdate);
      batch.update(userRef, purchaseUpdate);

      await batch.commit();

      setIsPurchaseOpen(false);
      Alert.alert('Success!', `You are now SVIP ${targetLevel.level}! 🎉\n\n${cost.toLocaleString('en-IN')} coins deducted.`);
    } catch (e: any) {
      Alert.alert('Purchase Failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const renderUniqueBadge = (lvl: number, animated = true) => {
    const customBadgeUrl = vipConfig?.levels?.[lvl]?.badgeUrl;
    if (customBadgeUrl) {
      return (
        <View className="flex-row items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-yellow-500/40 rounded-full">
          <Image cachePolicy="memory-disk" source={{ uri: toCDN(customBadgeUrl) }} className="h-4 w-4" contentFit="contain" />
          <Text className="text-yellow-400 text-[10px] font-bold uppercase tracking-wider">SVIP {lvl}</Text>
        </View>
      );
    }

    // Theme config per level group
    const getConfig = () => {
      if (lvl >= 1 && lvl <= 6) {
        // Silver Owl — Blue/Cyan
        const intensity = lvl <= 3 ? 0.7 : 1;
        return {
          bg1: '#0c1a2e',
          bg2: '#0ea5e9',
          border: '#38bdf8',
          glow: '#0ea5e9',
          label: '#e0f2fe',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Path d="M12 2C9 2 7 4 7 6.5c0 1 .3 2 .8 2.8C6.3 10 5 11.5 5 13.5 5 17 8 20 12 20s7-3 7-6.5c0-2-.9-3.7-2.2-4.7.5-.7.7-1.7.7-2.8C17.5 4 15 2 12 2z" fill={`rgba(56,189,248,${intensity})`}/>
              <Circle cx="9.5" cy="9" r="1.5" fill="#fde047"/>
              <Circle cx="14.5" cy="9" r="1.5" fill="#fde047"/>
              <Path d="M11 11.5 L12 13 L13 11.5" fill="#93c5fd" stroke="none"/>
            </Svg>
          )
        };
      } else if (lvl >= 7 && lvl <= 10) {
        // Velvet Wolf — Purple/Pink
        const intensity = ((lvl - 6) / 4);
        return {
          bg1: '#1a0a2e',
          bg2: '#9333ea',
          border: '#d946ef',
          glow: '#a855f7',
          label: '#fdf4ff',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Path d="M12 3 L8 7 L5 6 L7 10 C5 11.5 4 13.5 4 16c0 3.3 3.6 6 8 6s8-2.7 8-6c0-2.5-1.4-4.7-3.5-5.8L18 6l-3 1z" fill={`rgba(168,85,247,${0.6 + intensity * 0.4})`}/>
              <Circle cx="9" cy="13" r="1.5" fill="#f0abfc"/>
              <Circle cx="15" cy="13" r="1.5" fill="#f0abfc"/>
              <Path d="M10.5 16 Q12 17.5 13.5 16" stroke="#e879f9" strokeWidth="1.2" fill="none"/>
            </Svg>
          )
        };
      } else if (lvl >= 11 && lvl <= 15) {
        // Fiery Lion — Red/Gold
        const intensity = ((lvl - 10) / 5);
        return {
          bg1: '#1f0a00',
          bg2: '#dc2626',
          border: '#fbbf24',
          glow: '#f97316',
          label: '#fffbeb',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Circle cx="12" cy="11" r="5" fill={`rgba(251,146,60,${0.6 + intensity * 0.4})`}/>
              <Path d="M5 8 Q7 4 9 7 Q10 4 12 5 Q14 4 15 7 Q17 4 19 8" stroke="#fbbf24" strokeWidth="1.5" fill="none"/>
              <Circle cx="9.5" cy="10.5" r="1.2" fill="#1f0a00"/>
              <Circle cx="14.5" cy="10.5" r="1.2" fill="#1f0a00"/>
              <Path d="M10.5 13 Q12 14.5 13.5 13" stroke="#7f1d1d" strokeWidth="1" fill="none"/>
              <Path d="M12 16 L12 20 M10 17 L8 21 M14 17 L16 21" stroke="#fbbf24" strokeWidth="0.8" opacity="0.6"/>
            </Svg>
          )
        };
      } else {
        // Obsidian Dragon — Black/Gold (16-18)
        const intensity = ((lvl - 15) / 3);
        return {
          bg1: '#0a0014',
          bg2: '#7c3aed',
          border: '#fbbf24',
          glow: '#eab308',
          label: '#fde68a',
          icon: (
            <Svg width="14" height="14" viewBox="0 0 24 24">
              <Path d="M12 2 L15 7 L20 5 L17 10 L21 12 L16 13 L18 18 L12 15 L6 18 L8 13 L3 12 L7 10 L4 5 L9 7z" fill={`rgba(234,179,8,${0.5 + intensity * 0.5})`} stroke="#fbbf24" strokeWidth="0.5"/>
              <Circle cx="9.5" cy="10" r="1" fill="#1a0a00"/>
              <Circle cx="14.5" cy="10" r="1" fill="#1a0a00"/>
              <Path d="M10 12.5 Q12 14 14 12.5" stroke="#dc2626" strokeWidth="1" fill="none"/>
            </Svg>
          )
        };
      }
    };

    const config = getConfig();

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: config.border,
        backgroundColor: config.bg1,
        shadowColor: config.glow,
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 4,
      }}>
        {config.icon}
        <Text style={{ color: config.label, fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }}>
          SVIP {lvl}
        </Text>
      </View>
    );
  };


  // UI Colors mapped to activeTheme
  const getThemeColors = () => {
    switch (activeTheme) {
      case 'owl':
        return {
          text: 'text-cyan-400',
          border: 'border-cyan-500/20',
          bg: '#0891b2',
          gradient: ['#0891b2', '#0ea5e9', '#2563eb'],
          btnBg: 'bg-cyan-500'
        };
      case 'wolf':
        return {
          text: 'text-purple-400',
          border: 'border-purple-500/20',
          bg: '#a855f7',
          gradient: ['#a855f7', '#d946ef', '#ec4899'],
          btnBg: 'bg-purple-500'
        };
      case 'lion':
        return {
          text: 'text-orange-400',
          border: 'border-orange-500/20',
          bg: '#f97316',
          gradient: ['#f97316', '#f59e0b', '#ef4444'],
          btnBg: 'bg-orange-500'
        };
      case 'dragon':
        return {
          text: 'text-yellow-400',
          border: 'border-yellow-500/25',
          bg: '#eab308',
          gradient: ['#eab308', '#d97706', '#7c3aed'],
          btnBg: 'bg-amber-500'
        };
      default:
        return {
          text: 'text-cyan-400',
          border: 'border-cyan-500/20',
          bg: '#0891b2',
          gradient: ['#0891b2', '#0ea5e9', '#2563eb'],
          btnBg: 'bg-cyan-500'
        };
    }
  };

  const themeColors = getThemeColors();

  return (
    <View className="flex-1 bg-[#12093a]">
      {/* Theme-driven background — changes with selectedLevel */}
      {(() => {
        const bgTheme = SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.theme || 'owl';
        const bgGrad: [string, string, string] =
          bgTheme === 'owl'    ? ['#0d1a40', '#1a1060', '#080420'] :
          bgTheme === 'wolf'   ? ['#1a0835', '#2e0f5e', '#0d0420'] :
          bgTheme === 'lion'   ? ['#2d0a00', '#5c1a00', '#1a0500'] :
                                 ['#1a0e00', '#3d2000', '#0a0800'];
        const ambientA =
          bgTheme === 'owl'    ? '#818cf8' :
          bgTheme === 'wolf'   ? '#d946ef' :
          bgTheme === 'lion'   ? '#f97316' : '#eab308';
        const ambientB =
          bgTheme === 'owl'    ? '#22d3ee' :
          bgTheme === 'wolf'   ? '#a855f7' :
          bgTheme === 'lion'   ? '#fbbf24' : '#d97706';
        return (
          <View style={StyleSheet.absoluteFillObject}>
            <ExpoLinearGradient
              colors={bgGrad}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Ambient glow A & B — hide when badge image exists */}
            {!vipConfig?.levels?.[selectedLevel]?.badgeUrl && (
              <>
                <View style={{ position:'absolute', top:-100, left:'5%', width:340, height:340, borderRadius:170, backgroundColor:ambientA, opacity:0.2 }}/>
                <View style={{ position:'absolute', top:20, right:-40, width:260, height:260, borderRadius:130, backgroundColor:ambientB, opacity:0.12 }}/>
              </>
            )}
            {/* Ambient glow bottom */}
            <View style={{ position:'absolute', bottom:80, left:-20, width:280, height:280, borderRadius:140, backgroundColor:ambientA, opacity:0.15 }}/>
          </View>
        );
      })()}

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header Bar (Shifted Higher Up) */}
        <View className="flex-row items-center justify-between px-6 pb-2 pt-0 -mt-2">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="p-2 bg-white/5 border border-white/10 rounded-full"
          >
            <ChevronLeft size={20} color="#cbd5e1" />
          </TouchableOpacity>
          <Text className="text-sm font-black tracking-widest text-white uppercase">VIP CLUB</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity 
              onPress={() => setIsRulesOpen(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-full"
            >
              <HelpCircle size={18} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setIsSettingsOpen(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-full"
            >
              <Settings size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 mt-[230px]" showsVerticalScrollIndicator={false}>
          {/* Identity Progress Card (Shifted to start cleanly below the background Owl) */}
          <View className="bg-transparent p-5 mt-0">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 rounded-full border-2 border-purple-500/50 items-center justify-center bg-slate-900 overflow-hidden">
                {userProfile?.avatarUrl ? (
                  <Image 
                    source={{ uri: toCDN(userProfile.avatarUrl) }} 
                    style={{ width: 56, height: 56 }} 
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text className="text-white font-bold text-lg">{(userProfile?.username || 'U').charAt(0)}</Text>
                )}
              </View>
              <View className="flex-1 space-y-1">
                <Text className="text-base font-black text-white">{userProfile?.username || 'Gamer'}</Text>
                <View className="flex-row items-center gap-2">
                  {userSvipLevel > 0 ? (
                    renderUniqueBadge(userSvipLevel, false)
                  ) : (
                    <Text className="text-[9px] font-black text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 uppercase tracking-wider">Non-SVIP Member</Text>
                  )}
                  <Text className="text-[10px] text-slate-400 font-bold">ID: {userProfile?.accountNumber || '000000'}</Text>
                </View>
              </View>
            </View>

            <View className="mt-5 pt-4 border-t border-white/5 space-y-2">
              <View className="flex-row justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Text className="text-slate-400">VIP EXP PROGRESS</Text>
                <Text className="text-yellow-400">{(userProfile?.wallet?.totalSpent || 0).toLocaleString()} / {(activeLevelData.exp / 1000000).toFixed(1)}M EXP</Text>
              </View>
              <View className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                <View 
                  className="h-full bg-yellow-400 rounded-full"
                  style={{ width: `${Math.min(100, ((userProfile?.wallet?.totalSpent || 0) / activeLevelData.exp) * 100)}%` }}
                />
              </View>
              <Text className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-right">1 Coin = 1 EXP. Updates instantly.</Text>
            </View>
          </View>

          {/* Level Switcher — theme-colored per group */}
          <View className="mt-6 space-y-2">
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select SVIP Level</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 -mx-4 px-4">
              {SVIP_LEVELS_DATA.map((lvl) => {
                const isSelected = selectedLevel === lvl.level;
                const isUserLevel = userSvipLevel >= lvl.level;
                // Theme color per group
                let tabBg = '#0c1520';
                let tabBorder = '#1e3a5f';
                let tabGlow = '#0ea5e9';
                let tabText = '#7dd3fc';
                if (lvl.level >= 7 && lvl.level <= 10)  { tabBg = '#1a0a2e'; tabBorder = '#6b21a8'; tabGlow = '#a855f7'; tabText = '#d8b4fe'; }
                if (lvl.level >= 11 && lvl.level <= 15) { tabBg = '#1f0a00'; tabBorder = '#92400e'; tabGlow = '#f97316'; tabText = '#fed7aa'; }
                if (lvl.level >= 16)                    { tabBg = '#0d0a00'; tabBorder = '#78350f'; tabGlow = '#eab308'; tabText = '#fde68a'; }
                return (
                  <TouchableOpacity
                    key={lvl.level}
                    onPress={() => setSelectedLevel(lvl.level)}
                    style={{
                      marginRight: 10,
                      height: 42,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderColor: isSelected ? tabGlow : tabBorder,
                      backgroundColor: isSelected ? tabBg : 'rgba(15,15,25,0.6)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      shadowColor: isSelected ? tabGlow : 'transparent',
                      shadowOpacity: isSelected ? 0.7 : 0,
                      shadowRadius: 8,
                      elevation: isSelected ? 6 : 0,
                    }}
                  >
                    {isUserLevel && <CheckCircle size={10} color="#10b981" />}
                    <Text style={{ color: isSelected ? tabGlow : '#94a3b8', fontSize: 11, fontWeight: '800' }}>{lvl.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Tier Beast Emblem Presentation — driven by selectedLevel's theme */}
          {(() => {
            // Derive theme from selectedLevel (not user's activeTheme)
            const selTheme = SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.theme || 'owl';
            const selColors = selTheme === 'owl'    ? { bg: '#0891b2', gradient: ['#0891b2','#0ea5e9','#2563eb'] }
                           : selTheme === 'wolf'   ? { bg: '#a855f7', gradient: ['#a855f7','#d946ef','#ec4899'] }
                           : selTheme === 'lion'   ? { bg: '#f97316', gradient: ['#f97316','#f59e0b','#ef4444'] }
                           :                        { bg: '#eab308', gradient: ['#eab308','#d97706','#7c3aed'] };
            return (
          <View className="items-center justify-center py-6 mt-4">
            <View className="relative h-48 w-48 items-center justify-center">
              {/* Glow backdrop */}
              <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: selColors.bg, opacity: 0.2 }} />
              <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: selColors.bg, opacity: 0.3 }} />
              
              {vipConfig?.levels?.[selectedLevel]?.badgeUrl ? (
                <Image cachePolicy="memory-disk" source={{ uri: toCDN(vipConfig.levels[selectedLevel].badgeUrl) }} style={{ width: 160, height: 160 }} contentFit="contain" />
              ) : vipConfig?.levels?.[selectedLevel]?.videoUrl ? (
                <Video
                  source={{ uri: vipConfig.levels[selectedLevel].videoUrl }}
                  style={{ width: 160, height: 160, borderRadius: 80 }}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted
                />
              ) : vipConfig?.levels?.[selectedLevel]?.imageUrl ? (
                <Image cachePolicy="memory-disk" source={{ uri: vipConfig.levels[selectedLevel].imageUrl }} style={{ width: 160, height: 160, borderRadius: 80 }} contentFit="cover" />
              ) : (
                <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
                  <AnimatedMascot theme={selTheme} colors={selColors} level={selectedLevel} />
                </View>
              )}
            </View>

            {/* Circular Podium Base */}
            <View className="w-64 h-8 bg-slate-900 border border-white/10 rounded-full mt-2 items-center justify-center">
              <View className="h-1.5 w-12 bg-white/30 rounded-full" />
            </View>

            <View className="items-center mt-4">
              <Text className="text-white text-lg font-black uppercase">
                {SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.name} • {selTheme.toUpperCase()}
              </Text>
              <Text style={{ color: selColors.gradient[1] }} className="text-xs font-bold text-center">
                {selTheme === 'owl'   ? 'Owl Domain'       :
                 selTheme === 'wolf'  ? 'Wolf Sanctuary'   :
                 selTheme === 'lion'  ? 'Lion Arena'       : 'Dragon Dynasty'}
              </Text>
            </View>
          </View>
            );
          })()}

          {/* Counters Banner */}
          <View className="flex-row items-center justify-between bg-white/5 border border-white/10 rounded-3xl p-4 mt-6">
            <View className="space-y-0.5">
              <Text className="text-[9px] font-black uppercase text-slate-400">SVIP BENEFITS</Text>
              <Text className="text-white font-bold text-sm">Unlocked: {unlockedCount} / 31</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setIsSettingsOpen(true)}
              className="bg-white/10 px-3 py-2 border border-white/20 rounded-xl"
            >
              <Text className="text-[10px] font-black uppercase text-white tracking-wider">Stealth Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Privileges Grid */}
          <View className="mt-8 mb-24 flex-row flex-wrap justify-between">
            {SVIP_PRIVILEGES_DATA.map((benefit) => {
              const isUnlocked = benefit.level <= userSvipLevel;
              const BenefitIcon = benefit.icon;
              return (
                <View 
                  key={benefit.id}
                  style={{ width: (width - 48) / 3 }}
                  className={`p-3 border rounded-2xl items-center text-center gap-1.5 mb-3 relative ${
                    isUnlocked ? 'bg-slate-950/60 border-amber-500/20' : 'bg-slate-950/30 border-white/5 opacity-40'
                  }`}
                >
                  {!isUnlocked && (
                    <View className="absolute top-1.5 right-1.5 p-0.5 bg-black/60 rounded-full">
                      <Lock size={8} color="#94a3b8" />
                    </View>
                  )}
                  <View className={`h-9 w-9 rounded-xl items-center justify-center border ${
                    isUnlocked ? 'bg-amber-500/10 border-amber-500/20 text-yellow-400' : 'bg-white/5 border-white/10 text-slate-500'
                  }`}>
                    <BenefitIcon size={16} color={isUnlocked ? '#fbbf24' : '#64748b'} />
                  </View>
                  <Text className="text-white text-[9px] font-black text-center truncate max-w-full" numberOfLines={1}>{benefit.name}</Text>
                  <Text className="text-[7px] text-slate-400 font-bold uppercase">SVIP {benefit.level}+</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Upgrade Button */}
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-slate-950/90 border-t border-white/5">
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => setIsRulesOpen(true)}
              className="h-12 px-5 bg-white/5 border border-white/10 rounded-xl items-center justify-center"
            >
              <Text className="text-white text-xs font-bold uppercase tracking-wider">Rules</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setIsPurchaseOpen(true)}
              className={`flex-1 h-12 rounded-xl items-center justify-center flex-row gap-2 ${themeColors.btnBg}`}
            >
              <Zap size={14} color="#fff" fill="#fff" />
              <Text className="text-white font-bold text-sm uppercase tracking-wider">UPGRADE SVIP</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Stealth settings Modal */}
        <Modal
          visible={isSettingsOpen}
          onRequestClose={() => setIsSettingsOpen(false)}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#070914] border-t border-white/10 rounded-t-3xl p-5 space-y-5">
              <View className="flex-row items-center justify-between pb-3 border-b border-white/5">
                <View>
                  <Text className="text-sm font-black text-white uppercase tracking-wider">PRIVILEGE STEALTH</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configure hidden immunity options</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsSettingsOpen(false)}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg"
                >
                  <Text className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Close</Text>
                </TouchableOpacity>
              </View>

              <View className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex-row justify-between items-center">
                <Text className="text-[10px] font-black text-slate-400 uppercase">Your Active Level:</Text>
                {renderUniqueBadge(userSvipLevel, false)}
              </View>

              <ScrollView className="max-h-96 space-y-3">
                {[
                  { key: 'mysteriousVisitor', label: 'Mysterious Visitor', desc: 'Visit other user profiles completely incognito.', reqLevel: 5 },
                  { key: 'hideGiftRecord', label: 'Hide Gift Record', desc: 'Prevent gift list updates from showing in public rooms.', reqLevel: 8 },
                  { key: 'rankInvisible', label: 'Rank Invisible', desc: 'Hide your username and score entirely from leaderboards.', reqLevel: 9 },
                  { key: 'roomInvisible', label: 'Room Invisible', desc: 'Enter any chatroom with absolute silence and stealth.', reqLevel: 12 },
                  { key: 'avoidBeingKicked', label: 'Avoid Being Kicked', desc: 'Absolute immunity to all room kicks, bans, or mutes.', reqLevel: 13 },
                ].map((sw) => {
                  const isLocked = userSvipLevel < sw.reqLevel;
                  const isActive = stealthSettings[sw.key as keyof typeof stealthSettings];
                  return (
                    <View 
                      key={sw.key}
                      className={`p-4 rounded-xl border flex-row items-center justify-between mb-3 ${
                        isLocked ? 'bg-black/40 border-white/5 opacity-40' : 'bg-slate-900/60 border-white/10'
                      }`}
                    >
                      <View className="flex-1 mr-4">
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text className="text-white text-xs font-black">{sw.label}</Text>
                          {isLocked ? (
                            <Text className="text-[8px] font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-400/20 uppercase tracking-wider">SVIP {sw.reqLevel}+</Text>
                          ) : (
                            <Text className="text-[8px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 uppercase tracking-wider">Unlocked</Text>
                          )}
                        </View>
                        <Text className="text-slate-400 text-[9px] font-medium leading-normal">{sw.desc}</Text>
                      </View>
                      <TouchableOpacity
                        disabled={isLocked}
                        onPress={() => handleToggleChange(sw.key as keyof typeof stealthSettings, sw.reqLevel)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors relative justify-center ${
                          isActive ? 'bg-yellow-400 items-end' : 'bg-slate-800 items-start'
                        }`}
                      >
                        <View className="w-4 h-4 bg-white rounded-full shadow-md" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* 2. Rules introduction Modal */}
        <Modal
          visible={isRulesOpen}
          onRequestClose={() => setIsRulesOpen(false)}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#070914] border-t border-white/10 rounded-t-3xl p-5 space-y-4 max-h-[85vh]">
              <View className="flex-row items-center justify-between pb-3 border-b border-white/5">
                <View>
                  <Text className="text-sm font-black text-white uppercase tracking-wider">SVIP RULES & VALIDITY</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Validity, Maintenance & EXP Guidelines</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsRulesOpen(false)}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg"
                >
                  <Text className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Close</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="space-y-4" showsVerticalScrollIndicator={false}>
                <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                  <Text className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-1.5">1. EXP Earning Principles</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Earn exactly 1 EXP for every 1 Coin purchased.</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• Points are added instantly to your total spent accumulation.</Text>
                  <Text className="text-slate-400 text-xs font-medium leading-relaxed">• EXP deductions are made in case of processed chargebacks or refunds.</Text>
                </View>

                <View className="space-y-2 mb-4">
                  <Text className="text-yellow-400 text-[10px] font-black uppercase tracking-widest ml-1">2. Level Threshold EXP Table</Text>
                  <View className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/60">
                    <View className="flex-row bg-white/5 py-2 px-3 border-b border-white/5">
                      <Text className="flex-1 text-slate-400 text-[9px] font-black uppercase">Level</Text>
                      <Text className="flex-1 text-slate-400 text-[9px] font-black uppercase text-center">EXP Required</Text>
                      <Text className="flex-1 text-slate-400 text-[9px] font-black uppercase text-right">Animal Theme</Text>
                    </View>
                    {SVIP_LEVELS_DATA.map((lvl) => (
                      <View key={lvl.level} className="flex-row py-2 px-3 border-b border-white/5">
                        <Text className="flex-1 text-white text-[10px] font-bold">SVIP {lvl.level}</Text>
                        <Text className="flex-1 text-yellow-400 text-[10px] font-bold text-center">{lvl.points} EXP</Text>
                        <Text className="flex-1 text-slate-400 text-[9px] font-bold text-right uppercase">{lvl.theme}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* 3. Purchase SVIP Modal */}
        <Modal
          visible={isPurchaseOpen}
          onRequestClose={() => setIsPurchaseOpen(false)}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#070914] border-t border-white/10 rounded-t-3xl p-5 space-y-4 max-h-[85vh]">
              <View className="flex-row items-center justify-between pb-3 border-b border-white/5">
                <View>
                  <Text className="text-sm font-black text-white uppercase tracking-wider">Upgrade SVIP</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Purchase EXP with coins</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsPurchaseOpen(false)}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg"
                >
                  <Text className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Close</Text>
                </TouchableOpacity>
              </View>

              {/* Current Status */}
              <View className="bg-white/5 border border-white/10 rounded-xl p-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[10px] font-black text-slate-400 uppercase">Your Current Level</Text>
                  {renderUniqueBadge(userSvipLevel, false)}
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-[10px] font-bold text-slate-400">EXP</Text>
                  <Text className="text-yellow-400 text-xs font-black">{(userProfile?.wallet?.totalSpent || 0).toLocaleString('en-IN')} / {(activeLevelData.exp).toLocaleString('en-IN')}</Text>
                </View>
                <View className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5 mt-2">
                  <View 
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${Math.min(100, ((userProfile?.wallet?.totalSpent || 0) / activeLevelData.exp) * 100)}%` }}
                  />
                </View>
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-[9px] font-bold text-slate-500">Coins Balance</Text>
                  <Text className="text-white text-xs font-black">{(userProfile?.wallet?.coins || 0).toLocaleString('en-IN')}</Text>
                </View>
              </View>

              {/* Level Selection */}
              <ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Target Level</Text>
                <View className="space-y-2">
                  {SVIP_LEVELS_DATA.map((lvl) => {
                    const currentSpent = userProfile?.wallet?.totalSpent || 0;
                    const isAlreadyReached = currentSpent >= lvl.exp;
                    const isSelected = selectedLevel === lvl.level;
                    const isNextUnlocked = lvl.level === userSvipLevel + 1 || isAlreadyReached;
                    const cost = isAlreadyReached ? 0 : Math.max(0, lvl.exp - currentSpent);

                    return (
                      <TouchableOpacity
                        key={lvl.level}
                        disabled={isAlreadyReached}
                        onPress={() => setSelectedLevel(lvl.level)}
                        className={`p-3 rounded-xl border flex-row items-center justify-between ${
                          isSelected ? 'bg-purple-600/20 border-purple-400/50' : 
                          isAlreadyReached ? 'bg-emerald-500/10 border-emerald-500/20' : 
                          'bg-white/5 border-white/10'
                        }`}
                      >
                        <View className="flex-row items-center gap-3">
                          {isAlreadyReached ? (
                            <CheckCircle size={16} color="#10b981" />
                          ) : (
                            <View className="w-4 h-4 rounded-full border-2 border-white/30 items-center justify-center">
                              {isSelected && <View className="w-2 h-2 rounded-full bg-purple-400" />}
                            </View>
                          )}
                          <View>
                            <Text className={`text-xs font-black ${isAlreadyReached ? 'text-emerald-400' : 'text-white'}`}>{lvl.name}</Text>
                            <Text className="text-[9px] text-slate-400 font-bold">{lvl.points} EXP • {lvl.theme}</Text>
                          </View>
                        </View>
                        <View className="items-end">
                          {isAlreadyReached ? (
                            <Text className="text-[9px] font-black text-emerald-400 uppercase">Reached</Text>
                          ) : (
                            <Text className="text-[10px] font-black text-yellow-400">{cost.toLocaleString('en-IN')} coins</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Buy Button */}
              <View className="pt-2">
                <TouchableOpacity
                  onPress={handlePurchaseSvip}
                  disabled={isPurchasing || (userProfile?.wallet?.totalSpent || 0) >= SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.exp}
                  className={`h-14 rounded-2xl items-center justify-center flex-row gap-2 ${
                    (userProfile?.wallet?.totalSpent || 0) >= SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.exp
                      ? 'bg-slate-800' : themeColors.btnBg
                  }`}
                >
                  {isPurchasing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Zap size={16} color="#fff" fill="#fff" />
                      <Text className="text-white font-black text-sm uppercase tracking-wider">
                        {(userProfile?.wallet?.totalSpent || 0) >= SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.exp
                          ? 'Already Reached' : `Buy SVIP ${selectedLevel}`
                        }
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text className="text-[8px] text-slate-500 text-center mt-2 font-bold">1 Coin = 1 EXP. Upgrade is instant.</Text>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>

      {/* Background — badge image ya creature */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {(() => {
          const bgTheme = SVIP_LEVELS_DATA.find(l => l.level === selectedLevel)?.theme || 'owl';
          const badgeUrl = vipConfig?.levels?.[selectedLevel]?.badgeUrl;
          if (badgeUrl) {
            return (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400, alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                <Image cachePolicy="memory-disk" source={{ uri: toCDN(badgeUrl) }} style={{ width: 300, height: 300 }} contentFit="contain" />
              </View>
            );
          }
          return (
            <>
              <BackgroundMascot theme={bgTheme} />
              {/* Ambient star dust */}
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
                <Circle cx="25%" cy="15%" r="1.2" fill="#ffd700" opacity="0.8"/>
                <Circle cx="75%" cy="25%" r="1" fill="#fff" opacity="0.5"/>
                <Circle cx="10%" cy="40%" r="1.5" fill="#ffaa00" opacity="0.7"/>
                <Circle cx="88%" cy="45%" r="1" fill="#fff" opacity="0.4"/>
                <Circle cx="30%" cy="65%" r="1.3" fill="#ffd700" opacity="0.6"/>
                <Circle cx="70%" cy="75%" r="1.5" fill="#fff" opacity="0.7"/>
              </Svg>
            </>
          );
        })()}
      </View>
    </View>
  );
}

