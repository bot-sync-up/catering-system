import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, View, RefreshControl } from 'react-native';
import { Screen, Card, Text, Button, Badge } from '@field-ops/ui';
import { Q } from '@nozbe/watermelondb';
import { useTranslation } from 'react-i18next';
import { database } from '../../db';
import { TaskModel } from '../../db/models/Task';
import { runSync } from '../../services/sync';
import { SyncHeader } from './SyncHeader';

export function TasksScreen() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<TaskModel[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = (await database
      .get<TaskModel>('tasks')
      .query(Q.sortBy('priority', Q.desc))
      .fetch()) as TaskModel[];
    setTasks(list);
  }, []);

  useEffect(() => {
    void load();
    const sub = database
      .get<TaskModel>('tasks')
      .query()
      .observe()
      .subscribe(() => load());
    return () => sub.unsubscribe();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await runSync('pull-to-refresh');
    await load();
    setRefreshing(false);
  };

  const addTask = async () => {
    await database.write(async () => {
      await database.get<TaskModel>('tasks').create((task) => {
        task.title = `משימה חדשה ${new Date().toLocaleTimeString('he-IL')}`;
        task.status = 'pending';
        task.priority = 1;
        task.isDirty = true;
        (task as any).updatedAt = new Date();
      });
    });
  };

  return (
    <Screen scroll={false} padded={false}>
      <SyncHeader />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>
          {t('tasks.title')}
        </Text>
        <Button title={t('tasks.new')} onPress={addTask} />
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={{ fontWeight: '600' }}>{item.title}</Text>
            {item.description ? <Text>{item.description}</Text> : null}
            <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8 }}>
              <Badge
                label={t(`tasks.status.${item.status}`)}
                tone={
                  item.status === 'done'
                    ? 'success'
                    : item.status === 'cancelled'
                    ? 'danger'
                    : 'warning'
                }
              />
              {item.isDirty && <Badge label={t('tasks.queued')} tone="warning" />}
              {item.conflictFlag && (
                <Badge label={`!${item.conflictFlag}`} tone="danger" />
              )}
            </View>
            <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 8 }}>
              {item.status !== 'done' && (
                <Button
                  title={t('tasks.status.done')}
                  variant="primary"
                  onPress={() => item.markDone()}
                />
              )}
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
