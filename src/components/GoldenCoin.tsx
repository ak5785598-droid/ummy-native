import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Text as SvgText,
  G,
  Path
} from 'react-native-svg';

interface GoldenCoinProps {
  size?: number;
}

export function GoldenCoin({ size = 18 }: GoldenCoinProps) {
  return (
    <View 
      style={{ 
        width: size, 
        height: size, 
        alignItems: 'center', 
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Metallic 3D Rim Gradient */}
          <SvgLinearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ffe57f" />
            <Stop offset="25%" stopColor="#ffb300" />
            <Stop offset="50%" stopColor="#8d6e63" />
            <Stop offset="75%" stopColor="#ffca28" />
            <Stop offset="100%" stopColor="#5d4037" />
          </SvgLinearGradient>

          {/* Deep Inner 3D Bevel Shadow */}
          <SvgLinearGradient id="bevelGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#3e2723" stopOpacity={0.9} />
            <Stop offset="50%" stopColor="#795548" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#ffe082" stopOpacity={0.9} />
          </SvgLinearGradient>

          {/* Rich Radial Background for Gold Face */}
          <RadialGradient id="faceGrad" cx="45%" cy="45%" r="50%" fx="30%" fy="30%">
            <Stop offset="0%" stopColor="#fff9c4" />
            <Stop offset="40%" stopColor="#fdd835" />
            <Stop offset="80%" stopColor="#f57f17" />
            <Stop offset="100%" stopColor="#5d4037" />
          </RadialGradient>

          {/* Golden Gradient for the Symbol */}
          <SvgLinearGradient id="symbolGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="30%" stopColor="#ffee58" />
            <Stop offset="70%" stopColor="#f57f17" />
            <Stop offset="100%" stopColor="#3e2723" />
          </SvgLinearGradient>

          {/* Glossy Overlay Highlight */}
          <SvgLinearGradient id="glossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </SvgLinearGradient>

          {/* Drop Shadow for Symbol */}
          <SvgLinearGradient id="symShadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#000000" stopOpacity={0.6} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>

        {/* 1. Outer Heavy Gold Border (Rim) */}
        <Circle cx="50" cy="50" r="49" fill="url(#rimGrad)" />

        {/* 2. Inner Bevel Cut */}
        <Circle cx="50" cy="50" r="44" fill="url(#bevelGrad)" />

        {/* 3. Main Coin Face (Radial Sunburst) */}
        <Circle cx="50" cy="50" r="41" fill="url(#faceGrad)" />

        {/* 4. Fine Circular Ridge (Classic Coin Detail) */}
        <Circle cx="50" cy="50" r="37" fill="none" stroke="#ffe082" strokeWidth="1.2" strokeOpacity={0.85} strokeDasharray="3 1.5" />

        {/* 5. Symbol Drop Shadow Layer */}
        <G transform="translate(1.5, 2.5)">
          <SvgText
            x="50"
            y="67"
            fontFamily="System"
            fontWeight="900"
            fontSize="54"
            textAnchor="middle"
            fill="#3e2723"
            opacity={0.7}
          >
            $
          </SvgText>
        </G>

        {/* 6. Main 3D Relief $ Symbol */}
        <SvgText
          x="50"
          y="66"
          fontFamily="System"
          fontWeight="950"
          fontSize="54"
          textAnchor="middle"
          fill="url(#symbolGrad)"
          letterSpacing="1"
        >
          $
        </SvgText>

        {/* 7. Glossy Reflection (Top Half Diagonal Overlay) */}
        <Path
          d="M 12 40 A 41 41 0 0 1 88 40 A 41 32 0 0 0 12 40 Z"
          fill="url(#glossGrad)"
          opacity={0.7}
        />

        {/* 8. Star Sparkle (Highly Premium Polish) */}
        <G transform="translate(72, 23)">
          {/* Star Vertical Spike */}
          <Path d="M 0 -8 L 0 8" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          {/* Star Horizontal Spike */}
          <Path d="M -8 0 L 8 0" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          {/* Star Center Glow */}
          <Circle cx="0" cy="0" r="2.5" fill="#ffffff" />
        </G>
      </Svg>
    </View>
  );
}
