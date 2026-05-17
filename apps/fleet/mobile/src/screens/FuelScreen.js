import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/client';

export default function FuelScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [mileage, setMileage] = useState('');
  const [vendor, setVendor] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/vehicles').then((r) => {
      setVehicles(r.data);
      if (r.data.length === 1) setVehicleId(r.data[0].id);
    });
  }, []);

  async function pickPhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (!r.canceled) setPhoto(r.assets[0]);
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0]);
  }

  async function submit() {
    if (!vehicleId || !amount) {
      Alert.alert('שגיאה', 'יש לבחור רכב ולמלא סכום');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('vehicleId', vehicleId);
      fd.append('type', 'FUEL');
      fd.append('date', new Date().toISOString());
      fd.append('amount', String(amount));
      if (liters) fd.append('liters', String(liters));
      if (pricePerLiter) fd.append('pricePerLiter', String(pricePerLiter));
      if (mileage) fd.append('mileage', String(mileage));
      if (vendor) fd.append('vendor', vendor);
      if (photo) {
        fd.append('receipt', {
          uri: photo.uri, name: 'receipt.jpg', type: 'image/jpeg',
        });
      }
      await api.post('/expenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('נקלט', 'הדיווח נשמר');
      navigation.goBack();
    } catch (e) {
      Alert.alert('שגיאה', e.response?.data?.error || 'שגיאה בשמירה');
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
            <TouchableOpacity key={v.id} onPress={() => setVehicleId(v.id)}
              style={[s.chip, vehicleId === v.id && s.chipOn]}>
              <Text style={[s.chipText, vehicleId === v.id && s.chipTextOn]}>{v.plate}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>סכום (₪) *</Text>
        <TextInput style={s.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

        <Text style={s.label}>ליטרים</Text>
        <TextInput style={s.input} keyboardType="decimal-pad" value={liters} onChangeText={setLiters} />

        <Text style={s.label}>מחיר לליטר</Text>
        <TextInput style={s.input} keyboardType="decimal-pad" value={pricePerLiter} onChangeText={setPricePerLiter} />

        <Text style={s.label}>ק"מ נוכחי</Text>
        <TextInput style={s.input} keyboardType="number-pad" value={mileage} onChangeText={setMileage} />

        <Text style={s.label}>תחנת דלק</Text>
        <TextInput style={s.input} value={vendor} onChangeText={setVendor} placeholder="לדוגמה: פז" />

        <Text style={s.label}>קבלה</Text>
        <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}>
          <Text style={{ color: '#2563eb' }}>📷 צילום / העלאה</Text>
        </TouchableOpacity>
        {photo && <Image source={{ uri: photo.uri }} style={s.preview} />}

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
  chipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#0f172a' },
  chipTextOn: { color: '#fff' },
  photoBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  preview: { width: '100%', height: 200, borderRadius: 10, marginTop: 8 },
  submit: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
