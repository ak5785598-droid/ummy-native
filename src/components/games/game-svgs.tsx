import React from 'react';
import Svg, {
  Circle, Rect, Ellipse, Path, Text as SvgText, G, Defs,
  LinearGradient, RadialGradient, Stop, Line
} from 'react-native-svg';

// ── Gold Coin (Forest Party / Fruit Party) ──
export const GoldCoinSvg = ({ size = 32 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Defs>
      <LinearGradient id="gcGold" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#fff9c4" />
        <Stop offset="28%" stopColor="#ffd54f" />
        <Stop offset="68%" stopColor="#f9a825" />
        <Stop offset="100%" stopColor="#e65100" />
      </LinearGradient>
    </Defs>
    <Circle cx="16" cy="16" r="15" fill="url(#gcGold)" stroke="#b26a00" strokeWidth="1" />
    <Circle cx="16" cy="16" r="12" fill="none" stroke="#ffecb3" strokeWidth="1" opacity={0.55} />
    <SvgText x="16" y="21.5" textAnchor="middle" fontSize={15} fontWeight="900" fill="#8a4a00" fontFamily="Arial">$</SvgText>
  </Svg>
);

// ── Glossy Gold Coin (Fruit Party) ──
export const GlossyCoinSvg = ({ size = 32 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Defs>
      <LinearGradient id="dollarGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#fff3a1" />
        <Stop offset="30%" stopColor="#ffd700" />
        <Stop offset="50%" stopColor="#f59e0b" />
        <Stop offset="80%" stopColor="#d97706" />
        <Stop offset="100%" stopColor="#b45309" />
      </LinearGradient>
      <LinearGradient id="dollarGloss" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#ffebb5" stopOpacity="0.8" />
        <Stop offset="100%" stopColor="#d97706" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    <Circle cx="16" cy="16" r="15" fill="url(#dollarGold)" stroke="#92400e" strokeWidth="1" />
    <Circle cx="16" cy="16" r="13" fill="url(#dollarGloss)" />
    <Circle cx="16" cy="16" r="11" fill="none" stroke="#fffbeb" strokeWidth="0.8" opacity={0.6} />
    <SvgText x="16" y="21.5" textAnchor="middle" fontSize={15} fontWeight="900" fill="#78350f" fontFamily="Arial">$</SvgText>
  </Svg>
);

// ── Poker Chip (Teen Patti) ──
export const PokerChipSvg = ({ size = 32, hex = '#2563EB' }: { size?: number; hex?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Defs>
      <RadialGradient id="pcGrad" cx="50%" cy="50%" r="50%">
        <Stop offset="0%" stopColor="white" />
        <Stop offset="100%" stopColor={hex} />
      </RadialGradient>
    </Defs>
    <Circle cx="16" cy="16" r="15" fill={hex} stroke="white" strokeWidth="2.5" />
    <Circle cx="16" cy="16" r="13" fill="none" stroke="white" strokeWidth="0.8" opacity={0.4} strokeDasharray="3,3" />
    <Circle cx="16" cy="16" r="11" fill="white" />
    <Circle cx="16" cy="16" r="10" fill="url(#pcGrad)" />
    <SvgText x="16" y="19" textAnchor="middle" fontSize={8} fontWeight="900" fill="white" fontFamily="Arial">$</SvgText>
  </Svg>
);

// ── Crown (Forest Party / Fruit Party) ──
export const CrownSvg = ({ rank, size = 64 }: { rank: 1 | 2 | 3; size?: number }) => {
  if (rank === 1) return (
    <Svg width={size} height={size * 1.14} viewBox="0 0 140 160">
      <Defs>
        <LinearGradient id="cGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#fff6d6" /><Stop offset="22%" stopColor="#ffe08a" />
          <Stop offset="52%" stopColor="#ffc73a" /><Stop offset="78%" stopColor="#f19e1a" />
          <Stop offset="100%" stopColor="#d87607" />
        </LinearGradient>
      </Defs>
      <G translateX={70} translateY={22} scale={1.1}>
        <Path d="M-24 -2 L-15 -18 L-6 -4 L0 -20 L6 -4 L15 -18 L24 -2 L24 9 L-24 9 Z" fill="url(#cGold)" stroke="#b26a00" strokeWidth="1.5" />
        <Circle cx="0" cy="-13" r="3.8" fill="#ffdf76" stroke="#b26a00" strokeWidth="1" />
        <Rect x="-24" y="9" width="48" height="6.5" rx="2.2" fill="#c78212" />
      </G>
      <Circle cx="70" cy="90" r="50" fill="none" stroke="url(#cGold)" strokeWidth="13" />
      <G translateX={104} translateY={126}>
        <Circle r="17" fill="url(#cGold)" stroke="#9c5e06" strokeWidth="2.4" />
        <SvgText x="0" y="6" textAnchor="middle" fontSize={16.5} fontWeight="900" fill="white" fontFamily="Arial" stroke="#000" strokeWidth={0.6}>1</SvgText>
      </G>
    </Svg>
  );
  if (rank === 2) return (
    <Svg width={size} height={size * 1.14} viewBox="0 0 140 160">
      <Defs>
        <LinearGradient id="cSilver" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#ffffff" /><Stop offset="30%" stopColor="#e6e8ee" />
          <Stop offset="60%" stopColor="#b6bcc6" /><Stop offset="100%" stopColor="#7a8290" />
        </LinearGradient>
      </Defs>
      <G translateX={70} translateY={28}>
        <Path d="M-22 -2 L-14 -16 L-6 -4 L0 -18 L6 -4 L14 -16 L22 -2 L22 8 L-22 8 Z" fill="url(#cSilver)" stroke="#7c8491" strokeWidth="1.4" />
        <Circle cx="0" cy="-12" r="3.3" fill="#e8edf3" stroke="#7c8491" strokeWidth="1" />
        <Rect x="-22" y="8" width="44" height="5.5" rx="2" fill="#9aa2ae" />
      </G>
      <Circle cx="70" cy="90" r="48" fill="none" stroke="url(#cSilver)" strokeWidth="11.5" />
      <G translateX={104} translateY={124}>
        <Circle r="15.5" fill="url(#cSilver)" stroke="#5a6270" strokeWidth="2" />
        <SvgText x="0" y="5.5" textAnchor="middle" fontSize={15.5} fontWeight="800" fill="white" fontFamily="Arial">2</SvgText>
      </G>
    </Svg>
  );
  return (
    <Svg width={size} height={size * 1.14} viewBox="0 0 140 160">
      <Defs>
        <LinearGradient id="cBronze" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#ffe2d1" /><Stop offset="30%" stopColor="#e9a17d" />
          <Stop offset="65%" stopColor="#c76d46" /><Stop offset="100%" stopColor="#8f4a2e" />
        </LinearGradient>
      </Defs>
      <G translateX={70} translateY={28}>
        <Path d="M-22 -2 L-14 -16 L-6 -4 L0 -18 L6 -4 L14 -16 L22 -2 L22 8 L-22 8 Z" fill="url(#cBronze)" stroke="#7a3e26" strokeWidth="1.4" />
        <Circle cx="0" cy="-12" r="3.2" fill="#f0b599" stroke="#7a3e26" strokeWidth="1" />
        <Rect x="-22" y="8" width="44" height="5.5" rx="2" fill="#8a4f35" />
      </G>
      <Circle cx="70" cy="90" r="46" fill="none" stroke="url(#cBronze)" strokeWidth="11" />
      <G translateX={102} translateY={122}>
        <Circle r="15" fill="url(#cBronze)" stroke="#5c2c1a" strokeWidth="2" />
        <SvgText x="0" y="5" textAnchor="middle" fontSize={14.5} fontWeight="800" fill="white" fontFamily="Arial">3</SvgText>
      </G>
    </Svg>
  );
};

// ── Roulette Wheel ──
const ROULETTE_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const RouletteWheelSvg = ({ size = 256 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="48" fill="#3d2b1f" stroke="#b88a44" strokeWidth="4" />
    {ROULETTE_NUMBERS.map((num, i) => {
      const angle = (i * 360) / 37;
      const isRed = RED_NUMBERS.includes(num);
      const isZero = num === 0;
      return (
        <G key={num} rotation={angle} originX={50} originY={50}>
          <Path
            d="M 50 2 L 54 2 L 52 15 L 48 15 Z"
            fill={isZero ? '#10b981' : isRed ? '#ef4444' : '#1a1a1a'}
            stroke="#3d2b1f"
            strokeWidth="0.2"
          />
          <SvgText x="50" y="8" fontSize={3} textAnchor="middle" fill="white" fontWeight="black" rotation={180} originX={50} originY={8}>
            {num}
          </SvgText>
        </G>
      );
    })}
    <Circle cx="50" cy="50" r="15" fill="#b88a44" />
    <Circle cx="50" cy="50" r="12" fill="#3d2b1f" opacity={0.2} />
    <Path d="M 50 35 L 50 65 M 35 50 L 65 50" stroke="#b88a44" strokeWidth="3" strokeLinecap="round" />
    <Circle cx="50" cy="35" r="2" fill="#b88a44" />
    <Circle cx="50" cy="65" r="2" fill="#b88a44" />
    <Circle cx="35" cy="50" r="2" fill="#b88a44" />
    <Circle cx="65" cy="50" r="2" fill="#b88a44" />
    <Circle cx="50" cy="50" r="4" fill="#fcd34d" />
  </Svg>
);

// ── Teen Patti Faction Banners ──
export const WolfBannerSvg = ({ size = 100 }: { size?: number }) => (
  <Svg width={size * 0.77} height={size} viewBox="0 0 200 260">
    <Defs>
      <LinearGradient id="wbGold" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#fff9d0"/><Stop offset="20%" stopColor="#ffd700"/><Stop offset="50%" stopColor="#c99700"/><Stop offset="80%" stopColor="#ffdf5f"/><Stop offset="100%" stopColor="#7a5a00"/>
      </LinearGradient>
      <LinearGradient id="wbSilver" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#e8e6da"/><Stop offset="35%" stopColor="#b8b6aa"/><Stop offset="70%" stopColor="#8a8982"/><Stop offset="100%" stopColor="#a5a49b"/>
      </LinearGradient>
      <LinearGradient id="wbBody" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#4b4b4f"/><Stop offset="25%" stopColor="#2a2a2e"/><Stop offset="100%" stopColor="#0c0c0e"/>
      </LinearGradient>
      <RadialGradient id="wbEye" cx="50%" cy="35%" r="70%">
        <Stop offset="0%" stopColor="#e8ffbd"/><Stop offset="30%" stopColor="#b6ff5a"/><Stop offset="70%" stopColor="#7ed321"/><Stop offset="100%" stopColor="#3d7a00"/>
      </RadialGradient>
    </Defs>
    <Rect x="10" y="24" width="180" height="20" rx="10" fill="#b8b8b0"/>
    <Rect x="36" y="24" width="20" height="20" fill="url(#wbGold)"/>
    <Rect x="70" y="24" width="20" height="20" fill="url(#wbGold)"/>
    <Rect x="110" y="24" width="20" height="20" fill="url(#wbGold)"/>
    <Rect x="144" y="24" width="20" height="20" fill="url(#wbGold)"/>
    <Path d="M10 34 L0 28 L10 16 L20 28 Z" fill="url(#wbGold)"/>
    <Path d="M190 34 L200 28 L190 16 L180 28 Z" fill="url(#wbGold)"/>
    <Rect x="22" y="44" width="14" height="168" rx="3" fill="#8c8c84" opacity={0.9}/>
    <Rect x="164" y="44" width="14" height="168" rx="3" fill="#8c8c84" opacity={0.9}/>
    <Ellipse cx="29" cy="216" rx="7" ry="10" fill="url(#wbGold)"/>
    <Ellipse cx="171" cy="216" rx="7" ry="10" fill="url(#wbGold)"/>
    <Path d="M30 44 H170 V170 Q170 202 100 240 Q30 202 30 170 Z" fill="url(#wbSilver)" stroke="url(#wbGold)" strokeWidth="3.5"/>
    <G translateX={35} translateY={60} scale={0.65}>
      <Ellipse cx="100" cy="178" rx="54" ry="52" fill="url(#wbBody)" stroke="#000" strokeWidth="3"/>
      <Ellipse cx="70" cy="210" rx="22" ry="26" fill="url(#wbBody)" stroke="#000" strokeWidth="3"/>
      <Ellipse cx="130" cy="210" rx="22" ry="26" fill="url(#wbBody)" stroke="#000" strokeWidth="3"/>
      <Ellipse cx="100" cy="88" rx="74" ry="64" fill="url(#wbBody)" stroke="#000" strokeWidth="3"/>
      <Ellipse cx="65" cy="100" rx="29" ry="32" fill="url(#wbEye)" stroke="#000" strokeWidth="2.5"/>
      <Ellipse cx="135" cy="100" rx="29" ry="32" fill="url(#wbEye)" stroke="#000" strokeWidth="2.5"/>
      <Ellipse cx="72" cy="110" rx="16" ry="20" fill="#000"/>
      <Ellipse cx="128" cy="110" rx="16" ry="20" fill="#000"/>
    </G>
  </Svg>
);

export const LionBannerSvg = ({ size = 100 }: { size?: number }) => (
  <Svg width={size * 0.77} height={size} viewBox="0 0 200 260">
    <Defs>
      <LinearGradient id="lbGold" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#fff9d0"/><Stop offset="20%" stopColor="#ffd700"/><Stop offset="50%" stopColor="#c99700"/><Stop offset="80%" stopColor="#ffdf5f"/><Stop offset="100%" stopColor="#7a5a00"/>
      </LinearGradient>
      <LinearGradient id="lbSplit" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor="#e6b422"/><Stop offset="49.8%" stopColor="#b8860b"/><Stop offset="50%" stopColor="#a10f0f"/><Stop offset="100%" stopColor="#6a0000"/>
      </LinearGradient>
      <LinearGradient id="lbBody" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#4de7b7"/><Stop offset="40%" stopColor="#1db88f"/><Stop offset="100%" stopColor="#0a6b50"/>
      </LinearGradient>
      <RadialGradient id="lbEye" cx="50%" cy="35%" r="65%">
        <Stop offset="0%" stopColor="#c7e2ff"/><Stop offset="45%" stopColor="#3b82f6"/><Stop offset="100%" stopColor="#1e3a8a"/>
      </RadialGradient>
    </Defs>
    <Rect x="10" y="24" width="180" height="20" rx="10" fill="#b8b8b0"/>
    <Rect x="36" y="24" width="20" height="20" fill="#b71c1c"/>
    <Rect x="70" y="24" width="20" height="20" fill="#b71c1c"/>
    <Rect x="110" y="24" width="20" height="20" fill="#b71c1c"/>
    <Rect x="144" y="24" width="20" height="20" fill="#b71c1c"/>
    <Path d="M10 34 L0 28 L10 16 L20 28 Z" fill="url(#lbGold)"/>
    <Path d="M190 34 L200 28 L190 16 L180 28 Z" fill="url(#lbGold)"/>
    <Rect x="22" y="44" width="14" height="168" rx="3" fill="#5a0a0a" opacity={0.9}/>
    <Rect x="164" y="44" width="14" height="168" rx="3" fill="#5a0a0a" opacity={0.9}/>
    <Ellipse cx="29" cy="216" rx="7" ry="10" fill="url(#lbGold)"/>
    <Ellipse cx="171" cy="216" rx="7" ry="10" fill="url(#lbGold)"/>
    <Path d="M30 44 H170 V170 Q170 202 100 240 Q30 202 30 170 Z" fill="url(#lbSplit)" stroke="url(#lbGold)" strokeWidth="3.5"/>
    <G translateX={35} translateY={60} scale={0.65}>
      <Ellipse cx="100" cy="168" rx="44" ry="52" fill="url(#lbBody)" stroke="#0d1f35" strokeWidth="3.5"/>
      <Ellipse cx="100" cy="86" rx="68" ry="58" fill="url(#lbBody)" stroke="#0b3d2e" strokeWidth="3.5"/>
      <Ellipse cx="68" cy="86" rx="23" ry="27" fill="white" stroke="#0b3d2e" strokeWidth="2.5"/>
      <Ellipse cx="132" cy="86" rx="23" ry="27" fill="white" stroke="#0b3d2e" strokeWidth="2.5"/>
      <Ellipse cx="68" cy="92" rx="16" ry="19" fill="url(#lbEye)"/>
      <Ellipse cx="132" cy="92" rx="16" ry="19" fill="url(#lbEye)"/>
      <Ellipse cx="68" cy="96" rx="8" ry="11" fill="black"/>
      <Ellipse cx="132" cy="96" rx="8" ry="11" fill="black"/>
      <Circle cx="62" cy="80" r="4.5" fill="white"/>
      <Circle cx="126" cy="80" r="4.5" fill="white"/>
      <Ellipse cx="100" cy="116" rx="36" ry="24" fill="url(#lbBody)" stroke="#0b3d2e" strokeWidth="2"/>
      <Ellipse cx="88" cy="112" rx="4" ry="3" fill="#0b3d2e"/>
      <Ellipse cx="112" cy="112" rx="4" ry="3" fill="#0b3d2e"/>
      <Path d="M76 120 Q100 134 124 120" fill="none" stroke="#0b3d2e" strokeWidth="2.5" strokeLinecap="round"/>
      <Path d="M96 126 L100 132 L104 126 Z" fill="white" stroke="#0b3d2e" strokeWidth="1.5"/>
    </G>
  </Svg>
);

export const FishBannerSvg = ({ size = 100 }: { size?: number }) => (
  <Svg width={size * 0.77} height={size} viewBox="0 0 200 260">
    <Defs>
      <LinearGradient id="fbGold" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#fff9d0"/><Stop offset="20%" stopColor="#ffd700"/><Stop offset="50%" stopColor="#c99700"/><Stop offset="80%" stopColor="#ffdf5f"/><Stop offset="100%" stopColor="#7a5a00"/>
      </LinearGradient>
      <LinearGradient id="fbGreen" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#0e9a4a"/><Stop offset="40%" stopColor="#067a38"/><Stop offset="100%" stopColor="#004d24"/>
      </LinearGradient>
      <LinearGradient id="fbBody" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#5a8fc8"/><Stop offset="45%" stopColor="#2c4f7c"/><Stop offset="100%" stopColor="#162e4d"/>
      </LinearGradient>
      <RadialGradient id="fbShine" cx="25%" cy="20%" r="80%">
        <Stop offset="0%" stopColor="#fff" stopOpacity="0.3"/><Stop offset="100%" stopColor="#fff" stopOpacity="0"/>
      </RadialGradient>
    </Defs>
    <Rect x="10" y="24" width="180" height="20" rx="10" fill="#b8b8b0"/>
    <Rect x="36" y="24" width="20" height="20" fill="#0a7a3a"/>
    <Rect x="70" y="24" width="20" height="20" fill="#0a7a3a"/>
    <Rect x="110" y="24" width="20" height="20" fill="#0a7a3a"/>
    <Rect x="144" y="24" width="20" height="20" fill="#0a7a3a"/>
    <Path d="M10 34 L0 28 L10 16 L20 28 Z" fill="url(#fbGold)"/>
    <Path d="M190 34 L200 28 L190 16 L180 28 Z" fill="url(#fbGold)"/>
    <Rect x="22" y="44" width="14" height="168" rx="3" fill="#00391b" opacity={0.9}/>
    <Rect x="164" y="44" width="14" height="168" rx="3" fill="#00391b" opacity={0.9}/>
    <Ellipse cx="29" cy="216" rx="7" ry="10" fill="url(#fbGold)"/>
    <Ellipse cx="171" cy="216" rx="7" ry="10" fill="url(#fbGold)"/>
    <Path d="M30 44 H170 V170 Q170 202 100 240 Q30 202 30 170 Z" fill="url(#fbGreen)" stroke="url(#fbGold)" strokeWidth="3.5"/>
    <Path d="M30 44 H170 V170 Q170 202 100 240 Q30 202 30 170 Z" fill="url(#fbShine)"/>
    <G translateX={35} translateY={60} scale={0.65}>
      <Ellipse cx="100" cy="130" rx="64" ry="48" fill="url(#fbBody)" stroke="#0b1f33" strokeWidth="3"/>
      <Ellipse cx="100" cy="125" rx="44" ry="30" fill="#88c4e8" opacity={0.3}/>
      <Ellipse cx="65" cy="132" rx="22" ry="28" fill="url(#fbBody)" stroke="#0b1f33" strokeWidth="3" transform="rotate(-8, 65, 132)"/>
      <Ellipse cx="135" cy="132" rx="22" ry="28" fill="url(#fbBody)" stroke="#0b1f33" strokeWidth="3" transform="rotate(8, 135, 132)"/>
      <Ellipse cx="100" cy="86" rx="58" ry="50" fill="url(#fbBody)" stroke="#0b1f33" strokeWidth="3"/>
      <Circle cx="68" cy="82" r="18" fill="white" stroke="#0b1f33" strokeWidth="2.5"/>
      <Circle cx="132" cy="82" r="18" fill="white" stroke="#0b1f33" strokeWidth="2.5"/>
      <Circle cx="68" cy="88" r="12" fill="#3b82f6"/>
      <Circle cx="132" cy="88" r="12" fill="#3b82f6"/>
      <Circle cx="68" cy="92" r="6" fill="black"/>
      <Circle cx="132" cy="92" r="6" fill="black"/>
      <Circle cx="62" cy="76" r="3" fill="white"/>
      <Circle cx="126" cy="76" r="3" fill="white"/>
      <Path d="M85 112 Q100 120 115 112" fill="none" stroke="#0b1f33" strokeWidth="2" strokeLinecap="round"/>
      <Ellipse cx="95" cy="136" rx="6" ry="4" fill="#fbcfe8"/>
      <Ellipse cx="105" cy="136" rx="6" ry="4" fill="#fbcfe8"/>
      <Ellipse cx="100" cy="142" rx="4" ry="3" fill="#fbcfe8"/>
    </G>
  </Svg>
);

// ── Chess Piece SVGs (simplified from Wikipedia commons) ──
export const ChessPieceSvg = ({ piece, size = 32 }: { piece: string; size?: number }) => {
  const isWhite = piece === piece.toUpperCase();
  const color = isWhite ? '#fff' : '#111';
  const strokeColor = isWhite ? '#333' : '#888';
  const strokeW = 1.5;

  const renderPiece = () => {
    switch (piece.toLowerCase()) {
      case 'k':
        return (
          <G>
            <Circle cx="16" cy="6" r="4" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
            <Path d="M16 10 v6 M13 13 h6" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round"/>
            <Path d="M10 18 Q16 14 22 18 L22 24 Q16 22 10 24 Z" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
          </G>
        );
      case 'q':
        return (
          <G>
            <Circle cx="16" cy="5" r="3.5" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
            <Path d="M12 8 L8 14 M20 8 L24 14" stroke={strokeColor} strokeWidth={1.2} strokeLinecap="round"/>
            <Path d="M10 15 Q16 12 22 15 L22 24 Q16 22 10 24 Z" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
            <Circle cx="10" cy="10" r="1.5" fill={color} stroke={strokeColor} strokeWidth={1}/>
            <Circle cx="22" cy="10" r="1.5" fill={color} stroke={strokeColor} strokeWidth={1}/>
          </G>
        );
      case 'r':
        return (
          <G>
            <Path d="M9 10 v4 M23 10 v4" stroke={strokeColor} strokeWidth={strokeW}/>
            <Rect x="9" y="8" width="14" height="4" rx="1.5" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
            <Rect x="11" y="12" width="10" height="4" rx="1" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
            <Path d="M11 16 L10 28 L22 28 L21 16 Z" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
          </G>
        );
      case 'b':
        return (
          <G>
            <Circle cx="16" cy="6" r="3" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
            <Path d="M16 9 L16 14 L13 14 L13 16" stroke={strokeColor} strokeWidth={1.2} strokeLinecap="round"/>
            <Path d="M12 18 Q16 14 20 18 L20 24 Q16 22 12 24 Z" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
          </G>
        );
      case 'n':
        return (
          <G>
            <Path d="M12 28 L22 28 L22 24 L16 24 L16 20 Q18 14 20 12 Q22 10 22 8 Q22 5 19 4 Q16 3 14 6 Q12 9 14 12 L12 14 L12 18 Z" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
            <Circle cx="18" cy="7" r="1.5" fill={color} stroke={strokeColor} strokeWidth={1}/>
          </G>
        );
      case 'p':
        return (
          <G>
            <Circle cx="16" cy="8" r="4" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
            <Path d="M13 14 L16 22 L19 14 Z" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
            <Rect x="12" y="22" width="8" height="4" rx="1" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>
          </G>
        );
      default:
        return <Circle cx="16" cy="16" r="12" fill={color} stroke={strokeColor} strokeWidth={strokeW}/>;
    }
  };

  return <Svg width={size} height={size} viewBox="0 0 32 32">{renderPiece()}</Svg>;
};

// ── Game Thumbnails (simplified) ──
export const GameThumbnailSvg = ({ gameId, size = 64 }: { gameId: string; size?: number }) => {
  switch (gameId) {
    case 'carrom':
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x="4" y="4" width="56" height="56" rx="8" fill="#d97706"/>
          <Circle cx="32" cy="32" r="20" fill="#f59e0b" stroke="#b45309" strokeWidth="2"/>
          <Circle cx="32" cy="32" r="8" fill="#fff3c4" stroke="#b45309" strokeWidth="1.5"/>
          <Circle cx="20" cy="20" r="3" fill="#ef4444"/>
          <Circle cx="44" cy="20" r="3" fill="#3b82f6"/>
          <Circle cx="20" cy="44" r="3" fill="#22c55e"/>
          <Circle cx="44" cy="44" r="3" fill="#facc15"/>
        </Svg>
      );
    case 'chess':
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x="4" y="4" width="56" height="56" rx="8" fill="#92400e"/>
          <Rect x="8" y="8" width="48" height="48" fill="#d97706"/>
          {[0,1,2,3,4,5,6,7].map(i => [0,1,2,3,4,5,6,7].map(j => {
            if ((i+j)%2===0) return null;
            return <Rect key={`${i}-${j}`} x={8+j*6} y={8+i*6} width="6" height="6" fill="#fef3c7"/>;
          }))}
          <Path d="M16 52 L20 44 L28 44 L32 52 Z" fill="#fff" stroke="#333" strokeWidth="1"/>
          <Path d="M36 52 L40 44 L48 44 L52 52 Z" fill="#111" stroke="#666" strokeWidth="1"/>
        </Svg>
      );
    case 'ludo':
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x="4" y="4" width="56" height="56" rx="8" fill="#1e3a5f"/>
          <Rect x="6" y="6" width="24" height="24" rx="4" fill="#ef4444"/>
          <Rect x="34" y="6" width="24" height="24" rx="4" fill="#22c55e"/>
          <Rect x="6" y="34" width="24" height="24" rx="4" fill="#facc15"/>
          <Rect x="34" y="34" width="24" height="24" rx="4" fill="#3b82f6"/>
          <Rect x="22" y="22" width="20" height="20" rx="2" fill="#fff"/>
          <Circle cx="32" cy="32" r="6" fill="#ef4444"/>
          <Circle cx="18" cy="18" r="3" fill="#fff" opacity={0.5}/>
          <Circle cx="46" cy="18" r="3" fill="#fff" opacity={0.5}/>
          <Circle cx="18" cy="46" r="3" fill="#fff" opacity={0.5}/>
          <Circle cx="46" cy="46" r="3" fill="#fff" opacity={0.5}/>
        </Svg>
      );
    case 'fruit-party':
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x="4" y="4" width="56" height="56" rx="8" fill="#831843"/>
          <Circle cx="24" cy="22" r="10" fill="#ef4444"/>
          <Circle cx="40" cy="22" r="10" fill="#f97316"/>
          <Circle cx="32" cy="40" r="10" fill="#22c55e"/>
          <Circle cx="18" cy="18" r="2" fill="#fff" opacity={0.6}/>
          <Circle cx="36" cy="18" r="2" fill="#fff" opacity={0.6}/>
        </Svg>
      );
    case 'forest-party':
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x="4" y="4" width="56" height="56" rx="8" fill="#14532d"/>
          <Circle cx="32" cy="22" r="12" fill="#22c55e"/>
          <Path d="M22 32 L32 18 L42 32 Z" fill="#16a34a"/>
          <Circle cx="22" cy="20" r="5" fill="#15803d"/>
          <Circle cx="42" cy="20" r="5" fill="#15803d"/>
          <Circle cx="32" cy="45" r="3" fill="#facc15"/>
          <Circle cx="18" cy="38" r="3" fill="#f97316"/>
          <Circle cx="46" cy="38" r="3" fill="#f97316"/>
        </Svg>
      );
    case 'roulette':
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x="4" y="4" width="56" height="56" rx="8" fill="#1a1a2e"/>
          <Circle cx="32" cy="32" r="24" fill="#2d1810" stroke="#b88a44" strokeWidth="2"/>
          {[0,1,2,3,4,5,6,7].map(i => (
            <Path key={i} d="M32 8 L34 8 L33 16 L31 16 Z" fill={i%2===0?'#ef4444':'#1a1a1a'} rotation={i*45} originX={32} originY={32}/>
          ))}
          <Circle cx="32" cy="32" r="8" fill="#b88a44"/>
          <Circle cx="32" cy="32" r="3" fill="#fcd34d"/>
        </Svg>
      );
    case 'teen-patti':
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Defs>
            <LinearGradient id="teenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7c3aed"/>
              <Stop offset="100%" stopColor="#4c1d95"/>
            </LinearGradient>
          </Defs>
          <Rect x="4" y="4" width="56" height="56" rx="12" fill="url(#teenGrad)"/>
          <Rect x="14" y="16" width="16" height="24" rx="2" fill="#fff" opacity="0.9"/>
          <SvgText x="22" y="32" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#7c3aed">A</SvgText>
          <Rect x="24" y="13" width="16" height="24" rx="2" fill="#fff"/>
          <SvgText x="32" y="29" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#dc2626">K</SvgText>
          <Rect x="34" y="16" width="16" height="24" rx="2" fill="#fff" opacity="0.9"/>
          <SvgText x="42" y="32" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#16a34a">Q</SvgText>
          <SvgText x="32" y="54" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fbbf24" fontFamily="Arial">3PATTI</SvgText>
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Rect x="4" y="4" width="56" height="56" rx="8" fill="#333"/>
          <Circle cx="32" cy="32" r="16" fill="#555"/>
          <SvgText x="32" y="36" textAnchor="middle" fontSize={20} fontWeight="900" fill="white" fontFamily="Arial">?</SvgText>
        </Svg>
      );
  }
};
