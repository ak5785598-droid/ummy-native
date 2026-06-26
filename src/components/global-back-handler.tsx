import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export function GlobalBackHandler() {
  const navigation = useNavigation();
  const lastPressRef = useRef(0);

  useEffect(() => {
    const onBackPress = () => {
      const now = Date.now();
      // Double tap prevention
      if (now - lastPressRef.current < 300) return true;
      lastPressRef.current = now;

      // If navigation can go back to any previous screen in the stack, do so.
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [navigation]);

  return null;
}
