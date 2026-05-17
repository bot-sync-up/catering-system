import React from 'react';
import { Tab, tabScreenOptions } from './tabs';
import { AgentHomeScreen } from '../../screens/agent/AgentHomeScreen';
import { LeadsScreen } from '../../screens/shared/LeadsScreen';
import { TasksScreen } from '../../screens/shared/TasksScreen';
import { CheckInScreen } from '../../screens/shared/CheckInScreen';
import { ScanScreen } from '../../screens/shared/ScanScreen';

export function AgentTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="AgentHome" component={AgentHomeScreen} options={{ title: 'ראשי' }} />
      <Tab.Screen name="Leads" component={LeadsScreen} options={{ title: 'לידים' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'משימות' }} />
      <Tab.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'צ׳ק-אין' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'סריקה' }} />
    </Tab.Navigator>
  );
}
