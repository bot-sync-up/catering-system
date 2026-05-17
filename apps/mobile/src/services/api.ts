import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const baseURL =
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ??
  'https://api.fieldops.example.com';

export const api = axios.create({ baseURL, timeout: 20000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function setAuthToken(token: string | null) {
  if (token) await SecureStore.setItemAsync('auth_token', token);
  else await SecureStore.deleteItemAsync('auth_token');
}
