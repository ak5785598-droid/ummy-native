import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, RadialGradient, LinearGradient, Stop, Ellipse, Rect, G, ClipPath } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

export const CustomHomeIcon = ({ width = 22, height = 22, color = "#1E293B" }) => (
  <Svg width={width} height={height} viewBox="0 0 1000 1000">
    <Path
      fill={color}
      fillRule="evenodd"
      d="M 500 80 L 285 285 C 125 410 125 525 125 525 C 125 525 210 565 210 565 L 185 920 L 815 920 L 790 565 C 875 525 875 410 875 410 C 875 410 715 285 715 285 L 500 80 Z M 350 860 L 350 610 Q 350 550 500 550 Q 650 550 650 610 L 650 860 Z"
    />
  </Svg>
);

export const GlossyCalendarIcon = ({ width = 56, height = 56 }) => (
  <Svg width={width} height={height} viewBox="0 0 1024 1024">
    <Defs>
      <RadialGradient id="bg" cx="0.5" cy="0.32" r="0.78">
        <Stop offset="0%" stopColor="#C084F5" />
        <Stop offset="48%" stopColor="#9D4EDD" />
        <Stop offset="100%" stopColor="#6B21A8" />
      </RadialGradient>
      <LinearGradient id="ring" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="12%" stopColor="#F7F7F8" />
        <Stop offset="100%" stopColor="#D5D7DD" />
      </LinearGradient>
      <LinearGradient id="headHi" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </LinearGradient>
      <ClipPath id="clip">
        <Rect x="-230" y="-272" width="460" height="540" rx="34" />
      </ClipPath>
    </Defs>

    <Rect x="0" y="0" width="1024" height="1024" rx="228" fill="url(#bg)" />
    <Ellipse cx="512" cy="190" rx="560" ry="310" fill="#FFFFFF" opacity="0.06" />

    <G opacity="0.98">
      <G transform="translate(260 350)">
        <Path d="M0-72c5.5 28 26 48.5 72 54 -46 5.5 -66.5 26 -72 54 -5.5-28 -26-48.5-72-54 46-5.5 66.5-26 72-54z" fill="#FFFFFF" />
      </G>
      <G transform="translate(188 232) scale(0.56)">
        <Path d="M0-72c5.5 28 26 48.5 72 54 -46 5.5 -66.5 26 -72 54 -5.5-28 -26-48.5-72-54 46-5.5 66.5-26 72-54z" fill="#FFFFFF" />
      </G>
    </G>

    <G transform="translate(588 552) rotate(-9)">
      <Rect x="-220" y="-256" width="460" height="540" rx="36" fill="#C5C8D1" transform="translate(10 16)" />
      <Rect x="-230" y="-272" width="460" height="540" rx="34" fill="#FFFFFF" />
      <G clipPath="url(#clip)">
        <Rect x="-230" y="-272" width="460" height="122" fill="#4FC3F7" />
        <Rect x="-230" y="-272" width="460" height="122" fill="url(#headHi)" />
      </G>
      <Rect x="206" y="-248" width="18" height="496" rx="9" fill="#000000" opacity="0.04" />
      <Rect x="-228" y="250" width="456" height="18" rx="9" fill="#E9EBEF" opacity="0.9" />
      
      <Path d="M-88 18 L-16 90 L108 -56" fill="none" stroke="#00A6ED" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M-88 18 L-16 90 L108 -56" fill="none" stroke="#FFFFFF" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" opacity="0.07" transform="translate(0 -4)" />

      <G transform="translate(-98 -262)">
        <Ellipse cx="0" cy="30" rx="27" ry="9.5" fill="#000" opacity="0.12" />
        <Rect x="-26" y="-38" width="52" height="68" rx="26" fill="url(#ring)" />
        <Ellipse cx="0" cy="-32" rx="17.5" ry="6" fill="#FFFFFF" />
        <Ellipse cx="0" cy="-24" rx="14" ry="3.5" fill="#000" opacity="0.06" />
        <Rect x="-26" y="12" width="52" height="22" fill="#FFFFFF" />
      </G>
      <G transform="translate(98 -262)">
        <Ellipse cx="0" cy="30" rx="27" ry="9.5" fill="#000" opacity="0.12" />
        <Rect x="-26" y="-38" width="52" height="68" rx="26" fill="url(#ring)" />
        <Ellipse cx="0" cy="-32" rx="17.5" ry="6" fill="#FFFFFF" />
        <Ellipse cx="0" cy="-24" rx="14" ry="3.5" fill="#000" opacity="0.06" />
        <Rect x="-26" y="12" width="52" height="22" fill="#FFFFFF" />
      </G>
    </G>
  </Svg>
);

export const SVGA_OfficialTag = () => (
  <View style={{
    width: 78,
    height: 22,
    borderRadius: 11,
    padding: 1,
    backgroundColor: '#ffe8b8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    position: 'relative',
  }}>
    <ExpoLinearGradient
      colors={['#ffe8b8', '#f5c57a', '#e4a95a', '#d08c3a']}
      start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 11 }}
    />
    <View style={{
      flex: 1,
      borderRadius: 10,
      justifyContent: 'center',
      paddingLeft: 19,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ExpoLinearGradient
        colors={['#b82340', '#a81835', '#98142f', '#8a102b', '#7f0e27']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 10 }}
      />
      {/* Light Shine Effect */}
      <ExpoLinearGradient
        colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.05)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 4, right: 4, height: '45%', borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
      />
      
      {/* Gold Coin Badge 'U' */}
      <View style={{
        position: 'absolute',
        left: 2,
        top: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 0.5,
        borderColor: '#e9a84a',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        backgroundColor: '#f18c1f',
      }}>
        <ExpoLinearGradient
          colors={['#ffc46a', '#ffb03a', '#f18c1f', '#d87312']}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 8 }}
        />
        <Text style={{
          color: '#fff9d1',
          fontSize: 10,
          fontWeight: '900',
          fontFamily: 'serif',
          lineHeight: 12,
          textShadowColor: 'rgba(90,42,0,0.8)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 1,
        }}>U</Text>
      </View>
      
      {/* Official Text */}
      <Text style={{
        color: '#fff9d1',
        fontSize: 10,
        fontWeight: '900',
        fontFamily: 'serif',
        marginLeft: 1,
        lineHeight: 12,
        textShadowColor: 'rgba(90,42,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1.5,
      }}>Official</Text>
    </View>
  </View>
);

export const SVGA_GlossyID = ({ label }: { label: string }) => {
  const idNum = label ? label.replace('ID: ', '').trim() : '000000';
  return (
    <View className="flex-row items-center h-[18px] rounded-full px-2" style={{ backgroundColor: '#912480', borderColor: '#c157a8', borderWidth: 1 }}>
      <ExpoLinearGradient
        colors={['#6b1e60', '#b33596']}
        className="absolute inset-0 rounded-full"
      />
      <Text className="text-[10px] font-bold text-white tracking-widest">{idNum}</Text>
    </View>
  );
};
