import React, { useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, Linking } from 'react-native';
import { X, MonitorSmartphone, Share2, StopCircle, Cast, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAgoraNative } from '../../hooks/use-agora-native';

interface ScreenMirrorDialogProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  userId: string;
  isHost: boolean;
  agoraHook: ReturnType<typeof useAgoraNative>;
}

export function ScreenMirrorDialog({ visible, onClose, roomId, userId, isHost, agoraHook }: ScreenMirrorDialogProps) {
  const insets = useSafeAreaInsets();
  const { isScreenSharing, startScreenShare, stopScreenShare, remoteUsers } = agoraHook;

  const handleToggle = useCallback(async () => {
    if (isScreenSharing) {
      Alert.alert('Stop Screen Share', 'Stop sharing your screen with the room?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopScreenShare();
            } catch (e) {
              Alert.alert('Error', 'Failed to stop screen share.');
            }
          },
        },
      ]);
    } else {
      Alert.alert(
        'Start Screen Share',
        'Your entire screen will be visible to everyone in the room.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Sharing',
            onPress: async () => {
              try {
                await startScreenShare();
              } catch (e: any) {
                Alert.alert('Screen Share Failed', e?.message || 'Could not start screen sharing. Make sure you grant permission.');
              }
            },
          },
        ]
      );
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const viewerCount = remoteUsers?.length || 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View style={{
          backgroundColor: '#0c0c14',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: insets.bottom + 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.07)',
        }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99 }} />
          </View>

          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.07)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isScreenSharing ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isScreenSharing ? 'rgba(34,197,94,0.4)' : 'rgba(59,130,246,0.3)',
              }}>
                <Cast size={18} color={isScreenSharing ? '#22c55e' : '#3b82f6'} />
              </View>
              <View>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: -0.3 }}>Screen Mirror</Text>
                <Text style={{ color: isScreenSharing ? '#22c55e' : 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600', marginTop: 1 }}>
                  {isScreenSharing ? '● LIVE — Sharing your screen' : 'Share your screen with the room'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center', gap: 16 }}>
            {/* Status Icon */}
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isScreenSharing ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: isScreenSharing ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.2)',
            }}>
              <MonitorSmartphone size={36} color={isScreenSharing ? '#22c55e' : 'rgba(59,130,246,0.7)'} />
            </View>

            {/* Viewer count */}
            {isScreenSharing && viewerCount > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
                <Users size={12} color="#22c55e" />
                <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '700' }}>
                  {viewerCount} viewer{viewerCount !== 1 ? 's' : ''} watching
                </Text>
              </View>
            )}

            {/* Info Text */}
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>
              {isScreenSharing
                ? 'Your screen is being broadcast to everyone in the room via Agora RTC.'
                : isHost
                ? 'Start sharing your screen. All room members will see it in real-time via Agora RTC.'
                : 'Only the room host can start screen sharing.'}
            </Text>

            {/* Feature bullets (non-sharing state) */}
            {!isScreenSharing && isHost && (
              <View style={{ gap: 8, width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
                {[
                  '🎥 Real-time HD screen broadcast',
                  '👥 All room members can watch',
                  '🔒 Stop anytime from this dialog',
                  '🎙️ Audio is shared via Agora RTC',
                ].map((f, i) => (
                  <Text key={i} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{f}</Text>
                ))}
              </View>
            )}

            {/* Action Button */}
            {isHost ? (
              <TouchableOpacity
                onPress={handleToggle}
                style={{
                  paddingHorizontal: 32,
                  paddingVertical: 14,
                  borderRadius: 28,
                  backgroundColor: isScreenSharing ? '#dc2626' : '#2563eb',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                  shadowColor: isScreenSharing ? '#dc2626' : '#2563eb',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                {isScreenSharing ? (
                  <>
                    <StopCircle size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Stop Screen Share</Text>
                  </>
                ) : (
                  <>
                    <Share2 size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Start Screen Share</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
                  Waiting for host to start screen sharing...
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
