import React from 'react';
import { Tab, tabScreenOptions } from './tabs';
import { KitchenQueueScreen } from '../../screens/kitchen/KitchenQueueScreen';
import { TasksScreen } from '../../screens/shared/TasksScreen';
import { ScanScreen } from '../../screens/shared/ScanScreen';

export function KitchenTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Queue" component={KitchenQueueScreen} options={{ title: 'הזמנות' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'משימות' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'סריקה' }} />
    </Tab.Navigator>
  );
}
