import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop, Circle, Rect, Ellipse, Text as SvgText, G } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Sparkles, DollarSign } from 'lucide-react-native';
import { GoldenCoin } from '../GoldenCoin';

const serifFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';

// ============================================================
// OFFICIAL TAG — Emerald Green capsule + Gold border + Bear SVG icon (matches web)
// ============================================================
export const SVGA_OfficialTag = React.memo(() => (
  <View style={{
    height: 19,
    width: 78,
    marginLeft: 6,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  }}>
    {/* @ts-ignore - overflow is valid for Svg but not in types */}
    <Svg width="88" height="34" viewBox="-5 -7 96 34" overflow="visible" style={{ position: 'absolute', top: -8 }}>
      <Defs>
        <SvgLinearGradient id="otGoldBorder" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffe8b8" />
          <Stop offset="30%" stopColor="#f5c57a" />
          <Stop offset="70%" stopColor="#e4a95a" />
          <Stop offset="100%" stopColor="#d08c3a" />
        </SvgLinearGradient>
        <SvgLinearGradient id="otRedInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#b82340" />
          <Stop offset="20%" stopColor="#a81835" />
          <Stop offset="50%" stopColor="#98142f" />
          <Stop offset="85%" stopColor="#8a102b" />
          <Stop offset="100%" stopColor="#7f0e27" />
        </SvgLinearGradient>
        <RadialGradient id="otRadialCoin" cx="30%" cy="30%" rx="70%" ry="70%" fx="30%" fy="30%">
          <Stop offset="0%" stopColor="#fffae0" />
          <Stop offset="25%" stopColor="#ffd859" />
          <Stop offset="65%" stopColor="#fca01a" />
          <Stop offset="100%" stopColor="#a35200" />
        </RadialGradient>
        <SvgLinearGradient id="otLetterGold" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#fffeee" />
          <Stop offset="40%" stopColor="#fff8cd" />
          <Stop offset="80%" stopColor="#ffd86b" />
          <Stop offset="100%" stopColor="#e5a93b" />
        </SvgLinearGradient>
        <SvgLinearGradient id="otShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
          <Stop offset="35%" stopColor="rgba(255,255,255,0.18)" />
          <Stop offset="70%" stopColor="rgba(255,255,255,0.05)" />
          <Stop offset="100%" stopColor="transparent" />
        </SvgLinearGradient>
      </Defs>

      {/* Main Red capsule with gold border */}
      <Rect x="8" y="1.0" width="74" height="18" rx="9.0" fill="url(#otRedInner)" />
      <Rect x="6.5" y="0.0" width="77" height="20" rx="10.0" fill="none" stroke="url(#otGoldBorder)" strokeWidth="1.8" />

      {/* Bottom subtle shadow line */}
      <Rect x="20" y="18" width="50" height="0.8" rx="0.4" fill="black" opacity="0.3" />

      {/* U MEDALLION (Layered for 3D metallic feel, popping out) */}
      {/* Drop shadow of the medallion */}
      <Circle cx="12.2" cy="11.2" r="15.5" fill="black" opacity="0.22" />

      {/* Layered concentric rings for 3D elevation */}
      {/* Outer border (dark bronze) */}
      <Circle cx="11" cy="10" r="15.5" fill="#5b2700" />
      {/* Highlight ring (light gold) */}
      <Circle cx="11" cy="10" r="14.7" fill="#f3c26f" />
      {/* Inner border (dark bronze) */}
      <Circle cx="11" cy="10" r="13.4" fill="#3b1800" />
      {/* Coin Surface (Yellow/Gold Radial Gradient) */}
      <Circle cx="11" cy="10" r="12.5" fill="url(#otRadialCoin)" />
      
      {/* Medallion Inner Gold Bevel reflection */}
      <Circle cx="11" cy="10" r="11.1" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />

      {/* U Letter (Serif Georgia/serif font + Drop Shadow for 3D depth, mirrored horizontally to swap thin/thick stems) */}
      <G transform="translate(11, 10) scale(-1.35, 0.95) translate(-11, -10)">
        <SvgText x="11.8" y="16.7" fontSize="17.2" fontWeight="700" fill="#3b1800" stroke="#3b1800" strokeWidth="1.0" textAnchor="middle" fontFamily={serifFont}>U</SvgText>
        <SvgText x="10.8" y="15.7" fontSize="17.2" fontWeight="700" fill="url(#otLetterGold)" textAnchor="middle" fontFamily={serifFont}>U</SvgText>
      </G>

      {/* Official Text (Serif Georgia font + Drop Shadow to match Web) */}
      <SvgText x="51.5" y="14.8" fontSize="13.5" fontWeight="900" fill="#4d0613" stroke="#4d0613" strokeWidth="1.2" textAnchor="middle" fontFamily="Georgia" letterSpacing="0.2">Official</SvgText>
      <SvgText x="51" y="14" fontSize="13.5" fontWeight="900" fill="url(#otLetterGold)" stroke="url(#otLetterGold)" strokeWidth="0.8" textAnchor="middle" fontFamily="Georgia" letterSpacing="0.2">Official</SvgText>
    </Svg>
  </View>
));
SVGA_OfficialTag.displayName = 'SVGA_OfficialTag';

// ============================================================
// SELLER TAG — Orange gradient pill + Red Bag SVG icon (matches web)
// ============================================================
export const SVGA_SellerTag = React.memo(() => (
  <View style={{
    height: 22,
    marginLeft: 4,
    borderRadius: 11,
    overflow: 'hidden',
    shadowColor: '#ff9500',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  }}>
    <ExpoLinearGradient
      colors={['#FFAE00', '#FFC300', '#FF9500']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#FFE1A8',
        borderRadius: 11,
      }}
    >
      {/* Red Bag Icon */}
      <View style={{ width: 14, height: 14, marginRight: 4 }}>
        <Svg viewBox="0 0 40 40" width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id="redBag" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FF5F5F" />
              <Stop offset="100%" stopColor="#C81E1E" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M20 6 C16 8 14 11 14 13 L26 13 C26 11 24 8 20 8 Z" fill="#991B1B" />
          <Path d="M12 14 C12 14 8 20 8 28 C8 34 12 36 20 36 C28 36 32 34 32 28 C32 20 28 14 28 14 Z" fill="url(#redBag)" />
          <SvgText x="20" y="30" fontSize="15" fontWeight="900" fill="white" textAnchor="middle" fontFamily="sans-serif">$</SvgText>
          <Ellipse cx="14" cy="22" rx="3" ry="1.5" fill="white" fillOpacity="0.4" transform="rotate(-20 14 22)" />
        </Svg>
      </View>
      <Text style={{
        fontSize: 9,
        fontWeight: '900',
        color: 'white',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
      }}>
        Seller
      </Text>
    </ExpoLinearGradient>
  </View>
));
SVGA_SellerTag.displayName = 'SVGA_SellerTag';

// ============================================================
// SERVICE TAG — Teal gradient pill
// ============================================================
export const SVGA_ServiceTag = React.memo(() => (
  <View style={{ height: 22, marginLeft: 4, borderRadius: 11, overflow: 'hidden' }}>
    <ExpoLinearGradient colors={['#17CFB8', '#0D9482']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={{ height: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: '#A7FFF1', borderRadius: 11 }}>
      <Text style={{ fontSize: 9, fontWeight: '900', color: 'white', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>Service</Text>
    </ExpoLinearGradient>
  </View>
));
SVGA_ServiceTag.displayName = 'SVGA_ServiceTag';

// ============================================================
// HOST TAG — Purple gradient pill
// ============================================================
export const SVGA_HostTag = React.memo(() => (
  <View style={{ height: 22, marginLeft: 4, borderRadius: 11, overflow: 'hidden' }}>
    <ExpoLinearGradient colors={['#B57AFF', '#803AF5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={{ height: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: '#E0C6FF', borderRadius: 11 }}>
      <Text style={{ fontSize: 9, fontWeight: '900', color: 'white', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>Host</Text>
    </ExpoLinearGradient>
  </View>
));
SVGA_HostTag.displayName = 'SVGA_HostTag';

// ============================================================
// CS LEADER TAG — Blue-magenta nebula gradient + bear icon
// ============================================================
export const SVGA_CSLeaderTag = React.memo(() => (
  <View style={{ height: 22, marginLeft: 2, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
    <Svg width="125" height="22" viewBox="0 0 130 24">
      <Defs>
        <SvgLinearGradient id="csLeaderNebula" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#0284c7" />
          <Stop offset="50%" stopColor="#7c3aed" />
          <Stop offset="100%" stopColor="#d946ef" />
        </SvgLinearGradient>
        <SvgLinearGradient id="csLeaderGoldBorder" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#fde047" />
          <Stop offset="50%" stopColor="#fbbf24" />
          <Stop offset="100%" stopColor="#d97706" />
        </SvgLinearGradient>
        <SvgLinearGradient id="csLeaderShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width="130" height="24" rx="12" fill="url(#csLeaderGoldBorder)" />
      <Rect x="2" y="2" width="126" height="20" rx="10" fill="url(#csLeaderNebula)" />
      <Rect x="12" y="3" width="106" height="9" rx="4" fill="url(#csLeaderShine)" />
      <Circle cx="16" cy="12" r="8" fill="#facc15" />
      <Circle cx="10" cy="7" r="4" fill="#facc15" />
      <Circle cx="22" cy="7" r="4" fill="#facc15" />
      <Circle cx="10" cy="7" r="2.2" fill="#ff80ab" />
      <Circle cx="22" cy="7" r="2.2" fill="#ff80ab" />
      <Circle cx="13.5" cy="11" r="1.2" fill="#1a1a1a" />
      <Circle cx="18.5" cy="11" r="1.2" fill="#1a1a1a" />
      <Circle cx="16" cy="14" r="3" fill="#fff9c4" opacity="0.9" />
      <Circle cx="16" cy="13.2" r="1" fill="#1a1a1a" />
      <SvgText x="72" y="15.5" fontSize="11" fontWeight="900" fill="white" textAnchor="middle" fontFamily="sans-serif" letterSpacing="0.2">CS Leader</SvgText>
      <Circle cx="122" cy="6" r="1.5" fill="white" opacity="0.8" />
      <Circle cx="118" cy="20" r="1" fill="white" opacity="0.5" />
    </Svg>
  </View>
));
SVGA_CSLeaderTag.displayName = 'SVGA_CSLeaderTag';

// ============================================================
// CUSTOMER SERVICE TAG — Blue gradient + bear icon
// ============================================================
export const SVGA_CustomerServiceTag = React.memo(() => (
  <View style={{ height: 22, marginLeft: 2, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
    <Svg width="145" height="22" viewBox="0 0 150 24">
      <Defs>
        <SvgLinearGradient id="csBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#38bdf8" />
          <Stop offset="50%" stopColor="#0284c7" />
          <Stop offset="100%" stopColor="#0369a1" />
        </SvgLinearGradient>
        <SvgLinearGradient id="csGoldBorder2" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#fde047" />
          <Stop offset="50%" stopColor="#fbbf24" />
          <Stop offset="100%" stopColor="#d97706" />
        </SvgLinearGradient>
        <SvgLinearGradient id="csShine2" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width="150" height="24" rx="12" fill="url(#csGoldBorder2)" />
      <Rect x="2" y="2" width="146" height="20" rx="10" fill="url(#csBlueGrad)" />
      <Rect x="12" y="3" width="126" height="9" rx="4" fill="url(#csShine2)" />
      <Circle cx="16" cy="12" r="8" fill="#fbc02d" />
      <Circle cx="10" cy="7" r="4" fill="#fbc02d" />
      <Circle cx="22" cy="7" r="4" fill="#fbc02d" />
      <Circle cx="10" cy="7" r="2.2" fill="#ff80ab" />
      <Circle cx="22" cy="7" r="2.2" fill="#ff80ab" />
      <Circle cx="13.5" cy="11" r="1.2" fill="#1a1a1a" />
      <Circle cx="18.5" cy="11" r="1.2" fill="#1a1a1a" />
      <Circle cx="16" cy="14" r="3" fill="#fff9c4" opacity="0.9" />
      <Circle cx="16" cy="13.2" r="1" fill="#1a1a1a" />
      <SvgText x="82" y="15.5" fontSize="10.5" fontWeight="900" fill="white" textAnchor="middle" fontFamily="sans-serif" letterSpacing="0.2">Customer Service</SvgText>
      <Circle cx="142" cy="6" r="1.5" fill="white" opacity="0.8" />
      <Circle cx="138" cy="20" r="1" fill="white" opacity="0.5" />
    </Svg>
  </View>
));
SVGA_CustomerServiceTag.displayName = 'SVGA_CustomerServiceTag';

// ============================================================
// ✅ GLOSSY ID — Pixel-Perfect Web Match (SVG-based hexagonal frame)
// ============================================================
export const SVGA_GlossyID = React.memo(({ label }: { label: string }) => {
  const idNum = label ? label.replace('ID: ', '').trim() : '000000';
  return (
    <View style={{ height: 28, marginLeft: -6, flexDirection: 'row', alignItems: 'center', overflow: 'visible' }}>
      {/* Hexagonal Gold Frame SVG — sits on left, slight overlap with pill */}
      <View style={{ width: 36, height: 36, zIndex: 10 }}>
        <Svg width="36" height="36" viewBox="0 0 60 60">
          <Defs>
            <SvgLinearGradient id="gfGoldFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FBE3A4" />
              <Stop offset="40%" stopColor="#D2923A" />
              <Stop offset="60%" stopColor="#F9D479" />
              <Stop offset="100%" stopColor="#B37322" />
            </SvgLinearGradient>
            <SvgLinearGradient id="gfPurpleGem" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#D57EEB" />
              <Stop offset="50%" stopColor="#8A2387" />
              <Stop offset="100%" stopColor="#4A00E0" />
            </SvgLinearGradient>
            <SvgLinearGradient id="gfTextGloss" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="50%" stopColor="#F3E5F5" />
              <Stop offset="100%" stopColor="#D1A3D8" />
            </SvgLinearGradient>
            <SvgLinearGradient id="gfGoldS" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFF1AA" />
              <Stop offset="100%" stopColor="#F3A92A" />
            </SvgLinearGradient>
          </Defs>
          {/* Hexagonal gold frame */}
          <Path d="M30 4 L54 18 L54 42 L30 56 L6 42 L6 18 Z" fill="url(#gfGoldFrame)" />
          {/* Purple gem */}
          <Path d="M30 8 L50 20 L50 40 L30 52 L10 40 L10 20 Z" fill="url(#gfPurpleGem)" />
          {/* Top highlight */}
          <Path d="M10 20 L30 8 L50 20 L30 28 Z" fill="white" fillOpacity="0.15" />
          {/* ID text */}
          <SvgText x="30" y="38" fontSize="22" fontWeight="900" fill="url(#gfTextGloss)" textAnchor="middle" letterSpacing="-1" fontFamily="sans-serif">ID</SvgText>
          {/* Bottom tail */}
          <Path d="M18 45 C 24 58, 36 58, 42 45 C 36 52, 24 52, 18 45 Z" fill="url(#gfGoldFrame)" />
          <Path d="M22 43 L38 43 L34 54 L26 54 Z" fill="url(#gfGoldFrame)" />
          <SvgText x="30" y="52" fontSize="13" fontWeight="900" fill="url(#gfGoldS)" textAnchor="middle" fontFamily="sans-serif">S</SvgText>
          {/* Sparkles */}
          <Circle cx="45" cy="10" r="1.5" fill="white" />
          <Circle cx="12" cy="38" r="1.2" fill="white" />
        </Svg>
      </View>
      {/* Purple pill with ID number — starts right after hexagon with slight overlap */}
      <View style={{ marginLeft: -22, zIndex: 5 }}>
        <ExpoLinearGradient
          colors={['#6b1e60', '#912480', '#b33596']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            height: 20,
            minWidth: 84,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 26,
            paddingRight: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#c157a8',
          }}
        >
          {/* Top glossy shine */}
          <View style={{ position: 'absolute', top: 1, left: '15%', right: '15%', height: '40%', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 }} />
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: 'white', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>
            {idNum}
          </Text>
        </ExpoLinearGradient>
      </View>
    </View>
  );
});
SVGA_GlossyID.displayName = 'SVGA_GlossyID';

// ============================================================
// ✅ VIP BANNER
// ============================================================
export const SVGA_VIPBanner = React.memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.95}
    style={{ marginTop: 12, width: '100%', height: 75, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 }}>
    <ExpoLinearGradient colors={['#02C697', '#2087D6', '#9C3FE4']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
      style={{ width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
      <View style={{ width: 90, height: '100%', justifyContent: 'center', overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 32, transform: [{ scale: 0.7 }, { rotate: '5deg' }], opacity: 0.8 }}>
          <Svg width="45" height="50" viewBox="0 0 45 50">
            <Defs><SvgLinearGradient id="vpPink" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#FF7EB3" /><Stop offset="100%" stopColor="#E7227E" /></SvgLinearGradient></Defs>
            <Path d="M22.5 0 L45 12.5 V37.5 L22.5 50 L0 37.5 V12.5 Z" fill="url(#vpPink)" />
            <SvgText x="22.5" y="30" textAnchor="middle" fill="white" fontSize="14" fontWeight="900">VIP</SvgText>
          </Svg>
        </View>
        <View style={{ position: 'absolute', left: 16, transform: [{ scale: 0.8 }, { rotate: '-5deg' }] }}>
          <Svg width="45" height="50" viewBox="0 0 45 50">
            <Defs><SvgLinearGradient id="vpBlue" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#4FACFE" /><Stop offset="100%" stopColor="#0066FF" /></SvgLinearGradient></Defs>
            <Path d="M22.5 0 L45 12.5 V37.5 L22.5 50 L0 37.5 V12.5 Z" fill="url(#vpBlue)" />
            <SvgText x="22.5" y="30" textAnchor="middle" fill="white" fontSize="14" fontWeight="900">VIP</SvgText>
          </Svg>
        </View>
        <View style={{ position: 'absolute', left: 0, zIndex: 10, transform: [{ scale: 0.9 }] }}>
          <Svg width="50" height="55" viewBox="0 0 50 55">
            <Defs><SvgLinearGradient id="vpGreen" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#5AF9B1" /><Stop offset="100%" stopColor="#00AD69" /></SvgLinearGradient></Defs>
            <Path d="M25 0 L50 13.75 V41.25 L25 55 L0 41.25 V13.75 Z" fill="url(#vpGreen)" stroke="white" strokeWidth="1.5" />
            <SvgText x="25" y="45" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" letterSpacing="1">VIP</SvgText>
          </Svg>
        </View>
      </View>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '900', fontSize: 18 }}>VIP Club</Text>
          <Sparkles size={12} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', marginTop: 2 }}>Upgrade to VIP and get free coins daily</Text>
      </View>
      <View style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, overflow: 'hidden' }}>
        <ExpoLinearGradient colors={['#FFE770', '#9E7302']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 25 }} />
        <Text style={{ color: '#5C4000', fontWeight: '900', fontSize: 12 }}>GET VIP</Text>
      </View>
    </ExpoLinearGradient>
  </TouchableOpacity>
));
SVGA_VIPBanner.displayName = 'SVGA_VIPBanner';

// ============================================================
// ✅ QUICK ACTION ICONS
// ============================================================
export const SVGA_GoldDollar = React.memo(() => (
  <GoldenCoin size={32} />
));
SVGA_GoldDollar.displayName = 'SVGA_GoldDollar';

export const SVGA_LevelCrown = React.memo(() => (
  <Svg width="32" height="32" viewBox="0 0 24 24">
    <Defs><SvgLinearGradient id="lcGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#FFC837" /><Stop offset="50%" stopColor="#FF8008" /><Stop offset="100%" stopColor="#FF6A00" /></SvgLinearGradient></Defs>
    <Path fill="url(#lcGrad)" d="M5 16 L3 5 L8.5 10 L12 4 L15.5 10 L21 5 L19 16 L5 16 Z M5 19 L19 19 C19 20.1 18.1 21 17 21 L7 21 C5.9 21 5 20.1 5 19 Z" />
  </Svg>
));
SVGA_LevelCrown.displayName = 'SVGA_LevelCrown';

export const SVGA_StoreCart = React.memo(() => (
  <Svg width="32" height="32" viewBox="0 0 24 24">
    <Defs><SvgLinearGradient id="scGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#00D2FF" /><Stop offset="100%" stopColor="#3a7bd5" /></SvgLinearGradient></Defs>
    <Path fill="url(#scGrad)" d="M7 18 C5.9 18 5.01 18.9 5.01 20 C5.01 21.1 5.9 22 7 22 C8.1 22 9 21.1 9 20 C9 18.9 8.1 18.1 7 18 Z M1 2 L1 4 L3 4 L6.6 11.59 L5.25 14.04 C5.09 14.32 5 14.65 5 15 C5 16.1 5.9 17 7 17 L19 17 L19 15 L7.42 15 C7.28 15 7.17 14.89 7.17 14.75 L7.2 14.63 L8.1 13 L15.55 13 C16.3 13 16.96 12.59 17.3 11.97 L20.88 5.48 C21.05 5.17 21 4.82 21 4.5 C21 4.22 20.78 4 20.5 4 L5.21 4 L4.27 2 L1 2 Z M17 18 C15.9 18 15.01 18.9 15.01 20 C15.01 21.1 15.9 22 17 22 C18.1 22 19 21.1 19 20 C19 18.9 18.1 18.1 17 18 Z" />
  </Svg>
));
SVGA_StoreCart.displayName = 'SVGA_StoreCart';

export const SVGA_MedalStar = React.memo(() => (
  <Svg width="36" height="36" viewBox="0 0 24 24">
    <Defs><SvgLinearGradient id="msGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#C084FC" /><Stop offset="100%" stopColor="#9333EA" /></SvgLinearGradient></Defs>
    <Path d="M8 2 L16 2 L15 5 L9 5 Z" fill="#7E22CE" />
    <Circle cx="12" cy="13" r="8" fill="url(#msGrad)" />
    <Path fill="white" fillOpacity="0.9" d="M12 9.5 L13.2 12.1 L16 12.4 L13.9 14.2 L14.5 17 L12 15.5 L9.5 17 L10.1 14.2 L8 12.4 L10.8 12.1 Z" />
  </Svg>
));
SVGA_MedalStar.displayName = 'SVGA_MedalStar';

export const SVGA_BonusGift = React.memo(() => (
  <Svg width="36" height="36" viewBox="0 0 24 24">
    <Defs>
      <SvgLinearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#FB923C" /><Stop offset="100%" stopColor="#EA580C" /></SvgLinearGradient>
      <SvgLinearGradient id="bgRibbon" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#FDE047" /><Stop offset="100%" stopColor="#CA8A04" /></SvgLinearGradient>
    </Defs>
    <Rect x="4" y="9" width="16" height="11" rx="2" fill="url(#bgGrad)" stroke="#C2410C" strokeWidth="0.5" />
    <Rect x="3" y="6" width="18" height="3" rx="1.5" fill="url(#bgGrad)" stroke="#C2410C" strokeWidth="0.5" />
    <Rect x="11" y="6" width="2" height="14" fill="url(#bgRibbon)" />
    <Rect x="3" y="7" width="18" height="1" fill="url(#bgRibbon)" />
    <Path d="M12 6 C10 3 10 1 12 3 C14 1 14 3 12 6 Z" fill="url(#bgRibbon)" stroke="#CA8A04" strokeWidth="0.5" />
  </Svg>
));
SVGA_BonusGift.displayName = 'SVGA_BonusGift';

// ============================================================
// ✅ MENU ITEM ICONS
// ============================================================
export const SVGA_InviteHeart = React.memo(() => (
  <Svg width="44" height="44" viewBox="0 0 40 40">
    <Defs><SvgLinearGradient id="ihGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#FF9EB5" /><Stop offset="100%" stopColor="#FF5C8A" /></SvgLinearGradient></Defs>
    <Rect x="4" y="4" width="32" height="32" rx="10" fill="url(#ihGrad)" />
    <Path d="M8 14 L20 24 L32 14 V28 C32 29.1 31.1 30 30 30 H10 C8.9 30 8 29.1 8 28 V14 Z" fill="white" />
    <Path d="M20 24 L8 14 H32 L20 24 Z" fill="#FFD1DC" />
    <Path fill="#FF5C8A" d="M20 22 C20 22 18.5 20.5 17.5 20.5 C16.5 20.5 15.5 21.3 15.5 22.5 C15.5 24 18 26 20 27 C22 26 24.5 24 24.5 22.5 C24.5 21.3 23.5 20.5 22.5 20.5 C21.5 20.5 20 22 20 22 Z" />
  </Svg>
));
SVGA_InviteHeart.displayName = 'SVGA_InviteHeart';

export const SVGA_FamilyShield = React.memo(() => (
  <Svg width="44" height="44" viewBox="0 0 40 40">
    <Defs><SvgLinearGradient id="fsGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#CD7F32" /><Stop offset="100%" stopColor="#8B4513" /></SvgLinearGradient></Defs>
    <Path fill="url(#fsGrad)" d="M10 6 H30 V26 C30 26 20 34 20 34 C20 34 10 26 10 26 V6 Z" stroke="#5D2E0A" strokeWidth="1" />
    <Rect x="8" y="4" width="24" height="4" rx="2" fill="#5D2E0A" />
    <Circle cx="20" cy="16" r="3.5" fill="#FFE4D1" />
    <Circle cx="14" cy="19" r="3.5" fill="#FFE4D1" opacity="0.8" />
    <Circle cx="26" cy="19" r="3.5" fill="#FFE4D1" opacity="0.8" />
  </Svg>
));
SVGA_FamilyShield.displayName = 'SVGA_FamilyShield';

export const SVGA_BagShirt = React.memo(() => (
  <Svg width="44" height="44" viewBox="0 0 40 40">
    <Defs><SvgLinearGradient id="bsGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#B678FF" /><Stop offset="100%" stopColor="#7E22CE" /></SvgLinearGradient></Defs>
    <Path d="M10 12 L16 8 L24 8 L30 12 L34 22 L28 26 L28 34 C28 35.1 27.1 36 26 36 L14 36 C12.9 36 12 35.1 12 34 L12 26 L6 22 Z" fill="url(#bsGrad)" />
  </Svg>
));
SVGA_BagShirt.displayName = 'SVGA_BagShirt';

export const SVGA_CpHeart = React.memo(() => (
  <Svg width="44" height="44" viewBox="0 0 40 40">
    <Defs><SvgLinearGradient id="cpGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#FF6B9E" /><Stop offset="100%" stopColor="#FF1463" /></SvgLinearGradient></Defs>
    <Path d="M20 34 C20 34 6 24 6 14 C6 8.5 10.5 4 16 4 C18.5 4 20 6 20 6 C20 6 21.5 4 24 4 C29.5 4 34 8.5 34 14 C34 24 20 34 20 34 Z" fill="url(#cpGrad)" />
  </Svg>
));
SVGA_CpHeart.displayName = 'SVGA_CpHeart';

export const SVGA_SellerBag = React.memo(() => (
  <Svg width="44" height="44" viewBox="0 0 40 40">
    <Defs><SvgLinearGradient id="sbGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#FF5F5F" /><Stop offset="100%" stopColor="#B91C1C" /></SvgLinearGradient></Defs>
    <Path d="M20 6 C16 6 14 9 14 12 C14 14 16 15 18 15 L22 15 C24 15 26 14 26 12 C26 9 24 6 20 6 Z" fill="#991B1B" />
    <Path d="M10 16 C10 16 6 20 6 28 C6 34 10 36 20 36 C30 36 34 34 34 28 C34 20 30 16 30 16 L10 16 Z" fill="url(#sbGrad)" />
    <Circle cx="20" cy="27" r="6" fill="white" fillOpacity="0.2" />
  </Svg>
));
SVGA_SellerBag.displayName = 'SVGA_SellerBag';

export const SVGA_Settings = React.memo(() => (
  <Svg width="44" height="44" viewBox="0 0 40 40">
    <Defs><SvgLinearGradient id="stGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#C7D2FE" /><Stop offset="100%" stopColor="#818CF8" /></SvgLinearGradient></Defs>
    <Path d="M20 6 L32.99 13.5 V28.5 L20 36 L7.01 28.5 V13.5 L20 6 Z" fill="url(#stGrad)" />
    <Circle cx="20" cy="21" r="5" fill="white" />
  </Svg>
));
SVGA_Settings.displayName = 'SVGA_Settings';

export const SVGA_HelpCenter = React.memo(() => (
  <Svg width="44" height="44" viewBox="0 0 40 40">
    <Defs><SvgLinearGradient id="hcGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#38BDF8" /><Stop offset="100%" stopColor="#0EA5E9" /></SvgLinearGradient></Defs>
    <Path d="M10 8 H30 C32.2 8 34 9.8 34 12 V26 C34 28.2 32.2 30 30 30 H22 L20 33 L18 30 H10 C7.8 30 6 28.2 6 26 V12 C6 9.8 7.8 8 10 8 Z" fill="url(#hcGrad)" />
    <Rect x="18.5" y="13" width="3" height="9" rx="1.5" fill="white" />
    <Circle cx="20" cy="26" r="2" fill="white" />
  </Svg>
));
SVGA_HelpCenter.displayName = 'SVGA_HelpCenter';

export const SVGA_OfficialUser = React.memo(() => (
  <Svg width="44" height="44" viewBox="0 0 40 40">
    <Defs><SvgLinearGradient id="ouGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#FFB347" /><Stop offset="100%" stopColor="#FF8C00" /></SvgLinearGradient></Defs>
    <Rect x="5" y="5" width="30" height="30" rx="10" fill="url(#ouGrad)" />
    <Circle cx="20" cy="16" r="6" fill="white" />
    <Path d="M10 30 C10 25 14 23 20 23 C26 23 30 25 30 30 V32 H10 V30 Z" fill="white" />
  </Svg>
));
SVGA_OfficialUser.displayName = 'SVGA_OfficialUser';

export const SVGA_AboutInfo = React.memo(() => (
  <Svg width="44" height="44" viewBox="0 0 40 40">
    <Defs><SvgLinearGradient id="aiGrad" x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor="#94a3b8" /><Stop offset="100%" stopColor="#64748b" /></SvgLinearGradient></Defs>
    <Rect x="5" y="5" width="30" height="30" rx="10" fill="url(#aiGrad)" />
    <Circle cx="20" cy="15" r="2" fill="white" />
    <Rect x="18" y="19" width="4" height="10" rx="2" fill="white" />
  </Svg>
));
SVGA_AboutInfo.displayName = 'SVGA_AboutInfo';