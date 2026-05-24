import React from 'react';
import { Tab, tabScreenOptions } from './tabs';
import { DriverDeliveriesScreen } from '../../screens/driver/DriverDeliveriesScreen';
import { ScanScreen } from '../../screens/shared/ScanScreen';
import { SignatureScreen } from '../../screens/shared/SignatureScreen';
import { CheckInScreen } from '../../screens/shared/CheckInScreen';

export function DriverTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Deliveries" component={DriverDeliveriesScreen} options={{ title: 'משלוחים' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'סריקה' }} />
      <Tab.Screen name="Signature" component={SignatureScreen} options={{ title: 'חתימה' }} />
      <Tab.Screen name="CheckIn" component={CheckInScreen} options={{ title: 'צ׳ק-אין' }} />
    </Tab.Navigator>
  );
}
