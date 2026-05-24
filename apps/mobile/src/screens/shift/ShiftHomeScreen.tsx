import React, { useEffect, useState } from 'react';
import { Screen, Text, Card, Button } from '@field-ops/ui';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../db';
import { ShiftModel } from '../../db/models/Shift';
import { useAppStore } from '../../store/app';
import { SyncHeader } from '../shared/SyncHeader';

export function ShiftHomeScreen() {
  const user = useAppStore((s) => s.user);
  const [active, setActive] = useState<ShiftModel | null>(null);

  useEffect(() => {
    if (!user) return;
    const sub = database
      .get<ShiftModel>('shifts')
      .query(Q.where('user_id', user.id), Q.where('end_at', null))
      .observe()
      .subscribe((rows) => setActive(rows[0] ?? null));
    return () => sub.unsubscribe();
  }, [user]);

  const start = async () => {
    if (!user) return;
    await database.write(async () => {
      await database.get<ShiftModel>('shifts').create((s) => {
        s.userId = user.id;
        (s as any).startAt = new Date();
        s.role = user.role;
        (s as any).updatedAt = new Date();
        s.isDirty = true;
      });
    });
  };

  const end = async () => {
    if (!active) return;
    await database.write(async () => {
      await active.update((s) => {
        (s as any).endAt = new Date();
        s.isDirty = true;
        (s as any).updatedAt = new Date();
      });
    });
  };

  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <Screen>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>משמרת</Text>
        <Card>
          {active ? (
            <>
              <Text>משמרת פעילה — החל מ-{active.startAt.toLocaleTimeString('he-IL')}</Text>
              <Button title="סיים משמרת" variant="danger" onPress={end} />
            </>
          ) : (
            <Button title="התחל משמרת" onPress={start} />
          )}
        </Card>
      </Screen>
    </Screen>
  );
}
