import React from 'react';
import Svg, { Path, Circle, Ellipse, Polygon, G } from 'react-native-svg';

export interface FurnitureItem {
  id: string;
  name: string;
  category: 'seating' | 'decor' | 'ambient' | 'luxury';
  unlockLevel: number;
  price: number;
  gridWidth: number; // Cells occupied in isometric grid (X)
  gridLength: number; // Cells occupied in isometric grid (Y)
  renderSvg: (color?: string) => React.ReactNode;
}

export const FURNITURE_CATALOG: FurnitureItem[] = [
  {
    id: 'neon-gaming-chair',
    name: 'Neon Cyber Seat',
    category: 'seating',
    unlockLevel: 1,
    price: 0,
    gridWidth: 1,
    gridLength: 1,
    renderSvg: (color = '#00ffff') => (
      <Svg viewBox="0 0 100 120" style={{ width: '100%', height: '100%' }}>
        <Ellipse cx="50" cy="95" rx="30" ry="12" fill="rgba(0,0,0,0.3)" />
        <Path d="M50 95 L50 75" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
        <Path d="M30 95 L70 95 M50 95 L40 100 M50 95 L60 100" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
        <Path d="M25 60 L75 60 L65 75 L35 75 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
        <Path d="M25 60 L75 60 L65 67 L35 67 Z" fill="#1e293b" />
        <Path 
          d="M32 60 L32 20 Q50 10 68 20 L68 60 Z" 
          fill="none" 
          stroke={color} 
          strokeWidth="3" 
        />
        <Path d="M35 58 L35 22 Q50 14 65 22 L65 58 Z" fill="#020617" />
        <Path d="M42 30 L58 30 L55 45 L45 45 Z" fill={color} opacity={0.15} />
        <Path d="M23 60 L23 48 L28 48" stroke="#475569" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M77 60 L77 48 L72 48" stroke="#475569" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    )
  },
  {
    id: 'lovers-canopy-bed',
    name: 'Lover Canopy Bed',
    category: 'luxury',
    unlockLevel: 5,
    price: 15000,
    gridWidth: 3,
    gridLength: 3,
    renderSvg: () => (
      <Svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%' }}>
        <Polygon points="10,120 80,85 150,120 80,155" fill="rgba(0,0,0,0.35)" />
        <Path d="M15 120 L15 30" stroke="#451a03" strokeWidth="6" strokeLinecap="round" />
        <Path d="M80 85 L80 10" stroke="#451a03" strokeWidth="4" strokeLinecap="round" />
        <Path d="M145 120 L145 30" stroke="#451a03" strokeWidth="6" strokeLinecap="round" />
        <Polygon points="20,115 80,85 140,115 80,145" fill="#fecdd3" stroke="#fda4af" strokeWidth="2" />
        <Polygon points="45,112 80,95 130,120 90,140" fill="#e11d48" />
        <Polygon points="90,140 130,120 135,123 88,143" fill="#be123c" />
        <Polygon points="40,100 60,90 70,95 50,105" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <Polygon points="62,90 82,80 92,85 72,95" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <Path d="M15 30 L80 10 L145 30" stroke="#f43f5e" strokeWidth="3" fill="none" />
        <Path d="M15 30 Q35 70 20 110" fill="none" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="8" strokeLinecap="round" />
        <Path d="M145 30 Q125 70 140 110" fill="none" stroke="rgba(244, 63, 94, 0.4)" strokeWidth="8" strokeLinecap="round" />
        <G>
          <Path d="M80 40 Q77 35 72 37 Q68 40 73 48 L80 55 L87 48 Q92 40 88 37 Q83 35 80 40 Z" fill="#f43f5e" />
        </G>
      </Svg>
    )
  },
  {
    id: 'ambient-lava-lamp',
    name: 'Love Aura Lamp',
    category: 'ambient',
    unlockLevel: 2,
    price: 2500,
    gridWidth: 1,
    gridLength: 1,
    renderSvg: (color = '#ec4899') => (
      <Svg viewBox="0 0 60 120" style={{ width: '100%', height: '100%' }}>
        <Ellipse cx="30" cy="110" rx="18" ry="6" fill="rgba(0,0,0,0.3)" />
        <Path d="M15 110 L45 110 L40 95 L20 95 Z" fill="#64748b" stroke="#475569" strokeWidth="1" />
        <Path d="M22 95 L26 35 C28 25, 32 25, 34 35 L38 95 Z" fill="rgba(255,255,255,0.15)" stroke="#94a3b8" strokeWidth="1" />
        <Path 
          d="M23 93 L27 45 Q30 40 33 45 L37 93 Z" 
          fill={color} 
          opacity={0.75} 
        />
        <Path d="M25 35 L35 35 L32 25 L28 25 Z" fill="#64748b" />
        <Circle cx="30" cy="75" r="4" fill="#ffffff" opacity={0.9} />
        <Circle cx="28" cy="55" r="5" fill="#ffffff" opacity={0.9} />
        <Circle 
          cx="30" 
          cy="65" 
          r="25" 
          fill={color} 
          opacity={0.15} 
        />
      </Svg>
    )
  },
  {
    id: 'zen-bonsai-plant',
    name: 'Bonsai Harmony',
    category: 'decor',
    unlockLevel: 1,
    price: 800,
    gridWidth: 1,
    gridLength: 1,
    renderSvg: () => (
      <Svg viewBox="0 0 80 100" style={{ width: '100%', height: '100%' }}>
        <Ellipse cx="40" cy="85" rx="20" ry="6" fill="rgba(0,0,0,0.25)" />
        <Path d="M25 75 L55 75 L50 90 L30 90 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
        <Ellipse cx="40" cy="75" rx="15" ry="3" fill="#cbd5e1" />
        <Path d="M40 75 Q42 55 30 50 Q22 45 35 35 Q45 28 40 15" stroke="#78350f" strokeWidth="5" strokeLinecap="round" fill="none" />
        <Path d="M35 50 Q48 45 45 35" stroke="#78350f" strokeWidth="3" strokeLinecap="round" fill="none" />
        <Circle cx="28" cy="42" r="12" fill="#15803d" opacity={0.9} />
        <Circle cx="25" cy="40" r="9" fill="#166534" />
        <Circle cx="48" cy="32" r="14" fill="#16a34a" opacity={0.95} />
        <Circle cx="45" cy="30" r="11" fill="#15803d" />
        <Circle cx="38" cy="15" r="10" fill="#22c55e" opacity={0.9} />
        <Circle cx="36" cy="13" r="7" fill="#16a34a" />
      </Svg>
    )
  },
  {
    id: 'aquarium-virtual',
    name: 'Dynamic Aquarium',
    category: 'luxury',
    unlockLevel: 3,
    price: 8000,
    gridWidth: 2,
    gridLength: 2,
    renderSvg: () => (
      <Svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%' }}>
        <Polygon points="10,95 60,70 110,95 60,118" fill="rgba(0,0,0,0.35)" />
        <Polygon points="15,85 60,63 105,85 100,105 60,115 20,105" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
        <Polygon points="15,40 60,18 105,40 105,85 60,98 15,85" fill="rgba(6, 182, 212, 0.25)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <Path d="M35 83 Q30 65 38 52 Q43 45 35 35" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" opacity={0.8} />
        <Path d="M85 83 Q90 68 83 55 Q78 48 85 38" stroke="#059669" strokeWidth="3" strokeLinecap="round" fill="none" opacity={0.8} />
        <G>
          <Path d="M50 55 C53 53 58 53 60 55 L65 52 L63 56 L60 57 Z" fill="#f97316" />
          <Path d="M72 70 C75 68 80 68 82 70 L87 67 L85 71 L82 72 Z" fill="#ef4444" />
        </G>
        <Circle cx="58" cy="75" r="1.5" fill="#ffffff" opacity={0.8} />
        <Circle cx="62" cy="60" r="1" fill="#ffffff" opacity={0.8} />
        <Circle cx="60" cy="45" r="2" fill="#ffffff" opacity={0.6} />
        <Polygon points="13,38 60,15 107,38 60,45" fill="#334155" />
      </Svg>
    )
  }
];
