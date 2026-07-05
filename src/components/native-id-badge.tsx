import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

// ==========================================
// 1. Store ID Badges (Bought or Assigned)
// ==========================================

export const PinkDiamondIDBadgeIcon = ({ number }: { number: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, width: 140, position: 'relative' }}>
    <LinearGradient
      colors={['#9D174D', '#DB2777']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: 24,
        paddingLeft: 34,
        paddingRight: 10,
        justifyContent: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 0.5,
        borderColor: '#F472B6',
        marginLeft: 15,
        zIndex: 0,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>{number}</Text>
    </LinearGradient>
    <View style={{ position: 'absolute', left: 0, zIndex: 10, width: 44, height: 44 }}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="roseSilverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="30%" stopColor="#FCE7F3" />
            <Stop offset="50%" stopColor="#F9A8D4" />
            <Stop offset="70%" stopColor="#F472B6" />
            <Stop offset="100%" stopColor="#DB2777" />
          </SvgLinearGradient>
          <SvgLinearGradient id="pinkGemInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F472B6" />
            <Stop offset="50%" stopColor="#EC4899" />
            <Stop offset="100%" stopColor="#9D174D" />
          </SvgLinearGradient>
        </Defs>
        <Polygon points="50,2 96,28 86,78 50,96 14,78 4,28" fill="url(#roseSilverGrad)" stroke="#FFF1F2" strokeWidth="2.5" />
        <Polygon points="50,14 84,34 76,72 50,84 24,72 16,34" fill="url(#pinkGemInnerGrad)" stroke="#FBCFE8" strokeWidth="1" />
        <Path d="M50,14 L84,34 L50,50 Z" fill="rgba(255,255,255,0.3)" />
        <Path d="M16,34 L50,14 L50,50 Z" fill="rgba(255,255,255,0.5)" />
        <SvgText x="50" y="66" fontFamily="Arial" fontWeight="900" fontSize="42" fill="url(#roseSilverGrad)" textAnchor="middle">ID</SvgText>
        <Path d="M15,20 L18,10 L21,20 L31,23 L21,26 L18,36 L15,26 L5,23 Z" fill="#FFFFFF" opacity="0.8" />
        <Path d="M80,75 L82,68 L84,75 L91,77 L84,79 L82,86 L80,79 L73,77 Z" fill="#FFFFFF" opacity="0.6" />
      </Svg>
    </View>
  </View>
);

export const SilverBlueIDBadgeIcon = ({ number }: { number: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, width: 140, position: 'relative' }}>
    <LinearGradient
      colors={['#0C3E8A', '#1D5DC2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: 24,
        paddingLeft: 34,
        paddingRight: 10,
        justifyContent: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 0.5,
        borderColor: '#4A85E6',
        marginLeft: 15,
        zIndex: 0,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>{number}</Text>
    </LinearGradient>
    <View style={{ position: 'absolute', left: 0, zIndex: 10, width: 44, height: 44 }}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="30%" stopColor="#E2E8F0" />
            <Stop offset="50%" stopColor="#94A3B8" />
            <Stop offset="70%" stopColor="#CBD5E1" />
            <Stop offset="100%" stopColor="#64748B" />
          </SvgLinearGradient>
          <SvgLinearGradient id="gemInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#60A5FA" />
            <Stop offset="50%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#1E3A8A" />
          </SvgLinearGradient>
        </Defs>
        <Polygon points="50,2 96,28 86,78 50,96 14,78 4,28" fill="url(#silverGrad)" stroke="#F8FAFC" strokeWidth="2.5" />
        <Polygon points="50,14 84,34 76,72 50,84 24,72 16,34" fill="url(#gemInnerGrad)" stroke="#93C5FD" strokeWidth="1" />
        <Path d="M50,14 L84,34 L50,50 Z" fill="rgba(255,255,255,0.3)" />
        <Path d="M16,34 L50,14 L50,50 Z" fill="rgba(255,255,255,0.5)" />
        <SvgText x="50" y="66" fontFamily="Arial" fontWeight="900" fontSize="42" fill="url(#silverGrad)" textAnchor="middle">ID</SvgText>
        <Path d="M15,20 L18,10 L21,20 L31,23 L21,26 L18,36 L15,26 L5,23 Z" fill="#FFFFFF" opacity="0.8" />
      </Svg>
    </View>
  </View>
);

export const IDBadgeIcon = ({ number }: { number: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, width: 140, position: 'relative' }}>
    <LinearGradient
      colors={['#D91B10', '#F13A24']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: 24,
        paddingLeft: 34,
        paddingRight: 10,
        justifyContent: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 0.5,
        borderColor: '#FF6B55',
        marginLeft: 15,
        zIndex: 0,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }}>{number}</Text>
    </LinearGradient>
    <View style={{ position: 'absolute', left: 0, zIndex: 10, width: 44, height: 44 }}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFF1AA" />
            <Stop offset="25%" stopColor="#FFD335" />
            <Stop offset="50%" stopColor="#C98B13" />
            <Stop offset="75%" stopColor="#FFD335" />
            <Stop offset="100%" stopColor="#9E6100" />
          </SvgLinearGradient>
        </Defs>
        <Polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="url(#goldGrad)" stroke="#FFE373" strokeWidth="3" />
        <Polygon points="50,12 82,30 82,70 50,88 18,70 18,30" fill="#750600" />
        <SvgText x="50" y="58" fontFamily="Arial" fontWeight="900" fontSize="42" fill="url(#goldGrad)" textAnchor="middle">ID</SvgText>
        <SvgText x="50" y="80" fontFamily="Arial" fontWeight="900" fontSize="18" fill="url(#goldGrad)" textAnchor="middle">SSS</SvgText>
      </Svg>
    </View>
  </View>
);

// ==========================================
// 2. Sovereign Special Budget ID Badges (Admin Only)
// ==========================================

export const GoldSovereignBadgeIcon = ({ number }: { number: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, width: 140, position: 'relative' }}>
    <LinearGradient
      colors={['#854D0E', '#CA8A04']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: 24,
        paddingLeft: 34,
        paddingRight: 10,
        justifyContent: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 0.5,
        borderColor: '#FEF08A',
        marginLeft: 15,
        zIndex: 0,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.2 }}>{number}</Text>
    </LinearGradient>
    <View style={{ position: 'absolute', left: 0, zIndex: 10, width: 44, height: 44 }}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="sovGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FEF9C3" />
            <Stop offset="50%" stopColor="#CA8A04" />
            <Stop offset="100%" stopColor="#854D0E" />
          </SvgLinearGradient>
        </Defs>
        <Polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="url(#sovGoldGrad)" stroke="#FEF9C3" strokeWidth="2.5" />
        <Polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="#581C87" />
        <SvgText x="50" y="62" fontFamily="Arial" fontWeight="900" fontSize="38" fill="url(#sovGoldGrad)" textAnchor="middle">SOV</SvgText>
      </Svg>
    </View>
  </View>
);

export const RoseSovereignBadgeIcon = ({ number }: { number: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, width: 140, position: 'relative' }}>
    <LinearGradient
      colors={['#9F1239', '#E11D48']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: 24,
        paddingLeft: 34,
        paddingRight: 10,
        justifyContent: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 0.5,
        borderColor: '#FDA4AF',
        marginLeft: 15,
        zIndex: 0,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.2 }}>{number}</Text>
    </LinearGradient>
    <View style={{ position: 'absolute', left: 0, zIndex: 10, width: 44, height: 44 }}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="sovRoseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFF1F2" />
            <Stop offset="50%" stopColor="#E11D48" />
            <Stop offset="100%" stopColor="#9F1239" />
          </SvgLinearGradient>
        </Defs>
        <Polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="url(#sovRoseGrad)" stroke="#FFE4E6" strokeWidth="2.5" />
        <Polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="#4C0519" />
        <SvgText x="50" y="62" fontFamily="Arial" fontWeight="900" fontSize="38" fill="url(#sovRoseGrad)" textAnchor="middle">SOV</SvgText>
      </Svg>
    </View>
  </View>
);

export const DiamondSovereignBadgeIcon = ({ number }: { number: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, width: 140, position: 'relative' }}>
    <LinearGradient
      colors={['#0891B2', '#06B6D4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: 24,
        paddingLeft: 34,
        paddingRight: 10,
        justifyContent: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 0.5,
        borderColor: '#CFFAFE',
        marginLeft: 15,
        zIndex: 0,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.2 }}>{number}</Text>
    </LinearGradient>
    <View style={{ position: 'absolute', left: 0, zIndex: 10, width: 44, height: 44 }}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="sovCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ECFEFF" />
            <Stop offset="50%" stopColor="#06B6D4" />
            <Stop offset="100%" stopColor="#0891B2" />
          </SvgLinearGradient>
        </Defs>
        <Polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="url(#sovCyanGrad)" stroke="#CFFAFE" strokeWidth="2.5" />
        <Polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="#083344" />
        <SvgText x="50" y="62" fontFamily="Arial" fontWeight="900" fontSize="38" fill="url(#sovCyanGrad)" textAnchor="middle">SOV</SvgText>
      </Svg>
    </View>
  </View>
);

export const PurpleSovereignBadgeIcon = ({ number }: { number: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, width: 140, position: 'relative' }}>
    <LinearGradient
      colors={['#6B21A8', '#A855F7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: 24,
        paddingLeft: 34,
        paddingRight: 10,
        justifyContent: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 0.5,
        borderColor: '#F3E8FF',
        marginLeft: 15,
        zIndex: 0,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.2 }}>{number}</Text>
    </LinearGradient>
    <View style={{ position: 'absolute', left: 0, zIndex: 10, width: 44, height: 44 }}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="sovPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FAF5FF" />
            <Stop offset="50%" stopColor="#A855F7" />
            <Stop offset="100%" stopColor="#6B21A8" />
          </SvgLinearGradient>
        </Defs>
        <Polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="url(#sovPurpleGrad)" stroke="#F3E8FF" strokeWidth="2.5" />
        <Polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="#2E1065" />
        <SvgText x="50" y="62" fontFamily="Arial" fontWeight="900" fontSize="38" fill="url(#sovPurpleGrad)" textAnchor="middle">SOV</SvgText>
      </Svg>
    </View>
  </View>
);

export const EmeraldSovereignBadgeIcon = ({ number }: { number: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, width: 140, position: 'relative' }}>
    <LinearGradient
      colors={['#065F46', '#10B981']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        height: 24,
        paddingLeft: 34,
        paddingRight: 10,
        justifyContent: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 0.5,
        borderColor: '#D1FAE5',
        marginLeft: 15,
        zIndex: 0,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.2 }}>{number}</Text>
    </LinearGradient>
    <View style={{ position: 'absolute', left: 0, zIndex: 10, width: 44, height: 44 }}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%">
        <Defs>
          <SvgLinearGradient id="sovGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#ECFDF5" />
            <Stop offset="50%" stopColor="#10B981" />
            <Stop offset="100%" stopColor="#065F46" />
          </SvgLinearGradient>
        </Defs>
        <Polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="url(#sovGreenGrad)" stroke="#D1FAE5" strokeWidth="2.5" />
        <Polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="#064E3B" />
        <SvgText x="50" y="62" fontFamily="Arial" fontWeight="900" fontSize="38" fill="url(#sovGreenGrad)" textAnchor="middle">SOV</SvgText>
      </Svg>
    </View>
  </View>
);

// ==========================================
// 3. Main Switch Controller
// ==========================================

export const ActiveIDBadge = ({ badgeData, fallbackNumber }: { badgeData: any, fallbackNumber: string }) => {
  if (!badgeData) return null;
  const num = badgeData.displayId || fallbackNumber;
  if (badgeData.isPinkDiamond) return <PinkDiamondIDBadgeIcon number={num} />;
  if (badgeData.isSilver) return <SilverBlueIDBadgeIcon number={num} />;
  return <IDBadgeIcon number={num} />;
};

export const SovereignIDBadge = ({ color, number }: { color: string, number: string }) => {
  if (color === 'gold') return <GoldSovereignBadgeIcon number={number} />;
  if (color === 'rose') return <RoseSovereignBadgeIcon number={number} />;
  if (color === 'diamond') return <DiamondSovereignBadgeIcon number={number} />;
  if (color === 'purple') return <PurpleSovereignBadgeIcon number={number} />;
  if (color === 'emerald') return <EmeraldSovereignBadgeIcon number={number} />;
  return <GoldSovereignBadgeIcon number={number} />;
};
