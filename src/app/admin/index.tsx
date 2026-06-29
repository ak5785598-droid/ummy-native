import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, 
  TextInput, FlatList, Alert, Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Shield, Wallet, ClipboardList, Database, 
  Palette, Pin, Zap, Users, Trophy, UserSearch, ShieldCheck, 
  Gavel, ImageIcon, Gamepad2, Megaphone, MessageSquareText, 
  BadgeCheck, Gift, ShieldAlert, Monitor, ShoppingBag, 
  Clock, Crown, RefreshCcw, Award, Smile, Heart, Sparkles 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../firebase/provider';
import firestore from '@react-native-firebase/firestore';

// Sub-components for Admin Panels
import { FinancialAuditTab } from '../../components/admin/FinancialAuditTab';
import { ModerationReportsTab } from '../../components/admin/ModerationReportsTab';
import { RechargeRequestsTab } from '../../components/admin/RechargeRequestsTab';
import { AuthorityHubTab } from '../../components/admin/AuthorityHubTab';
import { LootManagementTab } from '../../components/admin/LootManagementTab';
import { BroadcasterTab } from '../../components/admin/BroadcasterTab';
import { RewardsTab } from '../../components/admin/RewardsTab';
import { DirectMessengerTab } from '../../components/admin/DirectMessengerTab';
import { IdBanTab } from '../../components/admin/IdBanTab';
import { BannersTab } from '../../components/admin/BannersTab';
import { SovereignIdsTab } from '../../components/admin/SovereignIdsTab';
import { LevelManagementTab } from '../../components/admin/LevelManagementTab';
import { MedalManagementTab } from '../../components/admin/MedalManagementTab';
import { EmojiManagementTab } from '../../components/admin/EmojiManagementTab';
import { SystemControlTab } from '../../components/admin/SystemControlTab';
import { FinancialSettingsTab } from '../../components/admin/FinancialSettingsTab';
import { AppLedgerTab } from '../../components/admin/AppLedgerTab';
import { GameSyncTab } from '../../components/admin/GameSyncTab';
import { SeatTimingTab } from '../../components/admin/SeatTimingTab';
import { LoadingScreenSyncTab } from '../../components/admin/LoadingScreenSyncTab';
import { GameLoadingSyncTab } from '../../components/admin/GameLoadingSyncTab';
import { VisualIdentityTab } from '../../components/admin/VisualIdentityTab';
import { VipManagementTab } from '../../components/admin/VipManagementTab';
import { CpManagementTab } from '../../components/admin/CpManagementTab';
import { FamilyManagementTab } from '../../components/admin/FamilyManagementTab';
import { PinControlTab } from '../../components/admin/PinControlTab';
import { MemberDirectoryTab } from '../../components/admin/MemberDirectoryTab';
import { UserRecordsTab } from '../../components/admin/UserRecordsTab';
import { AssignCenterTab } from '../../components/admin/AssignCenterTab';
import { TagsTab } from '../../components/admin/TagsTab';
import { SplashScreenTab } from '../../components/admin/SplashScreenTab';
import { RankingThemesTab } from '../../components/admin/RankingThemesTab';
import { BoutiqueHubTab } from '../../components/admin/BoutiqueHubTab';
import { GiftManagementTab } from '../../components/admin/GiftManagementTab';
import { CustomGiftsTab } from '../../components/admin/CustomGiftsTab';

type AdminTab = 
  | 'recharge-requests' 
  | 'financial-audit' 
  | 'authority' 
  | 'moderation-reports' 
  | 'loot'
  | 'broadcaster'
  | 'rewards'
  | 'dm'
  | 'id-ban'
  | 'banners'
  | 'sovereign-ids'
  | 'level-management'
  | 'medal-management'
  | 'emoji-management'
  | 'system-control'
  | 'financial-settings'
  | 'app-ledger'
  | 'game-sync'
  | 'seat-timing'
  | 'loading-screen'
  | 'game-loading'
  | 'visual-identity'
  | 'vip-management'
  | 'cp-management'
  | 'family-management'
  | 'pin-control'
  | 'member-directory'
  | 'user-records'
  | 'assign-center'
  | 'tags'
  | 'splash-screen'
  | 'ranking-themes'
  | 'boutique-hub'
  | 'gift-management'
  | 'custom-gifts'
  | 'menu';

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('menu');

  useEffect(() => {
    if (!user?.uid) {
      setIsAdmin(false);
      return;
    }

    const unsub = firestore()
      .doc(`users/${user.uid}`)
      .onSnapshot(snap => {
        if (snap.exists()) {
          const d = snap.data();
          const authorized = user.uid === '901piBzTQ0VzCtAvlyyobwvAaTs1' || d?.isAdmin === true;
          setIsAdmin(authorized);
        } else {
          setIsAdmin(false);
        }
      }, () => {
        setIsAdmin(false);
      });

    return () => unsub();
  }, [user]);

  if (isAdmin === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{ marginTop: 12, fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
          Verifying supreme credentials...
        </Text>
      </View>
    );
  }

  if (isAdmin === false) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Shield size={48} color="#ef4444" />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>
          ACCESS DENIED
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 }}>
          This sector requires Supreme Command clearance levels.
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Return to Safety</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBack = () => {
    if (activeTab !== 'menu') {
      setActiveTab('menu');
    } else {
      router.back();
    }
  };

  const AdminMenuItem = ({ icon: Icon, label, onPress, color = '#7c3aed' }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${color}15`, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Icon size={20} color={color} />
      </View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#1e293b' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={handleBack} style={{ padding: 8, marginLeft: 8 }}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', marginLeft: 12, textTransform: 'uppercase' }}>
          {activeTab === 'menu' ? 'Supreme Control' : activeTab.replace('-', ' ')}
        </Text>
      </View>

      {activeTab === 'menu' ? (
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
            Core Operations
          </Text>
          <AdminMenuItem icon={Wallet} label="Recharge Requests" color="#22c55e" onPress={() => setActiveTab('recharge-requests')} />
          <AdminMenuItem icon={ClipboardList} label="Financial Audit 💰" color="#3b82f6" onPress={() => setActiveTab('financial-audit')} />
          <AdminMenuItem icon={Zap} label="Authority Hub ⚡" color="#a855f7" onPress={() => setActiveTab('authority')} />
          <AdminMenuItem icon={ShieldAlert} label="Moderation Reports 🚨" color="#ef4444" onPress={() => setActiveTab('moderation-reports')} />
          <AdminMenuItem icon={Megaphone} label="Broadcaster System 📢" color="#3b82f6" onPress={() => setActiveTab('broadcaster')} />
          <AdminMenuItem icon={Gift} label="Loot Config 🎁" color="#a855f7" onPress={() => setActiveTab('loot')} />
          <AdminMenuItem icon={Gift} label="Rewards Center 🎁" color="#22c55e" onPress={() => setActiveTab('rewards')} />
          <AdminMenuItem icon={MessageSquareText} label="Direct Messenger 💬" color="#3b82f6" onPress={() => setActiveTab('dm')} />
          <AdminMenuItem icon={Gavel} label="ID Ban Control 🔨" color="#ef4444" onPress={() => setActiveTab('id-ban')} />
          <AdminMenuItem icon={ImageIcon} label="Banners Management 🖼️" color="#3b82f6" onPress={() => setActiveTab('banners')} />
          <AdminMenuItem icon={Crown} label="Sovereign ID Control 👑" color="#8b5cf6" onPress={() => setActiveTab('sovereign-ids')} />
          <AdminMenuItem icon={Trophy} label="Level Management 🏆" color="#06b6d4" onPress={() => setActiveTab('level-management')} />
          <AdminMenuItem icon={Award} label="Medal Management 🎖️" color="#fb923c" onPress={() => setActiveTab('medal-management')} />
          <AdminMenuItem icon={Smile} label="Emoji Management 😃" color="#10b981" onPress={() => setActiveTab('emoji-management')} />
          <AdminMenuItem icon={RefreshCcw} label="System Control ⚙️" color="#64748b" onPress={() => setActiveTab('system-control')} />
          <AdminMenuItem icon={Wallet} label="Financial Settings 💳" color="#22c55e" onPress={() => setActiveTab('financial-settings')} />
          <AdminMenuItem icon={Database} label="App Ledger 📊" color="#3b82f6" onPress={() => setActiveTab('app-ledger')} />
          <AdminMenuItem icon={Gamepad2} label="Game Sync 🎮" color="#a855f7" onPress={() => setActiveTab('game-sync')} />
          <AdminMenuItem icon={Clock} label="Seat Timing Tracker ⏱️" color="#0ea5e9" onPress={() => setActiveTab('seat-timing')} />
          <AdminMenuItem icon={ImageIcon} label="Loading Screen Sync 🖼️" color="#4f46e5" onPress={() => setActiveTab('loading-screen')} />
          <AdminMenuItem icon={Gamepad2} label="Game Loading Sync 🎮" color="#a855f7" onPress={() => setActiveTab('game-loading')} />
          <AdminMenuItem icon={Palette} label="Visual Identity 🎨" color="#ec4899" onPress={() => setActiveTab('visual-identity')} />
          <AdminMenuItem icon={Crown} label="VIP Management 👑" color="#eab308" onPress={() => setActiveTab('vip-management')} />
          <AdminMenuItem icon={Heart} label="CP Backgrounds 💖" color="#db2777" onPress={() => setActiveTab('cp-management')} />
          <AdminMenuItem icon={Users} label="Family Management 🏡" color="#10b981" onPress={() => setActiveTab('family-management')} />
          <AdminMenuItem icon={Pin} label="Pin Control 📌" color="#10b981" onPress={() => setActiveTab('pin-control')} />
          <AdminMenuItem icon={Users} label="Member Directory 👥" color="#0ea5e9" onPress={() => setActiveTab('member-directory')} />
          <AdminMenuItem icon={UserSearch} label="User Ledger 🔍" color="#f43f5e" onPress={() => setActiveTab('user-records')} />
          <AdminMenuItem icon={ShieldCheck} label="Center Management 🛡️" color="#6366f1" onPress={() => setActiveTab('assign-center')} />
          <AdminMenuItem icon={BadgeCheck} label="Assign Tags 🏷️" color="#7c3aed" onPress={() => setActiveTab('tags')} />
          <AdminMenuItem icon={Monitor} label="Splash Screen & Logo 🖥️" color="#14b8a6" onPress={() => setActiveTab('splash-screen')} />
          <AdminMenuItem icon={Trophy} label="Ranking Themes 🏆" color="#6366f1" onPress={() => setActiveTab('ranking-themes')} />
          <AdminMenuItem icon={ShoppingBag} label="Boutique Sync 👜" color="#7c3aed" onPress={() => setActiveTab('boutique-hub')} />
          <AdminMenuItem icon={Gift} label="Gift Management 🎁" color="#f97316" onPress={() => setActiveTab('gift-management')} />
          <AdminMenuItem icon={Sparkles} label="Customized Gifts ✨" color="#db2777" onPress={() => setActiveTab('custom-gifts')} />

          <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 16 }}>
            Quick Redirections
          </Text>
          <AdminMenuItem icon={ShoppingBag} label="Store Management" color="#ec4899" onPress={() => router.push('/store')} />
          <AdminMenuItem icon={Gamepad2} label="Game Controls" color="#10b981" onPress={() => router.push('/games')} />
          <AdminMenuItem icon={Trophy} label="Leaderboard Center" color="#f59e0b" onPress={() => router.push('/leaderboard')} />
          <AdminMenuItem icon={Wallet} label="Coin Dispatch & Ledger" color="#06b6d4" onPress={() => router.push('/wallet')} />
        </ScrollView>
      ) : activeTab === 'recharge-requests' ? (
        <RechargeRequestsTab />
      ) : activeTab === 'financial-audit' ? (
        <FinancialAuditTab />
      ) : activeTab === 'authority' ? (
        <AuthorityHubTab />
      ) : activeTab === 'loot' ? (
        <LootManagementTab />
      ) : activeTab === 'broadcaster' ? (
        <BroadcasterTab />
      ) : activeTab === 'rewards' ? (
        <RewardsTab />
      ) : activeTab === 'dm' ? (
        <DirectMessengerTab />
      ) : activeTab === 'id-ban' ? (
        <IdBanTab />
      ) : activeTab === 'banners' ? (
        <BannersTab />
      ) : activeTab === 'sovereign-ids' ? (
        <SovereignIdsTab />
      ) : activeTab === 'level-management' ? (
        <LevelManagementTab />
      ) : activeTab === 'medal-management' ? (
        <MedalManagementTab />
      ) : activeTab === 'emoji-management' ? (
        <EmojiManagementTab />
      ) : activeTab === 'system-control' ? (
        <SystemControlTab />
      ) : activeTab === 'financial-settings' ? (
        <FinancialSettingsTab />
      ) : activeTab === 'app-ledger' ? (
        <AppLedgerTab />
      ) : activeTab === 'game-sync' ? (
        <GameSyncTab />
      ) : activeTab === 'seat-timing' ? (
        <SeatTimingTab />
      ) : activeTab === 'loading-screen' ? (
        <LoadingScreenSyncTab />
      ) : activeTab === 'game-loading' ? (
        <GameLoadingSyncTab />
      ) : activeTab === 'visual-identity' ? (
        <VisualIdentityTab />
      ) : activeTab === 'vip-management' ? (
        <VipManagementTab />
      ) : activeTab === 'cp-management' ? (
        <CpManagementTab />
      ) : activeTab === 'family-management' ? (
        <FamilyManagementTab />
      ) : activeTab === 'pin-control' ? (
        <PinControlTab />
      ) : activeTab === 'member-directory' ? (
        <MemberDirectoryTab />
      ) : activeTab === 'user-records' ? (
        <UserRecordsTab />
      ) : activeTab === 'assign-center' ? (
        <AssignCenterTab />
      ) : activeTab === 'tags' ? (
        <TagsTab />
      ) : activeTab === 'splash-screen' ? (
        <SplashScreenTab />
      ) : activeTab === 'ranking-themes' ? (
        <RankingThemesTab />
      ) : activeTab === 'boutique-hub' ? (
        <BoutiqueHubTab />
      ) : activeTab === 'gift-management' ? (
        <GiftManagementTab />
      ) : activeTab === 'custom-gifts' ? (
        <CustomGiftsTab />
      ) : (
        <ModerationReportsTab />
      )}
    </SafeAreaView>
  );
}
