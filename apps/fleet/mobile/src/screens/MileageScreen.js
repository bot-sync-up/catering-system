import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { api, PURPOSE_HE } from '../api/client';

export default function MileageScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [purpose, setPurpose] = useState('BUSINESS');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/vehicles').then((r) => {
      setVehicles(r.data);
      if (r.data.length >= 1) {
        setVehicleId(r.data[0].id);
        setStartKm(String(r.data[0].currentKm || ''));
      }
    });
  }, []);

  async function submit() {
    if (!vehicleId || !startKm || !endKm) {
      Alert.alert('שגיאה', 'יש למלא רכב, מד התחלה ומד סיום');
      return;
    }
    if (Number(endKm) < Number(startKm)) {
      Alert.alert('שגיאה', 'מד סיום חייב להיות גדול ממד התחלה');
      return;
    }
    setBusy(true);
    try {
      await api.post('/mileage', {
        vehicleId,
        date: new Date().toISOString(),
        startKm: Number(startKm),
        endKm: Number(endKm),
        purpose,
        origin: origin || undefined,
        destination: destination || undefined,
      });
      Alert.alert('נקלט', 'הנסועה דווחה');
      navigation.goBack();
    } catch (e) {
      Alert.alert('שגיאה', e.response?.data?.error || 'שגיאה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.container}>
        <Text style={s.label}>רכב</Text>
        <View style={s.chips}>
          {vehicles.map((v) => (
            <TouchableOpacity key={v.id} onPress={() => { setVehicleId(v.id); setStartKm(String(v.currentKm || '')); }}
              style={[s.chip, vehicleId === v.id && s.chipOn]}>
              <Text style={[s.chipText, vehicleId === v.id && s.chipTextOn]}>{v.plate}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>מטרה</Text>
        <View style={s.chips}>
          {Object.entries(PURPOSE_HE).map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setPurpose(k)}
              style={[s.chip, purpose === k && s.chipOn]}>
              <Text style={[s.chipText, purpose === k && s.chipTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>מד התחלה</Text>
        <TextInput style={s.input} keyboardType="number-pad" value={startKm} onChangeText={setStartKm} />

        <Text style={s.label}>מד סיום</Text>
        <TextInput style={s.input} keyboardType="number-pad" value={endKm} onChangeText={setEndKm} />

        {startKm && endKm && Number(endKm) >= Number(startKm) ? (
          <Text style={s.kmCalc}>סה"כ: {Number(endKm) - Number(startKm)} ק"מ</Text>
        ) : null}

        <Text style={s.label}>מ-</Text>
        <TextInput style={s.input} value={origin} onChangeText={setOrigin} placeholder="לדוגמה: תל אביב" />

        <Text style={s.label}>אל</Text>
        <TextInput style={s.input} value={destination} onChangeText={setDestination} placeholder="לדוגמה: ירושלים" />

        <TouchableOpacity style={s.submit} onPress={submit} disabled={busy}>
          <Text style={s.submitText}>{busy ? 'שומר...' : 'שמירת דיווח'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { backgroundColor: '#f4f6fb' },
  container: { padding: 16 },
  label: { color: '#64748b', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 16, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb' },
  chipOn: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { color: '#0f172a' },
  chipTextOn: { color: '#fff' },
  kmCalc: { marginTop: 8, fontSize: 16, color: '#16a34a', fontWeight: '700', textAlign: 'right' },
  submit: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
