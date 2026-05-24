import React from 'react';
import { Screen, Text, Card, Button } from '@field-ops/ui';
import { useAppStore } from '../../store/app';
import { runSync } from '../../services/sync';
import { SyncHeader } from '../shared/SyncHeader';

export function AgentHomeScreen() {
  const user = useAppStore((s) => s.user);
  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <Screen>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>
          שלום, {user?.name ?? 'סוכן'}
        </Text>
        <Card>
          <Text>היום: לידים חדשים, משימות, צ׳ק-אין ללקוחות.</Text>
          <Button title="סנכרון" onPress={() => runSync('agent-home')} />
        </Card>
      </Screen>
    </Screen>
  );
}
