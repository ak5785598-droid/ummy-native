import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  LayoutAnimation, 
  Platform, 
  UIManager 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Mail, 
  ShieldCheck, 
  Zap, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const FAQS = [
  {
    question: 'How do I create an account?',
    answer: 'You can create an account using your phone number or Google account directly from the login screen.',
  },
  {
    question: 'How do I buy coins?',
    answer: "You can buy coins by navigating to Boutique > Gold Coins. There you'll find various coin packages available for purchase.",
  },
  {
    question: 'What are coins used for?',
    answer: 'Coins are used to send virtual gifts to other users in chat rooms and to equip premium assets in the Boutique.',
  },
  {
    question: 'How can I edit my profile?',
    answer: 'You can edit your profile information, including your name, bio, and avatar, by going to Me > Modify Persona.',
  },
  {
    question: 'How do I launch a frequency?',
    answer: 'On the main Home screen, select "Create Room" to define your frequency and gather your tribe.',
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@ummylive.com').catch(() => {
      alert('Could not launch mail client. Please contact support@ummylive.com manually.');
    });
  };

  return (
    <View className="flex-1 bg-[#f1f8e9]">
      {/* Top Ambient Highlight */}
      <View className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#e8f5e9] to-transparent opacity-80" />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1.5 bg-white/60 rounded-full border border-white/80">
            <ArrowLeft size={22} color="#1b4332" />
          </TouchableOpacity>
          <Text className="text-lg font-black tracking-tight text-[#1b4332] uppercase">Support</Text>
        </View>

        <ScrollView className="flex-1 px-4 pb-12" showsVerticalScrollIndicator={false}>
          {/* Support Protocol Badge */}
          <View className="flex-row mt-4 mb-2">
            <View className="flex-row items-center gap-1.5 bg-white/60 px-3 py-1 rounded-full border border-white/80 shadow-sm">
              <Zap size={11} color="#eab308" fill="#eab308" />
              <Text className="text-[9px] font-black uppercase tracking-widest text-[#1b4332]">Support Protocol</Text>
            </View>
          </View>

          {/* Title Header */}
          <View className="mb-6 space-y-1.5">
            <Text className="text-3xl font-black text-[#1b4332] uppercase leading-none">Official Help Center</Text>
            <Text className="text-slate-600 text-sm font-medium">Find answers to your questions and get the support you need.</Text>
          </View>

          {/* Support Card */}
          <View className="bg-white rounded-3xl border border-green-100 p-5 shadow-sm mb-6">
            <Text className="text-base font-black text-[#1b4332] uppercase tracking-wide mb-3">Need Live Support?</Text>
            <Text className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
              Contact our official support team via email or look for members with the{' '}
              <Text className="text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100 uppercase text-[10px]">
                "Official"
              </Text>{' '}
              badge in any frequency.
            </Text>

            <View className="flex-row items-center justify-between bg-green-50/40 border border-green-100/60 rounded-2xl p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 bg-green-600 rounded-xl items-center justify-center shadow-lg shadow-green-900/10">
                  <Mail size={22} color="#fff" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-[#1b4332]">Ummy Support</Text>
                  <Text className="text-[8px] text-green-700 font-bold uppercase tracking-wider mt-0.5">Response in 24 hrs</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={handleEmailSupport}
                className="bg-green-600 px-4 py-2.5 rounded-full shadow-md"
              >
                <Text className="text-white text-xs font-black uppercase tracking-wider">Email Us</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAQs List */}
          <View className="space-y-4 mb-20">
            <View className="flex-row items-center gap-2 mb-2 ml-1">
              <View className="p-1.5 bg-green-100 rounded-lg">
                <ShieldCheck size={16} color="#16a34a" />
              </View>
              <Text className="text-xs font-black uppercase tracking-wider text-[#1b4332]">FAQ Dimension</Text>
            </View>

            <View className="bg-white rounded-3xl border border-green-50 overflow-hidden shadow-inner">
              {FAQS.map((faq, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <View key={index} className="border-b border-green-50/40 last:border-b-0">
                    <TouchableOpacity 
                      onPress={() => toggleAccordion(index)}
                      className="flex-row items-center justify-between py-4.5 px-5"
                    >
                      <Text className="flex-1 text-[#1b4332] text-xs font-bold uppercase tracking-wide pr-4">{faq.question}</Text>
                      {isExpanded ? (
                        <ChevronUp size={16} color="#8b9e8d" />
                      ) : (
                        <ChevronDown size={16} color="#8b9e8d" />
                      )}
                    </TouchableOpacity>
                    {isExpanded && (
                      <View className="px-5 pb-5 pt-1">
                        <Text className="text-slate-500 text-[11px] font-medium leading-relaxed">{faq.answer}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
