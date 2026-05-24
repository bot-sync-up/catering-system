import React, { useEffect } from 'react';
import { I18nManager, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import './src/i18n';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initSync } from './src/services/sync';
import { initNotifications } from './src/services/notifications';
import { initGeofencing } from './src/services/geofencing';

// Force RTL for Hebrew
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function App() {
  useEffect(() => {
    initSync();
    initNotifications();
    initGeofencing();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
