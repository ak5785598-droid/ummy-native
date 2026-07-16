import React, { memo } from 'react';
import { View, Text, Animated, StyleSheet, Easing, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Ellipse, Defs, LinearGradient as SvgLinearGradient, RadialGradient as SvgRadialGradient, Stop } from 'react-native-svg';

const LOCAL_BUBBLE_ASSETS: Record<string, any> = {
  'b-cosmic-star': require('../../assets/images/cosmic_star_bubble_v2.png'),
  'b-royal-gold': require('../../assets/images/royal_gold_bubble_v2.png'),
};

const EvilBubbleLeftOrnament = () => (
  <Svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="devilWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#ec4899" />
        <Stop offset="50%" stopColor="#dc2626" />
        <Stop offset="100%" stopColor="#450a0a" />
      </SvgLinearGradient>
    </Defs>
    {/* Left Devil Wing main body */}
    <Path
      d="M90,30 C75,25 45,35 25,55 C18,62 12,72 8,82 C20,78 35,74 50,77 C40,63 48,50 65,42 C55,38 70,30 90,30 Z"
      fill="url(#devilWingGrad)"
    />
    {/* Secondary wing layer */}
    <Path
      d="M85,45 C73,42 50,50 35,67 C30,72 26,80 23,90 C31,86 42,83 54,85 C46,75 52,65 67,59 C60,56 72,50 85,45 Z"
      fill="url(#devilWingGrad)"
      opacity="0.85"
    />
    {/* Horn accent */}
    <Path
      d="M15,20 C18,30 25,38 32,45 C28,42 22,35 18,25 Z"
      fill="#dc2626"
    />
  </Svg>
);

const EvilBubbleRightOrnament = () => (
  <Svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="goldPotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fef08a" />
        <Stop offset="50%" stopColor="#ca8a04" />
        <Stop offset="100%" stopColor="#854d0e" />
      </SvgLinearGradient>
      <SvgRadialGradient id="pinkGem" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="#ffffff" />
        <Stop offset="35%" stopColor="#f472b6" />
        <Stop offset="100%" stopColor="#db2777" />
      </SvgRadialGradient>
    </Defs>
    {/* Gold Pot base and body */}
    <Circle cx="50" cy="65" r="28" fill="url(#goldPotGrad)" stroke="#fef9c3" strokeWidth="1" />
    <Ellipse cx="50" cy="42" rx="22" ry="7" fill="url(#goldPotGrad)" stroke="#fef9c3" strokeWidth="1" />
    <Ellipse cx="50" cy="42" rx="18" ry="4" fill="#4a044e" />
    
    {/* Glowing pink gems overflowing */}
    <Circle cx="38" cy="38" r="8" fill="url(#pinkGem)" />
    <Circle cx="50" cy="35" r="9" fill="url(#pinkGem)" />
    <Circle cx="62" cy="38" r="8" fill="url(#pinkGem)" />
    <Circle cx="44" cy="29" r="8" fill="url(#pinkGem)" />
    <Circle cx="56" cy="29" r="8" fill="url(#pinkGem)" />

    {/* Sparkles */}
    <Path d="M42,12 L44,18 L50,20 L44,22 L42,28 L40,22 L34,20 L40,18 Z" fill="#ffffff" opacity="0.9" />
  </Svg>
);

const HeartBubbleLeftOrnament = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#ff9a9e" />
        <Stop offset="100%" stopColor="#fecfef" />
      </SvgLinearGradient>
      <SvgLinearGradient id="heartGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#f43f5e" />
        <Stop offset="100%" stopColor="#be185d" />
      </SvgLinearGradient>
    </Defs>
    <Path
      d="M20,12 C16,4 4,6 4,18 C4,28 17,36 20,38 C23,36 36,28 36,18 C36,6 24,4 20,12 Z"
      fill="url(#heartGrad2)"
    />
    <Path
      d="M10,8 C8,4 2,5 2,11 C2,16 8.5,20 10,21 C11.5,20 18,16 18,11 C18,5 12,4 10,8 Z"
      fill="url(#heartGrad)"
      transform="translate(18, 2) scale(0.6)"
    />
  </Svg>
);

const HeartBubbleRightOrnament = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="petalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fbcfe8" />
        <Stop offset="100%" stopColor="#ec4899" />
      </SvgLinearGradient>
      <SvgLinearGradient id="flowerCenterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fef08a" />
        <Stop offset="100%" stopColor="#ca8a04" />
      </SvgLinearGradient>
    </Defs>
    <Circle cx="20" cy="11" r="7" fill="url(#petalGrad)" />
    <Circle cx="11" cy="17" r="7" fill="url(#petalGrad)" />
    <Circle cx="29" cy="17" r="7" fill="url(#petalGrad)" />
    <Circle cx="15" cy="28" r="7" fill="url(#petalGrad)" />
    <Circle cx="25" cy="28" r="7" fill="url(#petalGrad)" />
    <Circle cx="20" cy="20" r="6" fill="url(#flowerCenterGrad)" stroke="#ffffff" strokeWidth="1" />
  </Svg>
);

const LoveBubbleLeftOrnament = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fca5a5" />
        <Stop offset="50%" stopColor="#ef4444" />
        <Stop offset="100%" stopColor="#b91c1c" />
      </SvgLinearGradient>
    </Defs>
    <Path d="M20,20 C10,10 5,18 20,20 Z" fill="url(#ribbonGrad)" stroke="#fee2e2" strokeWidth="0.5" />
    <Path d="M20,20 C30,10 35,18 20,20 Z" fill="url(#ribbonGrad)" stroke="#fee2e2" strokeWidth="0.5" />
    <Path d="M20,20 C15,25 10,35 8,36 C10,34 18,25 20,20 Z" fill="url(#ribbonGrad)" />
    <Path d="M20,20 C25,25 30,35 32,36 C30,34 22,25 20,20 Z" fill="url(#ribbonGrad)" />
    <Circle cx="20" cy="20" r="3.5" fill="#fecaca" stroke="#b91c1c" strokeWidth="0.5" />
  </Svg>
);

const LoveBubbleRightOrnament = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fecaca" />
        <Stop offset="100%" stopColor="#f87171" />
      </SvgLinearGradient>
      <SvgLinearGradient id="ribbonGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fef08a" />
        <Stop offset="100%" stopColor="#eab308" />
      </SvgLinearGradient>
    </Defs>
    <Path d="M8,15 L32,15 L32,36 L8,36 Z" fill="url(#boxGrad)" stroke="#ef4444" strokeWidth="1" />
    <Path d="M6,10 L34,10 L34,16 L6,16 Z" fill="#ef4444" />
    <Path d="M18,10 L22,10 L22,36 L18,36 Z" fill="url(#ribbonGoldGrad)" />
    <Path d="M8,22 L32,22 L32,25 L8,25 Z" fill="url(#ribbonGoldGrad)" />
    <Path d="M20,10 C15,3 15,10 20,10 Z" fill="url(#ribbonGoldGrad)" stroke="#ca8a04" strokeWidth="0.5" />
    <Path d="M20,10 C25,3 25,10 20,10 Z" fill="url(#ribbonGoldGrad)" stroke="#ca8a04" strokeWidth="0.5" />
  </Svg>
);

const CandyBubbleLeftOrnament = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="candyWrapperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#a5f3fc" />
        <Stop offset="100%" stopColor="#38bdf8" />
      </SvgLinearGradient>
      <SvgLinearGradient id="candyBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fbcfe8" />
        <Stop offset="50%" stopColor="#ec4899" />
        <Stop offset="100%" stopColor="#be185d" />
      </SvgLinearGradient>
    </Defs>
    <Path d="M12,20 L4,13 L4,27 Z" fill="url(#candyWrapperGrad)" stroke="#0284c7" strokeWidth="0.5" />
    <Path d="M28,20 L36,13 L36,27 Z" fill="url(#candyWrapperGrad)" stroke="#0284c7" strokeWidth="0.5" />
    <Ellipse cx="20" cy="20" rx="9" ry="7.5" fill="url(#candyBodyGrad)" stroke="#ffffff" strokeWidth="1" />
    <Path d="M17,13 C19,17 19,23 17,27" stroke="#ffffff" strokeWidth="1.5" fill="none" />
    <Path d="M23,13 C25,17 25,23 23,27" stroke="#ffffff" strokeWidth="1.5" fill="none" />
  </Svg>
);

const CandyBubbleRightOrnament = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="doughGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fed7aa" />
        <Stop offset="100%" stopColor="#ca8a04" />
      </SvgLinearGradient>
      <SvgLinearGradient id="icingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#f472b6" />
        <Stop offset="100%" stopColor="#db2777" />
      </SvgLinearGradient>
    </Defs>
    <Path
      d="M20,3 A17,17 0 1,0 20,37 A17,17 0 1,0 20,3 Z M20,14 A6,6 0 1,1 20,26 A6,6 0 1,1 20,14 Z"
      fill="url(#doughGrad)"
      fillRule="evenodd"
    />
    <Path
      d="M20,5 C28.28,5 35,11.72 35,20 C35,28.28 28.28,35 20,35 C11.72,35 5,28.28 5,20 C5,13 10,7.5 17,5.5 C18,7 19,8 20,8 C21,8 22,7 23,5.5 C20.7,5.1 20,5 20,5 Z M20,14 A6,6 0 1,1 20,26 A6,6 0 1,1 20,14 Z"
      fill="url(#icingGrad)"
      fillRule="evenodd"
    />
    <Path d="M12,14 L14,12" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M26,14 L28,16" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M13,26 L15,25" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M26,26 L27,24" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
    <Path d="M20,10 L22,9" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const CosmicBubbleLeftWing = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="cosmicWingGradL" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#c084fc" />
        <Stop offset="100%" stopColor="#818cf8" />
      </SvgLinearGradient>
    </Defs>
    <Path d="M40,10 C25,5, 10,15, 2,30 C10,25, 20,25, 30,20 Q20,15, 40,10 Z" fill="url(#cosmicWingGradL)" />
    <Circle cx="15" cy="18" r="2.5" fill="#fde047" />
  </Svg>
);

const CosmicBubbleRightWing = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="cosmicWingGradR" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#c084fc" />
        <Stop offset="100%" stopColor="#818cf8" />
      </SvgLinearGradient>
    </Defs>
    <Path d="M0,10 C15,5, 30,15, 38,30 C30,25, 20,25, 10,20 Q20,15, 0,10 Z" fill="url(#cosmicWingGradR)" />
    <Circle cx="25" cy="18" r="2.5" fill="#fde047" />
  </Svg>
);

const RoyalBubbleLeftWing = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="goldWingGradL" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fef08a" />
        <Stop offset="100%" stopColor="#ca8a04" />
      </SvgLinearGradient>
    </Defs>
    <Path d="M40,5 C30,0, 15,10, 5,22 Q15,20, 25,25 Q35,15, 40,5 Z" fill="url(#goldWingGradL)" />
    <Path d="M35,12 C28,15, 22,25, 18,32 Q25,28, 30,30 C35,22, 35,15, 35,12 Z" fill="url(#goldWingGradL)" opacity="0.8" />
  </Svg>
);

const RoyalBubbleRightWing = () => (
  <Svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }}>
    <Defs>
      <SvgLinearGradient id="goldWingGradR" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fef08a" />
        <Stop offset="100%" stopColor="#ca8a04" />
      </SvgLinearGradient>
    </Defs>
    <Path d="M0,5 C10,0, 25,10, 35,22 Q25,20, 15,25 Q5,15, 0,5 Z" fill="url(#goldWingGradR)" />
    <Path d="M5,12 C12,15, 18,25, 22,32 Q15,28, 10,30 C5,22, 5,15, 5,12 Z" fill="url(#goldWingGradR)" opacity="0.8" />
  </Svg>
);

const BUBBLE_DECORATORS: Record<string, Record<string, { node: React.ReactNode; style: any }>> = {
  'evil-bubble': {
    left: { node: <EvilBubbleLeftOrnament />, style: { left: -9, top: -3, width: 18, height: 18 } },
    right: { node: <EvilBubbleRightOrnament />, style: { right: -9, bottom: -3, width: 21, height: 21 } },
  },
  'heart-bubble': {
    left: { node: <HeartBubbleLeftOrnament />, style: { left: -9, top: -3, width: 20, height: 20 } },
    right: { node: <HeartBubbleRightOrnament />, style: { right: -9, bottom: -3, width: 20, height: 20 } },
  },
  'love-bubble': {
    left: { node: <LoveBubbleLeftOrnament />, style: { left: -9, top: -3, width: 20, height: 20 } },
    right: { node: <LoveBubbleRightOrnament />, style: { right: -9, bottom: -3, width: 20, height: 20 } },
  },
  'candy-bubble': {
    left: { node: <CandyBubbleLeftOrnament />, style: { left: -9, top: -3, width: 20, height: 20 } },
    right: { node: <CandyBubbleRightOrnament />, style: { right: -9, bottom: -3, width: 20, height: 20 } },
  },
  'royal-gold': {
    topCenter: { node: <Text style={{ fontSize: 9 }}>👑</Text>, style: { top: -8, left: '50%', marginLeft: -7, zIndex: 12 } },
    bottomRight: { node: <Text style={{ fontSize: 7 }}>✨</Text>, style: { bottom: -4, right: -4, zIndex: 12 } },
  },
  'ice-crystal': {
    topLeft: { node: <Text style={{ fontSize: 8 }}>❄️</Text>, style: { top: -5, left: -5, zIndex: 12 } },
    topRight: { node: <Text style={{ fontSize: 8 }}>❄️</Text>, style: { top: -5, right: -5, zIndex: 12 } },
  },
  'neon-cyber': {
    topLeft: { node: <Text style={{ fontSize: 7 }}>⚡</Text>, style: { top: -4, left: -4, zIndex: 12 } },
    bottomRight: { node: <Text style={{ fontSize: 7 }}>🛸</Text>, style: { bottom: -4, right: -4, zIndex: 12 } },
  },
  'halloween-2025': {
    topLeft: { node: <Text style={{ fontSize: 8 }}>🦇</Text>, style: { top: -5, left: -5, zIndex: 12 } },
    bottomRight: { node: <Text style={{ fontSize: 8 }}>🎃</Text>, style: { bottom: -5, right: -5, zIndex: 12 } },
  },
  'christmas-2025': {
    topLeft: { node: <Text style={{ fontSize: 8 }}>🎅</Text>, style: { top: -6, left: -6, zIndex: 12 } },
    bottomRight: { node: <Text style={{ fontSize: 8 }}>🎁</Text>, style: { bottom: -5, right: -5, zIndex: 12 } },
  },
  'destiny-battle-a': {
    leftCenter: { node: <Text style={{ fontSize: 8 }}>🛡️</Text>, style: { left: -6, top: '42%', zIndex: 12 } },
    rightCenter: { node: <Text style={{ fontSize: 8 }}>⚔️</Text>, style: { right: -6, top: '42%', zIndex: 12 } },
  },
  'coin-seller': {
    bottomLeft: { node: <Text style={{ fontSize: 8 }}>🪙</Text>, style: { bottom: -5, left: 4, zIndex: 12 } },
    bottomRight: { node: <Text style={{ fontSize: 8 }}>💰</Text>, style: { bottom: -5, right: -5, zIndex: 12 } },
  },
  'zodiac-2026': {
    topLeft: { node: <Text style={{ fontSize: 8 }}>🪐</Text>, style: { top: -5, left: -5, zIndex: 12 } },
    bottomRight: { node: <Text style={{ fontSize: 8 }}>⭐</Text>, style: { bottom: -4, right: -4, zIndex: 12 } },
  },
  'b-cosmic-star': {
    left: { node: <CosmicBubbleLeftWing />, style: { left: -14, top: 4, width: 28, height: 28 } },
    right: { node: <CosmicBubbleRightWing />, style: { right: -14, top: 4, width: 28, height: 28 } }
  },
  'b-royal-gold': {
    left: { node: <RoyalBubbleLeftWing />, style: { left: -14, top: 4, width: 28, height: 28 } },
    right: { node: <RoyalBubbleRightWing />, style: { right: -14, top: 4, width: 28, height: 28 } }
  }
};

interface ChatMessageBubbleProps {
  bubbleId?: string | null;
  bubbleMediaUrl?: string | null;
  isMe: boolean;
  children: React.ReactNode;
  showTail?: boolean;
  style?: any;
}

const STYLE_CONFIGS: Record<string, { colors: string[]; border: string; tailColor: string; decorator: string; borderWidth?: number; borderStyle?: 'solid' | 'dashed' | 'dotted'; animation?: 'shine' | 'sparkles' | 'roses' | 'snowfall' | 'candy' }> = {
  'heart-bubble': { colors: ['#f472b6', '#db2777', '#be185d'], border: 'rgba(255,255,255,0.45)', tailColor: '#db2777', decorator: '💖', borderWidth: 1.5, borderStyle: 'solid', animation: 'roses' },
  'love-bubble': { colors: ['#f87171', '#dc2626', '#991b1b'], border: 'rgba(255,255,255,0.35)', tailColor: '#dc2626', decorator: '💌', borderWidth: 2, borderStyle: 'solid', animation: 'roses' },
  'evil-bubble': { colors: ['#3b0764', '#6b21a8', '#a855f7'], border: 'rgba(168,85,247,0.6)', tailColor: '#6b21a8', decorator: '😈', borderWidth: 2, borderStyle: 'solid', animation: 'shine' },
  'candy-bubble': { colors: ['#a5f3fc', '#fbcfe8', '#f472b6'], border: 'rgba(255,255,255,0.6)', tailColor: '#fbcfe8', decorator: '🍭', borderWidth: 2, borderStyle: 'dashed', animation: 'candy' },
  'taurus-2025': { colors: ['#fb923c', '#ea580c', '#c2410c'], border: 'rgba(255,255,255,0.5)', tailColor: '#ea580c', decorator: '♉', borderWidth: 1.5, borderStyle: 'solid' },
  'cricket-2025': { colors: ['#34d399', '#059669', '#065f46'], border: 'rgba(255,255,255,0.5)', tailColor: '#059669', decorator: '🏏', borderWidth: 1.5, borderStyle: 'solid' },
  'neon-cyber': { colors: ['#020617', '#0f172a', '#1e1b4b'], border: '#00ffff', tailColor: '#0f172a', decorator: '✨', borderWidth: 2, borderStyle: 'solid', animation: 'shine' },
  'royal-gold': { colors: ['#fef08a', '#ca8a04', '#854d0e'], border: '#fef9c3', tailColor: '#ca8a04', decorator: '👑', borderWidth: 2.2, borderStyle: 'solid', animation: 'shine' },
  'ice-crystal': { colors: ['#e0f2fe', '#38bdf8', '#0369a1'], border: '#ffffff', tailColor: '#38bdf8', decorator: '❄️', borderWidth: 1, borderStyle: 'solid', animation: 'snowfall' },
  'gemini-2025': { colors: ['#3b82f6', '#1d4ed8', '#1e3a8a'], border: 'rgba(255,255,255,0.4)', tailColor: '#1d4ed8', decorator: '♊', borderWidth: 1.5, borderStyle: 'solid' },
  'cacer-2025': { colors: ['#f97316', '#ea580c', '#9a3412'], border: 'rgba(255,255,255,0.4)', tailColor: '#ea580c', decorator: '♋', borderWidth: 1.5, borderStyle: 'solid' },
  'leo-2025': { colors: ['#fbbf24', '#f59e0b', '#b45309'], border: 'rgba(255,255,255,0.45)', tailColor: '#f59e0b', decorator: '♌', borderWidth: 2, borderStyle: 'solid' },
  'pakistan-daily': { colors: ['#065f46', '#047857', '#064e3b'], border: 'rgba(255,255,255,0.4)', tailColor: '#047857', decorator: '🇵🇰', borderWidth: 1.5, borderStyle: 'solid' },
  'india-daily': { colors: ['#1e3a8a', '#1e40af', '#064e3b'], border: 'rgba(255,255,255,0.4)', tailColor: '#1e40af', decorator: '🇮🇳', borderWidth: 1.5, borderStyle: 'solid' },
  'virgo-2025': { colors: ['#ec4899', '#db2777', '#701a75'], border: 'rgba(255,255,255,0.4)', tailColor: '#db2777', decorator: '♍', borderWidth: 1.5, borderStyle: 'solid' },
  'dussehra-2025': { colors: ['#78350f', '#9a3412', '#451a03'], border: 'rgba(255,255,255,0.4)', tailColor: '#9a3412', decorator: '🏹', borderWidth: 1.5, borderStyle: 'solid' },
  'libra-2025': { colors: ['#0d9488', '#0f766e', '#115e59'], border: 'rgba(255,255,255,0.4)', tailColor: '#0f766e', decorator: '⚖️', borderWidth: 1.5, borderStyle: 'solid' },
  'lights-festival': { colors: ['#064e3b', '#0f766e', '#1e3a8a'], border: 'rgba(255,255,255,0.5)', tailColor: '#0f766e', decorator: '🪔', borderWidth: 1.8, borderStyle: 'dotted' },
  'halloween-2025': { colors: ['#581c87', '#3b0764', '#090514'], border: 'rgba(168,85,247,0.5)', tailColor: '#3b0764', decorator: '🎃', borderWidth: 2, borderStyle: 'solid', animation: 'sparkles' },
  'scorpio-2025': { colors: ['#818cf8', '#4f46e5', '#312e81'], border: 'rgba(255,255,255,0.4)', tailColor: '#4f46e5', decorator: '🦂', borderWidth: 1.5, borderStyle: 'solid' },
  'sagittarius-2025': { colors: ['#ff8a65', '#e64a19', '#bf360c'], border: 'rgba(255,255,255,0.4)', tailColor: '#e64a19', decorator: '🏹', borderWidth: 1.5, borderStyle: 'solid' },
  'coin-seller': { colors: ['#047857', '#065f46', '#14532d'], border: 'rgba(255,255,255,0.45)', tailColor: '#065f46', decorator: '🪙', borderWidth: 2, borderStyle: 'dashed' },
  'annual-player': { colors: ['#854d0e', '#a16207', '#451a03'], border: 'rgba(255,255,255,0.4)', tailColor: '#a16207', decorator: '🏆', borderWidth: 2.2, borderStyle: 'solid', animation: 'sparkles' },
  'christmas-2025': { colors: ['#b91c1c', '#991b1b', '#7f1d1d'], border: 'rgba(255,255,255,0.5)', tailColor: '#991b1b', decorator: '🎄', borderWidth: 2, borderStyle: 'solid', animation: 'snowfall' },
  'capricorn-2025': { colors: ['#6b21a8', '#581c87', '#2e1065'], border: 'rgba(255,255,255,0.4)', tailColor: '#581c87', decorator: '♑', borderWidth: 1.5, borderStyle: 'solid' },
  'newyear-2026': { colors: ['#991b1b', '#7f1d1d', '#ca8a04'], border: 'rgba(255,255,255,0.5)', tailColor: '#7f1d1d', decorator: '✨', borderWidth: 2, borderStyle: 'dashed', animation: 'sparkles' },
  'republic-day-2026': { colors: ['#c2410c', '#0f766e', '#166534'], border: 'rgba(255,255,255,0.5)', tailColor: '#0f766e', decorator: '🇮🇳', borderWidth: 1.8, borderStyle: 'solid' },
  'aquarius-2026': { colors: ['#06b6d4', '#0891b2', '#155e75'], border: 'rgba(255,255,255,0.4)', tailColor: '#0891b2', decorator: '♒', borderWidth: 1.5, borderStyle: 'solid' },
  'valentines-2026': { colors: ['#f43f5e', '#be185d', '#9d174d'], border: 'rgba(255,255,255,0.5)', tailColor: '#be185d', decorator: '🌹', borderWidth: 2, borderStyle: 'solid', animation: 'roses' },
  'ramadan-2026-s': { colors: ['#1d4ed8', '#1e40af', '#1e3a8a'], border: 'rgba(255,255,255,0.45)', tailColor: '#1e40af', decorator: '🌙', borderWidth: 1.5, borderStyle: 'solid' },
  'ramadan-2026-a': { colors: ['#047857', '#065f46', '#14532d'], border: 'rgba(255,255,255,0.45)', tailColor: '#065f46', decorator: '🕌', borderWidth: 1.5, borderStyle: 'solid' },
  'eid-fitr-2026-s': { colors: ['#0f766e', '#115e59', '#134e4a'], border: 'rgba(255,255,255,0.4)', tailColor: '#115e59', decorator: '🌙', borderWidth: 1.5, borderStyle: 'solid' },
  'eid-fitr-2026-a': { colors: ['#1e40af', '#1e3a8a', '#172554'], border: 'rgba(255,255,255,0.4)', tailColor: '#1e3a8a', decorator: '🕌', borderWidth: 1.5, borderStyle: 'solid' },
  'zodiac-2026': { colors: ['#1e1b4b', '#312e81', '#4338ca'], border: 'rgba(255,255,255,0.4)', tailColor: '#312e81', decorator: '🪐', borderWidth: 1.8, borderStyle: 'dashed', animation: 'sparkles' },
  'aries-2026': { colors: ['#6b21a8', '#4c1d95', '#3b0764'], border: 'rgba(255,255,255,0.4)', tailColor: '#4c1d95', decorator: '♈', borderWidth: 1.5, borderStyle: 'solid' },
  'cricket-2026': { colors: ['#047857', '#15803d', '#166534'], border: 'rgba(255,255,255,0.45)', tailColor: '#15803d', decorator: '🏏', borderWidth: 1.5, borderStyle: 'solid' },
  'taurus-2026': { colors: ['#b45309', '#78350f', '#451a03'], border: 'rgba(255,255,255,0.4)', tailColor: '#78350f', decorator: '♉', borderWidth: 1.5, borderStyle: 'solid' },
  'destiny-battle-a': { colors: ['#44403c', '#292524', '#1c1917'], border: 'rgba(255,255,255,0.3)', tailColor: '#292524', decorator: '🔫', borderWidth: 2.5, borderStyle: 'solid', animation: 'shine' },
  'eid-adha-2026': { colors: ['#065f46', '#14532d', '#052e16'], border: 'rgba(255,255,255,0.45)', tailColor: '#14532d', decorator: '🐑', borderWidth: 1.5, borderStyle: 'solid' },
  'svip-dragon-bubble': { colors: ['#7f1d1d', '#991b1b', '#dc2626'], border: '#fbbf24', tailColor: '#991b1b', decorator: '🐉', borderWidth: 2, borderStyle: 'solid', animation: 'shine' },
  'svip-lion-bubble': { colors: ['#78350f', '#92400e', '#b45309'], border: '#fbbf24', tailColor: '#92400e', decorator: '🦁', borderWidth: 2, borderStyle: 'solid', animation: 'sparkles' },
  'svip-owl-bubble': { colors: ['#1e1b4b', '#312e81', '#4338ca'], border: '#a78bfa', tailColor: '#312e81', decorator: '🦉', borderWidth: 2, borderStyle: 'solid', animation: 'sparkles' },
  'svip-wolf-bubble': { colors: ['#374151', '#4b5563', '#6b7280'], border: '#d1d5db', tailColor: '#4b5563', decorator: '🐺', borderWidth: 2, borderStyle: 'solid', animation: 'shine' },
  'default-premium': { colors: ['#c084fc', '#818cf8', '#4f46e5'], border: 'rgba(255,255,255,0.4)', tailColor: '#818cf8', decorator: '⭐', borderWidth: 1.5, borderStyle: 'solid', animation: 'sparkles' },
  'b-cosmic-star': { colors: ['#1e1b4b', '#260c44', '#0d041e'], border: '#c084fc', tailColor: '#260c44', decorator: '🪐', borderWidth: 2, borderStyle: 'solid', animation: 'sparkles' },
  'b-royal-gold': { colors: ['#3b2a09', '#2e1f04', '#1f1300'], border: '#fbbf24', tailColor: '#2e1f04', decorator: '👑', borderWidth: 2.2, borderStyle: 'solid', animation: 'shine' },
};

export const ChatMessageBubble = memo(({ bubbleId, bubbleMediaUrl, isMe, children, showTail = true, style }: ChatMessageBubbleProps) => {
  if (!bubbleId || bubbleId === 'None') {
    return (
      <View className={`px-4 py-1.5 rounded-full max-w-[85%] min-w-[50px] mb-2 border ${isMe ? 'bg-[#150029]/80 border-purple-500/30 self-end' : 'bg-black/40 border-white/10 self-start'}`}>
        {children}
      </View>
    );
  }

  const config = STYLE_CONFIGS[bubbleId] || STYLE_CONFIGS['default-premium'];

  // Animations setup
  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const shineAnim = React.useRef(new Animated.Value(-150)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0.3)).current;
  const fallAnim = React.useRef(new Animated.Value(-10)).current;

  React.useEffect(() => {
    // Emoji floating loop
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        })
      ])
    );
    floatLoop.start();

    // Shine sweep loop running periodically
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 250,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ])
    );
    shineLoop.start();

    // Rotation loop for candy
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();

    // Fade loop for sparkles
    const fadeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    );
    fadeLoop.start();

    // Falling loop for falling roses & snowfall
    const fallLoop = Animated.loop(
      Animated.timing(fallAnim, {
        toValue: 40,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    fallLoop.start();

    return () => {
      floatLoop.stop();
      shineLoop.stop();
      rotateLoop.stop();
      fadeLoop.stop();
      fallLoop.stop();
    };
  }, [floatAnim, shineAnim, rotateAnim, fadeAnim, fallAnim]);

  const { width: bubbleWidth, minWidth: bubbleMinWidth, ...restStyle } = style || {};
  const bubbleBgImage = LOCAL_BUBBLE_ASSETS[bubbleId || ''];

  if (bubbleBgImage) {
    return (
      <View style={[{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: 4 }, restStyle]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          {!isMe && showTail && (
            <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 0, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'transparent', marginBottom: 8 }} />
          )}
          <ImageBackground
            source={bubbleBgImage}
            style={{
              paddingLeft: bubbleId === 'b-royal-gold' ? 46 : 42,
              paddingRight: bubbleId === 'b-royal-gold' ? 46 : 42,
              paddingTop: bubbleId === 'b-royal-gold' ? 32 : 24,
              paddingBottom: bubbleId === 'b-royal-gold' ? 32 : 24,
              minWidth: bubbleMinWidth || 140,
              width: bubbleWidth,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            imageStyle={{ resizeMode: 'stretch' }}
          >
            <View style={{ position: 'relative', width: '100%' }}>
              {children}
            </View>
          </ImageBackground>
          {isMe && showTail && (
            <View style={{ width: 0, height: 0, borderLeftWidth: 0, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'transparent', marginBottom: 8 }} />
          )}
        </View>
      </View>
    );
  }

  // Image-backed custom bubble from store (HTTP URL)
  if (bubbleMediaUrl && typeof bubbleMediaUrl === 'string' && (bubbleMediaUrl.startsWith('http://') || bubbleMediaUrl.startsWith('https://'))) {
    return (
      <View style={[{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: 4 }, restStyle]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          {!isMe && showTail && (
            <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 0, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'transparent', marginBottom: 8 }} />
          )}
          <ImageBackground
            source={{ uri: bubbleMediaUrl }}
            style={{
              paddingLeft: 42,
              paddingRight: 42,
              paddingTop: 24,
              paddingBottom: 24,
              minWidth: bubbleMinWidth || 140,
              width: bubbleWidth,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            imageStyle={{ resizeMode: 'stretch' }}
          >
            <View style={{ position: 'relative', width: '100%' }}>
              {children}
            </View>
          </ImageBackground>
          {isMe && showTail && (
            <View style={{ width: 0, height: 0, borderLeftWidth: 0, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'transparent', marginBottom: 8 }} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '100%', marginBottom: 8 }, restStyle]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        {!isMe && showTail && (
          <View style={{ width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 0, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: config.tailColor, marginBottom: 8 }} />
        )}
        
        <LinearGradient
          colors={config.colors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 16,
            borderWidth: config.borderWidth !== undefined ? config.borderWidth : 1.5,
            borderStyle: config.borderStyle || 'solid',
            borderColor: config.border,
            paddingHorizontal: 12,
            paddingVertical: 8,
            shadowColor: config.tailColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 5,
            minWidth: bubbleMinWidth || 60,
            width: bubbleWidth,
            position: 'relative',
            alignSelf: 'stretch',
          }}
        >
          {/* Shine Sweep light reflection effect */}
          {config.animation === 'shine' && (
            <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 16 }}>
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: 40,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  transform: [
                    { translateX: shineAnim },
                    { skewX: '-22deg' }
                  ],
                }}
              />
            </View>
          )}

          {/* Floating Sparkles effect */}
          {config.animation === 'sparkles' && (
            <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 16 }}>
              <Animated.Text style={{ position: 'absolute', left: 8, top: 4, fontSize: 8, opacity: fadeAnim, color: '#fef08a' }}>✨</Animated.Text>
              <Animated.Text style={{ position: 'absolute', right: 12, bottom: 6, fontSize: 9, opacity: fadeAnim, color: '#fef08a' }}>✨</Animated.Text>
            </View>
          )}

          {/* Falling Roses effect */}
          {config.animation === 'roses' && (
            <View style={{ ...StyleSheet.absoluteFillObject, borderRadius: 16 }}>
              {/* Background falling cascade */}
              <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 16 }}>
                <Animated.Text style={{ position: 'absolute', left: 12, top: -10, fontSize: 8, opacity: 0.45, transform: [{ translateY: fallAnim }] }}>🌹</Animated.Text>
                <Animated.Text style={{ position: 'absolute', right: 18, top: -32, fontSize: 9, opacity: 0.45, transform: [{ translateY: fallAnim }] }}>🌹</Animated.Text>
                <Animated.Text style={{ position: 'absolute', right: 42, top: -55, fontSize: 7, opacity: 0.35, transform: [{ translateY: fallAnim }] }}>🌹</Animated.Text>
              </View>
              
              {/* Border Garland (Surrounding tiny flowers on four borders) */}
              {/* Top Row */}
              <Text style={{ position: 'absolute', left: '15%', top: -5, fontSize: 6.5, zIndex: 12 }}>🌸</Text>
              <Text style={{ position: 'absolute', left: '50%', top: -5, fontSize: 6.5, zIndex: 12 }}>🌹</Text>
              <Text style={{ position: 'absolute', left: '85%', top: -5, fontSize: 6.5, zIndex: 12 }}>🌸</Text>
              
              {/* Bottom Row */}
              <Text style={{ position: 'absolute', left: '20%', bottom: -5, fontSize: 6.5, zIndex: 12 }}>🌸</Text>
              <Text style={{ position: 'absolute', left: '50%', bottom: -5, fontSize: 6.5, zIndex: 12 }}>🌹</Text>
              <Text style={{ position: 'absolute', left: '80%', bottom: -5, fontSize: 6.5, zIndex: 12 }}>🌸</Text>
              
              {/* Sides */}
              <Text style={{ position: 'absolute', left: -4, top: '40%', fontSize: 6.5, zIndex: 12 }}>🌸</Text>
              <Text style={{ position: 'absolute', right: -4, top: '40%', fontSize: 6.5, zIndex: 12 }}>🌸</Text>
            </View>
          )}

          {/* Snowfall effect */}
          {config.animation === 'snowfall' && (
            <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 16 }}>
              <Animated.Text style={{ position: 'absolute', left: 14, top: -10, fontSize: 8, opacity: 0.8, color: '#e0f2fe', transform: [{ translateY: fallAnim }] }}>❄️</Animated.Text>
              <Animated.Text style={{ position: 'absolute', right: 16, top: -30, fontSize: 8, opacity: 0.8, color: '#e0f2fe', transform: [{ translateY: fallAnim }] }}>❄️</Animated.Text>
              <Animated.Text style={{ position: 'absolute', right: 38, top: -50, fontSize: 7, opacity: 0.65, color: '#e0f2fe', transform: [{ translateY: fallAnim }] }}>❄️</Animated.Text>
            </View>
          )}

          {/* Spinning Candy effect */}
          {config.animation === 'candy' && (
            <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 16 }}>
              <Animated.Text
                style={{
                  position: 'absolute',
                  right: 6,
                  top: 4,
                  fontSize: 10,
                  transform: [{
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }}
              >
                🍬
              </Animated.Text>
            </View>
          )}

          {/* Cosmic Star Constellations & Shooting Stars background overlay */}
          {bubbleId === 'b-cosmic-star' && (
            <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 16 }}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
                <Circle cx="15" cy="20" r="1" fill="#fff" opacity="0.85" />
                <Circle cx="32" cy="45" r="0.8" fill="#fff" opacity="0.6" />
                <Circle cx="82" cy="28" r="1.3" fill="#fde047" opacity="0.9" />
                <Path d="M15,20 L32,45" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                <Path d="M56,12 L82,24" stroke="rgba(255,255,255,0.22)" strokeWidth="0.7" strokeLinecap="round" />
                <Path d="M68,34 L88,44" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" strokeLinecap="round" />
              </Svg>
            </View>
          )}

          {/* Royal Gold Inner Borders overlay */}
          {bubbleId === 'b-royal-gold' && (
            <View style={{ ...StyleSheet.absoluteFillObject, overflow: 'hidden', borderRadius: 16 }}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
                <Path d="M4,4 L96,4 L96,96 L4,96 Z" fill="none" stroke="rgba(251,191,36,0.22)" strokeWidth="1.2" />
                <Path d="M6,6 L94,6 L94,94 L6,94 Z" fill="none" stroke="rgba(251,191,36,0.08)" strokeWidth="0.6" />
              </Svg>
            </View>
          )}

          {/* Custom illustrations/decorators for corners */}
          {(() => {
            const decors = BUBBLE_DECORATORS[bubbleId];
            if (!decors) return null;
            return Object.keys(decors).map(key => {
              const item = decors[key];
              return (
                <View key={key} style={{ position: 'absolute', zIndex: 10, ...item.style }}>
                  {item.node}
                </View>
              );
            });
          })()}

          {/* Glossy top-highlight reflection for 3D look */}
          <View
            style={{
              position: 'absolute',
              top: 1,
              left: 6,
              right: 6,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
            }}
          />

          <View style={{ position: 'relative', paddingRight: config.decorator && !BUBBLE_DECORATORS[bubbleId] ? 10 : 0 }}>
            {children}
            {config.decorator && !BUBBLE_DECORATORS[bubbleId] ? (
              <Animated.View style={{ position: 'absolute', right: -9, top: -7, transform: [{ translateY: floatAnim }] }}>
                <Text style={{ fontSize: 11, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                  {config.decorator}
                </Text>
              </Animated.View>
            ) : null}
          </View>
        </LinearGradient>

        {isMe && showTail && (
          <View style={{ width: 0, height: 0, borderLeftWidth: 0, borderRightWidth: 8, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: config.tailColor, marginBottom: 8 }} />
        )}
      </View>
    </View>
  );
});

ChatMessageBubble.displayName = 'ChatMessageBubble';
