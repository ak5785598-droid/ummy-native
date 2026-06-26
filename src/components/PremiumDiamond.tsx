import React from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Path,
  Circle,
  G
} from 'react-native-svg';

interface PremiumDiamondProps {
  size?: number;
}

export function PremiumDiamond({ size = 18 }: PremiumDiamondProps) {
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
          {/* Facet Gradients for 3D depth */}
          <SvgLinearGradient id="blueShine" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#e0f7fa" />
            <Stop offset="50%" stopColor="#26c6da" />
            <Stop offset="100%" stopColor="#006064" />
          </SvgLinearGradient>

          <SvgLinearGradient id="facetLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" />
            <Stop offset="50%" stopColor="#b2ebf2" />
            <Stop offset="100%" stopColor="#00acc1" />
          </SvgLinearGradient>

          <SvgLinearGradient id="facetMid" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#80deea" />
            <Stop offset="60%" stopColor="#00bcd4" />
            <Stop offset="100%" stopColor="#00838f" />
          </SvgLinearGradient>

          <SvgLinearGradient id="facetDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#00acc1" />
            <Stop offset="70%" stopColor="#006064" />
            <Stop offset="100%" stopColor="#002d30" />
          </SvgLinearGradient>

          <SvgLinearGradient id="facetDeep" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#00838f" />
            <Stop offset="100%" stopColor="#00363a" />
          </SvgLinearGradient>

          <SvgLinearGradient id="starGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>

        {/* 1. Subtle Outer Glow */}
        <Circle cx="50" cy="53" r="43" fill="#00e5ff" opacity={0.12} />

        {/* 2. Main Diamond Facets */}
        
        {/* Top-Left facet */}
        <Path d="M 30 25 L 38 45 L 15 45 Z" fill="url(#facetMid)" stroke="#b2ebf2" strokeWidth="0.8" />

        {/* Top-Center-Left facet */}
        <Path d="M 30 25 L 50 25 L 38 45 Z" fill="url(#facetLight)" stroke="#b2ebf2" strokeWidth="0.8" />

        {/* Top-Center-Right facet */}
        <Path d="M 70 25 L 50 25 L 62 45 Z" fill="url(#facetLight)" stroke="#b2ebf2" strokeWidth="0.8" />

        {/* Top-Right facet */}
        <Path d="M 70 25 L 85 45 L 62 45 Z" fill="url(#facetMid)" stroke="#b2ebf2" strokeWidth="0.8" />

        {/* Center-Top Triangle facet */}
        <Path d="M 50 25 L 62 45 L 38 45 Z" fill="url(#blueShine)" stroke="#ffffff" strokeWidth="0.8" />

        {/* Bottom-Left facet */}
        <Path d="M 15 45 L 38 45 L 50 85 Z" fill="url(#facetDark)" stroke="#26c6da" strokeWidth="0.8" />

        {/* Bottom-Center facet */}
        <Path d="M 38 45 L 62 45 L 50 85 Z" fill="url(#facetMid)" stroke="#e0f7fa" strokeWidth="0.8" />

        {/* Bottom-Right facet */}
        <Path d="M 85 45 L 62 45 L 50 85 Z" fill="url(#facetDeep)" stroke="#26c6da" strokeWidth="0.8" />

        {/* 3. Pure White Sparkle Flare (Top-Right reflection) */}
        <G transform="translate(73, 33)">
          <Path d="M 0 -10 L 0 10" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M -10 0 L 10 0" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <Circle cx="0" cy="0" r="3.2" fill="#ffffff" />
        </G>
        
        {/* 4. Small Secondary Sparkle (Bottom-Left) */}
        <G transform="translate(25, 65)">
          <Path d="M 0 -5 L 0 5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M -5 0 L 5 0" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <Circle cx="0" cy="0" r="1.5" fill="#ffffff" />
        </G>
      </Svg>
    </View>
  );
}
