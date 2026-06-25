import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ROOT_ROUTES = ['(tabs)', 'index', '(auth)'];

export function GlobalBackHandler() {
  const navigation = useNavigation();
  const lastPressRef = useRef(0);

  useEffect(() => {
    const onBackPress = () => {
      const now = Date.now();
      if (now - lastPressRef.current < 300) return true;
      lastPressRef.current = now;

      const state = navigation.getState();
      if (!state) return false;

      const currentRoute = state.routes[state.index];
      if (ROOT_ROUTES.includes(currentRoute.name)) return false;

      if (state.index > 0 || state.routes.length > 1) {
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
