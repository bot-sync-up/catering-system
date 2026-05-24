import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

export default function HomeScreen({ navigation }) {
  const [me, setMe] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const u = await AsyncStorage.getItem('user');
      if (u) setMe(JSON.parse(u));
      const [v, a] = await Promise.all([
        api.get('/vehicles'),
        api.get('/alerts?ack=false'),
      ]);
      setVehicles(v.data);
      setAlertCount(a.data.length);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function logout() {
    await AsyncStorage.multiRemove(['token', 'user']);
    navigation.replace('Login');
  }

  return (
    <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <View style={s.container}>
        <Text style={s.hello}>שלום, {me?.name || 'נהג'}</Text>

        <View style={s.row}>
          <TouchableOpacity style={[s.bigCard, { backgroundColor: '#2563eb' }]} onPress={() => navigation.navigate('Fuel')}>
            <Text style={s.bigCardIcon}>⛽</Text>
            <Text style={s.bigCardText}>דיווח דלק</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bigCard, { backgroundColor: '#16a34a' }]} onPress={() => navigation.navigate('Mileage')}>
            <Text style={s.bigCardIcon}>🛣️</Text>
            <Text style={s.bigCardText}>נסועה</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.alertCard, alertCount > 0 ? s.alertCardActive : null]} onPress={() => navigation.navigate('Alerts')}>
          <Text style={s.alertText}>🔔 התראות פתוחות: {alertCount}</Text>
        </TouchableOpacity>

        <Text style={s.section}>הרכבים שלי</Text>
        {vehicles.length === 0 && <Text style={s.muted}>אין רכבים משויכים</Text>}
        {vehicles.map((v) => (
          <View key={v.id} style={s.vehicle}>
            <Text style={s.plate}>{v.plate}</Text>
            <Text style={s.muted}>{v.make} {v.model} ({v.year})</Text>
            <Text style={s.kmLabel}>מד: {(v.currentKm || 0).toLocaleString('he-IL')} ק"מ</Text>
          </View>
        ))}

        <TouchableOpacity style={s.logout} onPress={logout}>
          <Text style={{ color: '#ef4444' }}>התנתקות</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { backgroundColor: '#f4f6fb' },
  container: { padding: 16, paddingBottom: 40 },
  hello: { fontSize: 22, fontWeight: '700', marginVertical: 12, color: '#0f172a' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  bigCard: { flex: 1, padding: 24, borderRadius: 16, alignItems: 'center' },
  bigCardIcon: { fontSize: 40 },
  bigCardText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 8 },
  alertCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  alertCardActive: { borderColor: '#f59e0b', backgroundColor: '#fef3c7' },
  alertText: { fontSize: 16, color: '#0f172a', textAlign: 'center' },
  section: { fontSize: 18, fontWeight: '600', marginVertical: 8, color: '#0f172a' },
  vehicle: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  plate: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  muted: { color: '#64748b', marginTop: 2 },
  kmLabel: { marginTop: 6, color: '#0f172a' },
  logout: { marginTop: 24, alignItems: 'center', padding: 12 },
});
