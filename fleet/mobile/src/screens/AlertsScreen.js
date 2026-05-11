import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { api, ALERT_LEVEL_HE, formatDateHe } from '../api/client';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const r = await api.get('/alerts?ack=false');
    setAlerts(r.data);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function ack(id) {
    await api.post(`/alerts/${id}/ack`);
    load();
  }

  return (
    <FlatList
      style={{ backgroundColor: '#f4f6fb' }}
      contentContainerStyle={{ padding: 12 }}
      data={alerts}
      keyExtractor={(a) => a.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListEmptyComponent={<Text style={s.empty}>אין התראות פתוחות</Text>}
      renderItem={({ item }) => {
        const red = item.level === 'EXPIRED' || item.level === 'D7';
        return (
          <View style={[s.card, red && s.cardRed]}>
            <Text style={s.lvl}>{ALERT_LEVEL_HE[item.level]}</Text>
            <Text style={s.msg}>{item.message}</Text>
            <Text style={s.when}>תאריך: {formatDateHe(item.fireAt)}</Text>
            <TouchableOpacity style={s.ackBtn} onPress={() => ack(item.id)}>
              <Text style={s.ackBtnText}>אישור</Text>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  empty: { textAlign: 'center', marginTop: 40, color: '#64748b' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#fef3c7' },
  cardRed: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  lvl: { fontWeight: '700', color: '#92400e', marginBottom: 4 },
  msg: { color: '#0f172a', marginBottom: 4 },
  when: { color: '#64748b', fontSize: 12 },
  ackBtn: { marginTop: 10, alignSelf: 'flex-end', backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  ackBtnText: { color: '#fff', fontWeight: '600' },
});
