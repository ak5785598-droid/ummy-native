import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { 
  ShieldCheck, 
  ChevronRight, 
  Crown, 
  ShoppingBag, 
  Target, 
  ClipboardList, 
  CreditCard, 
  Trophy,
  X 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface OfficialCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthorized: boolean;
  userLevel: number;
}

export function OfficialCenterDialog({ open, onOpenChange, isAuthorized, userLevel }: OfficialCenterDialogProps) {
  const router = useRouter();

  if (!isAuthorized) return null;

  // Custom metadata based on userLevel
  const dynamicMeta = (() => {
    if (userLevel >= 6) {
      return {
        title: 'Supreme Authority',
        subtitle: 'Tribal Command & Control Center',
      };
    }
    if (userLevel >= 4) {
      return {
        title: 'Operations Desk',
        subtitle: 'Staff Management & Moderation',
      };
    }
    if (userLevel === 3) {
      return {
        title: 'Audit Control',
        subtitle: 'Financial Oversight & Ledger Reports',
      };
    }
    return {
      title: 'Support Desk',
      subtitle: 'User Operations Support Room',
    };
  })();

  const AdminLink = ({ icon: Icon, label, colorClass, borderClass, onPress }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View className={`p-2 rounded-xl ${colorClass}`}>
          <Icon size={20} color={borderClass || '#fff'} />
        </View>
        <Text className="font-bold text-sm tracking-tight text-white/95">{label}</Text>
      </View>
      <ChevronRight size={16} color="rgba(255, 255, 255, 0.2)" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent={true}
      onRequestClose={() => onOpenChange(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View 
          style={{ 
            backgroundColor: '#0f172a', // slate-900 
            borderTopLeftRadius: 32, 
            borderTopRightRadius: 32, 
            maxHeight: '85%',
            paddingBottom: 24
          }}
        >
          {/* Header */}
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(0,0,0,0)']}
            style={{ 
              borderTopLeftRadius: 32, 
              borderTopRightRadius: 32,
              padding: 24,
              alignItems: 'center',
              position: 'relative'
            }}
          >
            <TouchableOpacity 
              onPress={() => onOpenChange(false)} 
              style={{ 
                position: 'absolute', 
                top: 20, 
                right: 20, 
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: 6,
                borderRadius: 99
              }}
            >
              <X size={18} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>

            <View 
              style={{ 
                width: 64, 
                height: 64, 
                backgroundColor: '#ef4444', 
                borderRadius: 16, 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: 12,
                elevation: 10
              }}
            >
              <ShieldCheck size={32} color="#fff" />
            </View>

            <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2, textTransform: 'uppercase' }}>
              {dynamicMeta.title}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>
              {dynamicMeta.subtitle}
            </Text>
          </LinearGradient>

          {/* Links List */}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            {/* Admin Portal / Operations Hub Desk link */}
            <AdminLink 
              icon={ShieldCheck} 
              label={userLevel >= 6 ? "Admin Portal" : userLevel >= 4 ? "Operations Hub" : userLevel === 3 ? "Audit Panel" : "Support Desk"} 
              colorClass="bg-red-500/20" 
              borderClass="#f87171"
              onPress={() => { onOpenChange(false); router.push('/admin'); }} 
            />

            {/* Broadcast & Banning link: Level >= 6 */}
            {userLevel >= 6 && (
              <AdminLink 
                icon={Crown} 
                label="Broadcast & Banning" 
                colorClass="bg-amber-500/20" 
                borderClass="#fbbf24"
                onPress={() => { onOpenChange(false); router.push('/admin'); }} 
              />
            )}

            {/* Store Management link: Level >= 3 */}
            {userLevel >= 3 && (
              <AdminLink 
                icon={ShoppingBag} 
                label="Store Management" 
                colorClass="bg-purple-500/20" 
                borderClass="#c084fc"
                onPress={() => { onOpenChange(false); router.push('/store'); }} 
              />
            )}

            {/* Game Controls link: Level >= 4 or CS desk */}
            {(userLevel >= 4 || userLevel < 3) && (
              <AdminLink 
                icon={Target} 
                label="Game Controls" 
                colorClass="bg-green-500/20" 
                borderClass="#4ade80"
                onPress={() => { onOpenChange(false); router.push('/games'); }} 
              />
            )}

            {/* Task Management link: Level >= 6 */}
            {userLevel >= 6 && (
              <AdminLink 
                icon={ClipboardList} 
                label="Task Management" 
                colorClass="bg-blue-500/20" 
                borderClass="#60a5fa"
                onPress={() => { onOpenChange(false); router.push('/tasks' as any); }} 
              />
            )}

            {/* Coin Dispatch link: Level >= 3 (Auditor to Creator) */}
            {userLevel >= 3 && (
              <AdminLink 
                icon={CreditCard} 
                label="Coin Dispatch" 
                colorClass="bg-cyan-500/20" 
                borderClass="#22d3ee"
                onPress={() => { onOpenChange(false); router.push('/wallet'); }} 
              />
            )}

            {/* Leaderboard link: Level >= 4 */}
            {userLevel >= 4 && (
              <AdminLink 
                icon={Trophy} 
                label="Leaderboard" 
                colorClass="bg-orange-500/20" 
                borderClass="#fb923c"
                onPress={() => { onOpenChange(false); router.push('/leaderboard'); }} 
              />
            )}
          </ScrollView>

          {/* Active Status Footer */}
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
              <Text style={{ fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>
                Authorization Active
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
