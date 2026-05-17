import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { I18nManager } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import FuelScreen from './src/screens/FuelScreen';
import MileageScreen from './src/screens/MileageScreen';
import AlertsScreen from './src/screens/AlertsScreen';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: '#2563eb', background: '#f4f6fb' },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('token').then((t) => {
      setAuthed(!!t);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#fff',
        }}
        initialRouteName={authed ? 'Home' : 'Login'}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'התחברות' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'צי רכבים — נהג' }} />
        <Stack.Screen name="Fuel" component={FuelScreen} options={{ title: 'דיווח דלק' }} />
        <Stack.Screen name="Mileage" component={MileageScreen} options={{ title: 'דיווח נסועה' }} />
        <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'התראות' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
