import { useState, useEffect } from 'react';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

interface AudioDeviceState {
  hasWired: boolean;
  hasBluetooth: boolean;
  isSpeaker: boolean;
}

export function useAudioDevices(): AudioDeviceState {
  const [state, setState] = useState<AudioDeviceState>({ hasWired: false, hasBluetooth: false, isSpeaker: true });

  useEffect(() => {
    if (Platform.OS === 'ios') {
      const { AudioSession } = NativeModules;
      if (!AudioSession) return;

      const checkRoute = async () => {
        try {
          const route = await AudioSession.getCurrentRoute();
          const hasHeadphones = route === 'Headphones' || route === 'BluetoothHeadphones' || route === 'BluetoothA2DP' || route === 'BluetoothHFP';
          setState({
            hasWired: route === 'Headphones',
            hasBluetooth: route === 'BluetoothHeadphones' || route === 'BluetoothA2DP' || route === 'BluetoothHFP',
            isSpeaker: route === 'Speaker' || route === 'Receiver',
          });
        } catch {}
      };

      checkRoute();
      const emitter = new NativeEventEmitter(AudioSession);
      const sub = emitter.addListener('AudioRouteChanged', checkRoute);
      return () => sub.remove();
    } else {
      const { AudioManager } = NativeModules;
      if (!AudioManager) return;

      const checkDevices = () => {
        try {
          const hasWired = AudioManager.isWiredHeadsetConnected?.() ?? false;
          const hasBt = AudioManager.isBluetoothHeadsetConnected?.() ?? false;
          const isSpeaker = AudioManager.isSpeakerphoneOn?.() ?? true;
          setState({ hasWired, hasBluetooth: hasBt, isSpeaker });
        } catch {}
      };

      checkDevices();
      const interval = setInterval(checkDevices, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  return state;
}
