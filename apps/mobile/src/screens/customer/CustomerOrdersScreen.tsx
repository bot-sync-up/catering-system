import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Screen, Card, Text, Badge } from '@field-ops/ui';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../db';
import { OrderModel } from '../../db/models/Order';
import { useAppStore } from '../../store/app';
import { SyncHeader } from '../shared/SyncHeader';

export function CustomerOrdersScreen() {
  const user = useAppStore((s) => s.user);
  const [orders, setOrders] = useState<OrderModel[]>([]);

  useEffect(() => {
    if (!user) return;
    const sub = database
      .get<OrderModel>('orders')
      .query(Q.where('customer_id', user.id))
      .observe()
      .subscribe(setOrders);
    return () => sub.unsubscribe();
  }, [user]);

  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>ההזמנות שלי</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Card>
            <Text>הזמנה #{item.id.slice(0, 6)}</Text>
            <Text>₪{item.total}</Text>
            <Badge label={item.status} />
          </Card>
        )}
      />
    </Screen>
  );
}
