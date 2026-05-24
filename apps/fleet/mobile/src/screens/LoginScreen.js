import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('driver@fleet.local');
  const [password, setPassword] = useState('driver1234');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      navigation.replace('Home');
    } catch (e) {
      Alert.alert('שגיאה', e.response?.data?.error || 'שגיאת התחברות');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>שלום נהג!</Text>
      <Text style={s.subtitle}>התחבר/י כדי לדווח דלק ונסועה</Text>
      <Text style={s.label}>אימייל</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Text style={s.label}>סיסמה</Text>
      <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={s.btn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>התחברות</Text>}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6fb', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 6, color: '#0f172a' },
  subtitle: { textAlign: 'center', color: '#64748b', marginBottom: 24 },
  label: { color: '#64748b', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 16, textAlign: 'right' },
  btn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
