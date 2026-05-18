import React, { useState } from 'react';
import { Screen, Card, Text, Button } from '@field-ops/ui';
import { useTranslation } from 'react-i18next';
import { database } from '../../db';
import { CheckInModel } from '../../db/models/CheckIn';
import { getCurrentLocation } from '../../services/geofencing';
import { useAppStore } from '../../store/app';
import { SyncHeader } from './SyncHeader';

export function CheckInScreen() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const [last, setLast] = useState<string | null>(null);

  const doCheck = async (kind: 'in' | 'out') => {
    if (!user) return;
    let lat: number | undefined;
    let lng: number | undefined;
    let acc: number | undefined;
    try {
      const loc = await getCurrentLocation();
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
      acc = loc.coords.accuracy ?? undefined;
    } catch {
      // offline, no permission, etc — store anyway
    }
    await database.write(async () => {
      await database.get<CheckInModel>('check_ins').create((c) => {
        c.userId = user.id;
        c.kind = kind;
        c.lat = lat;
        c.lng = lng;
        c.accuracy = acc;
        (c as any).at = new Date();
        (c as any).updatedAt = new Date();
        c.isDirty = true;
      });
    });
    setLast(`${kind === 'in' ? '🟢' : '🔴'} ${new Date().toLocaleTimeString('he-IL')}`);
  };

  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <Screen>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>
          {t('checkin.title')}
        </Text>
        <Card>
          <Button title={t('checkin.in')} onPress={() => doCheck('in')} />
          <Button
            title={t('checkin.out')}
            variant="danger"
            onPress={() => doCheck('out')}
          />
          {last && <Text>{last}</Text>}
        </Card>
      </Screen>
    </Screen>
  );
}
