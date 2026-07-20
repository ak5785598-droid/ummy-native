import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Linking, Alert } from 'react-native';
import * as Application from 'expo-application';
import { ShieldAlert, Download, CheckCircle, ExternalLink } from 'lucide-react-native';

// Remote configuration update check endpoint URL
// In production, update this endpoint link to point to your backend API or github raw JSON config file.
const UPDATE_CONFIG_URL = 'https://raw.githubusercontent.com/ak5785598-droid/ummy-native/master/update-config.json';

interface UpdateConfig {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  forceUpdate: boolean;
  changelog: string;
}

export const AutoUpdater = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateConfig | null>(null);

  useEffect(() => {
    checkAppUpdate();
  }, []);

  const checkAppUpdate = async () => {
    try {
      const response = await fetch(UPDATE_CONFIG_URL);
      if (!response.ok) return;
      const config: UpdateConfig = await response.json();

      const currentVersionCodeStr = Application.nativeBuildVersion || '1';
      const currentVersionCode = parseInt(currentVersionCodeStr, 10);

      if (config.versionCode > currentVersionCode) {
        setUpdateInfo(config);
        setModalVisible(true);
      }
    } catch (error) {
      console.log('Update check failed:', error);
    }
  };

  const DOWNLOAD_PAGE_URL = 'https://ummy-ota.ak5785598.workers.dev/download';

const openDownload = async () => {
    if (!updateInfo) return;
    try {
      await Linking.openURL(DOWNLOAD_PAGE_URL);
    } catch {
      Alert.alert('Error', 'Unable to open download link. Please visit:\n' + DOWNLOAD_PAGE_URL);
    }
  };

  if (!updateInfo) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => {
        if (!updateInfo.forceUpdate) {
          setModalVisible(false);
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogContainer}>
          <View style={styles.iconContainer}>
            <ShieldAlert size={48} color="#FF6C22" />
          </View>
          
          <Text style={styles.title}>Update Available! (v{updateInfo.versionName})</Text>
          
          <Text style={styles.subtitle}>
            A new version of Ummy Chat is available. Please update to continue using the application with improved performance.
          </Text>

          {updateInfo.changelog ? (
            <View style={styles.changelogBox}>
              <Text style={styles.changelogTitle}>What's New:</Text>
              <Text style={styles.changelogText}>{updateInfo.changelog}</Text>
            </View>
          ) : null}

          <View style={styles.buttonsRow}>
            {!updateInfo.forceUpdate && (
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Later</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionButton, updateInfo.forceUpdate && { width: '100%' }]} 
              onPress={openDownload}
            >
              <ExternalLink size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Download Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogContainer: {
    backgroundColor: '#1E0E14',
    borderWidth: 1,
    borderColor: '#3A1825',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2A141D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0A2A6',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  changelogBox: {
    backgroundColor: '#26121B',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  changelogTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF6C22',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  changelogText: {
    fontSize: 13,
    color: '#E0D8DA',
    lineHeight: 18,
  },
  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#FF6C22',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6C22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#2A141D',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A1825',
  },
  cancelButtonText: {
    color: '#B0A2A6',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
