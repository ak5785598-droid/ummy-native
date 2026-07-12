import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { ChevronLeft, Info, ShieldAlert, Award, FileText, ExternalLink } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Ummy Chat</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo / Brand Card */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>U</Text>
          </View>
          <Text style={styles.appName}>Ummy Chat</Text>
          <Text style={styles.appVersion}>Version 1.0.2 (Build 2026)</Text>
          <Text style={styles.appDescription}>
            The ultimate premium social voice chat rooms and friendship lounge app.
          </Text>
        </View>

        {/* Info list */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <FileText size={18} color="#a855f7" />
              <Text style={styles.menuItemText}>Terms of Service</Text>
            </View>
            <ExternalLink size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <ShieldAlert size={18} color="#a855f7" />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </View>
            <ExternalLink size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Award size={18} color="#a855f7" />
              <Text style={styles.menuItemText}>Licenses & Attribution</Text>
            </View>
            <ExternalLink size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.copyrightText}>
          &copy; 2026 Ummy Dev Team. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0314',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    marginBottom: 16,
  },
  logoText: {
    color: 'white',
    fontSize: 48,
    fontWeight: '950',
  },
  appName: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
  },
  appVersion: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  appDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  sectionCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  copyrightText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 50,
    textAlign: 'center',
  },
});
