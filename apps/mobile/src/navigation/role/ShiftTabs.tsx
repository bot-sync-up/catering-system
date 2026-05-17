import React from 'react';
import { Tab, tabScreenOptions } from './tabs';
import { ShiftHomeScreen } from '../../screens/shift/ShiftHomeScreen';
import { TasksScreen } from '../../screens/shared/TasksScreen';
import { CheckInScreen } from '../../screens/shared/CheckInScreen';

export function ShiftTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="ShiftHome" component={ShiftHomeScreen} options={{ title: 'משמרת' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'משימות' }} />
      <Tab.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'צ׳ק-אין' }} />
    </Tab.Navigator>
  );
}
