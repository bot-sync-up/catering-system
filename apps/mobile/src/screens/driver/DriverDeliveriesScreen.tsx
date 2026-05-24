import React, { useEffect, useState } from 'react';
import { FlatList, View, Linking } from 'react-native';
import { Screen, Card, Text, Button, Badge } from '@field-ops/ui';
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { database } from '../../db';
import { TaskModel } from '../../db/models/Task';
import {
  estimateEtaMinutes,
  getCurrentLocation,
  setGeofences,
} from '../../services/geofencing';
import { SyncHeader } from '../shared/SyncHeader';

export function DriverDeliveriesScreen() {
  const { t } = useTranslation();
  const [deliveries, setDeliveries] = useState<TaskModel[]>([]);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const sub = database
      .get<TaskModel>('tasks')
      .query(Q.where('status', Q.notEq('done')))
      .observe()
      .subscribe(setDeliveries);
    (async () => {
      try {
        const loc = await getCurrentLocation();
        setPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {}
    })();
    // mock fences for visible tasks (in real use server returns geofences)
    setGeofences([]).catch(() => {});
    return () => sub.unsubscribe();
  }, []);

  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>
          {t('delivery.title')}
        </Text>
      </View>
      <FlatList
        data={deliveries}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          // demo coords from description if "lat,lng" present
          let etaMin: number | null = null;
          let lat: number | null = null;
          let lng: number | null = null;
          const m = item.description?.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
          if (m && pos) {
            lat = parseFloat(m[1]);
            lng = parseFloat(m[2]);
            etaMin = estimateEtaMinutes(pos.lat, pos.lng, lat, lng);
          }
          return (
            <Card>
              <Text style={{ fontWeight: '600' }}>{item.title}</Text>
              {etaMin && <Text>{t('delivery.eta', { eta: `${etaMin} דק׳` })}</Text>}
              <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8 }}>
                <Badge label={t(`tasks.status.${item.status}`)} tone="warning" />
                {lat !== null && lng !== null && (
                  <Button
                    title={t('delivery.navigate')}
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                      )
                    }
                  />
                )}
                <Button
                  title={t('tasks.status.done')}
                  variant="primary"
                  onPress={() => item.markDone()}
                />
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
