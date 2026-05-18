import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Screen, Card, Text, Button, Badge } from '@field-ops/ui';
import { useTranslation } from 'react-i18next';
import { database } from '../../db';
import { LeadModel } from '../../db/models/Lead';
import { SyncHeader } from './SyncHeader';

export function LeadsScreen() {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<LeadModel[]>([]);

  useEffect(() => {
    const sub = database
      .get<LeadModel>('leads')
      .query()
      .observe()
      .subscribe(setLeads);
    return () => sub.unsubscribe();
  }, []);

  const addLead = async () => {
    await database.write(async () => {
      await database.get<LeadModel>('leads').create((l) => {
        l.name = `ליד ${new Date().toLocaleTimeString('he-IL')}`;
        l.status = 'new';
        l.isDirty = true;
        (l as any).updatedAt = new Date();
      });
    });
  };

  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>{t('tabs.leads')}</Text>
        <Button title="ליד חדש" onPress={addLead} />
      </View>
      <FlatList
        data={leads}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Card>
            <Text style={{ fontWeight: '600' }}>{item.name}</Text>
            {item.phone && <Text>{item.phone}</Text>}
            <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
              <Badge label={item.status} />
              {item.isDirty && <Badge label={t('tasks.queued')} tone="warning" />}
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
