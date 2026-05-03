import React from 'react';
import { Screen, Text, Card, Button } from '@field-ops/ui';
import { useAppStore } from '../../store/app';
import { SyncHeader } from '../shared/SyncHeader';

export function CustomerHomeScreen() {
  const user = useAppStore((s) => s.user);
  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <Screen>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>
          שלום, {user?.name ?? 'לקוח'}
        </Text>
        <Card>
          <Text>הזמנות אחרונות, מבצעים, ושירות.</Text>
          <Button title="צור קשר" onPress={() => {}} />
        </Card>
      </Screen>
    </Screen>
  );
}
