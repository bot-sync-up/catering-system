import React, { useState } from 'react';
import { Screen, Card, Text, Button, Input } from '@field-ops/ui';
import { useTranslation } from 'react-i18next';
import { logout } from '../../services/auth';
import { getDndWindow, setDndWindow } from '../../utils/dnd';
import { runSync } from '../../services/sync';
import { useAppStore } from '../../store/app';

export function SettingsScreen() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const [start, setStart] = useState(String(getDndWindow().startHour));
  const [end, setEnd] = useState(String(getDndWindow().endHour));

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>הגדרות</Text>
      {user && (
        <Card>
          <Text>{user.name}</Text>
          <Text>{t(`roles.${user.role}`)}</Text>
        </Card>
      )}
      <Card>
        <Text style={{ fontWeight: '600' }}>שעות שקט (DND)</Text>
        <Text>התחלה (שעה 0-23):</Text>
        <Input value={start} onChangeText={setStart} keyboardType="number-pad" />
        <Text>סיום (שעה 0-23):</Text>
        <Input value={end} onChangeText={setEnd} keyboardType="number-pad" />
        <Button
          title="שמור"
          onPress={() =>
            setDndWindow({ startHour: Number(start), endHour: Number(end) })
          }
        />
      </Card>
      <Card>
        <Button title="סנכרן עכשיו" onPress={() => runSync('manual')} />
        <Button title={t('auth.logout')} variant="danger" onPress={logout} />
      </Card>
    </Screen>
  );
}
