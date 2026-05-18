import React from 'react';
import { Tab, tabScreenOptions } from './tabs';
import { ManagerHomeScreen } from '../../screens/manager/ManagerHomeScreen';
import { TasksScreen } from '../../screens/shared/TasksScreen';
import { LeadsScreen } from '../../screens/shared/LeadsScreen';
import { SettingsScreen } from '../../screens/shared/SettingsScreen';

export function ManagerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="ManagerHome" component={ManagerHomeScreen} options={{ title: 'ראשי' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'משימות' }} />
      <Tab.Screen name="Leads" component={LeadsScreen} options={{ title: 'לידים' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'הגדרות' }} />
    </Tab.Navigator>
  );
}
