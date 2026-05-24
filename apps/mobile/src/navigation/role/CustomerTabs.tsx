import React from 'react';
import { Tab, tabScreenOptions } from './tabs';
import { CustomerHomeScreen } from '../../screens/customer/CustomerHomeScreen';
import { CustomerOrdersScreen } from '../../screens/customer/CustomerOrdersScreen';
import { SettingsScreen } from '../../screens/shared/SettingsScreen';

export function CustomerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={CustomerHomeScreen} options={{ title: 'ראשי' }} />
      <Tab.Screen name="Orders" component={CustomerOrdersScreen} options={{ title: 'הזמנות' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'הגדרות' }} />
    </Tab.Navigator>
  );
}
