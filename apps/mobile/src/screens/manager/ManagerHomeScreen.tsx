import React from 'react';
import { Screen, Text, Card, Button } from '@field-ops/ui';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/app';
import { runSync } from '../../services/sync';
import { SyncHeader } from '../shared/SyncHeader';

export function ManagerHomeScreen() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const pending = useAppStore((s) => s.pending);
  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <Screen>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>
          שלום, {user?.name ?? t('roles.manager')}
        </Text>
        <Card>
          <Text>פעולות ממתינות לסנכרון: {pending}</Text>
          <Button title="סנכרן עכשיו" onPress={() => runSync('manager-home')} />
        </Card>
        <Card>
          <Text style={{ fontWeight: '600' }}>מבט-על מהיר</Text>
          <Text>- משימות פתוחות</Text>
          <Text>- משמרות פעילות</Text>
          <Text>- משלוחים בדרך</Text>
          <Text>- לידים חדשים</Text>
        </Card>
      </Screen>
    </Screen>
  );
}
