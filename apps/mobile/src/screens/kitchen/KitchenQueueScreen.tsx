import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Screen, Card, Text, Button, Badge } from '@field-ops/ui';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../db';
import { OrderModel } from '../../db/models/Order';
import { SyncHeader } from '../shared/SyncHeader';

export function KitchenQueueScreen() {
  const [orders, setOrders] = useState<OrderModel[]>([]);

  useEffect(() => {
    const sub = database
      .get<OrderModel>('orders')
      .query(Q.where('status', Q.notEq('done')))
      .observe()
      .subscribe(setOrders);
    return () => sub.unsubscribe();
  }, []);

  const advance = (o: OrderModel) =>
    database.write(async () => {
      await o.update((x) => {
        x.status = x.status === 'new' ? 'in_progress' : 'done';
        x.isDirty = true;
        (x as any).updatedAt = new Date();
      });
    });

  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>תור הזמנות מטבח</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Card>
            <Text style={{ fontWeight: '600' }}>הזמנה #{item.id.slice(0, 6)}</Text>
            <Text>סך: ₪{item.total}</Text>
            <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8 }}>
              <Badge label={item.status} tone={item.status === 'in_progress' ? 'warning' : 'default'} />
              <Button title="הבא" onPress={() => advance(item)} />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
