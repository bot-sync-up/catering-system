import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { ManagerTabs } from './role/ManagerTabs';
import { AgentTabs } from './role/AgentTabs';
import { KitchenTabs } from './role/KitchenTabs';
import { ShiftTabs } from './role/ShiftTabs';
import { DriverTabs } from './role/DriverTabs';
import { CustomerTabs } from './role/CustomerTabs';
import { useAppStore } from '../store/app';
import { restoreSession } from '../services/auth';
import type { Role } from '../types';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const user = useAppStore((s) => s.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restoreSession().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  const RoleStack = user ? roleNavigatorFor(user.role) : null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        </>
      ) : (
        <Stack.Screen name="App" component={RoleStack!} />
      )}
    </Stack.Navigator>
  );
}

function roleNavigatorFor(role: Role) {
  switch (role) {
    case 'manager':
      return ManagerTabs;
    case 'agent':
      return AgentTabs;
    case 'kitchen':
      return KitchenTabs;
    case 'shift':
      return ShiftTabs;
    case 'driver':
      return DriverTabs;
    case 'customer':
    default:
      return CustomerTabs;
  }
}
