import * as LocalAuth from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { setAuthToken, api } from './api';
import { useAppStore } from '../store/app';
import type { Role, User } from '../types';

export async function loginWithPhone(phone: string, code: string) {
  const res = await api.post('/auth/login', { phone, code });
  await setAuthToken(res.data.token);
  await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
  useAppStore.getState().setUser(res.data.user);
  return res.data.user as User;
}

export async function setRole(role: Role) {
  const u = useAppStore.getState().user;
  if (!u) return;
  const updated = { ...u, role };
  await SecureStore.setItemAsync('user', JSON.stringify(updated));
  useAppStore.getState().setUser(updated);
}

export async function logout() {
  await setAuthToken(null);
  await SecureStore.deleteItemAsync('user');
  useAppStore.getState().setUser(null);
}

export async function biometricUnlock(): Promise<boolean> {
  const has = await LocalAuth.hasHardwareAsync();
  if (!has) return false;
  const enrolled = await LocalAuth.isEnrolledAsync();
  if (!enrolled) return false;
  const r = await LocalAuth.authenticateAsync({
    promptMessage: 'אימות זהות',
    cancelLabel: 'ביטול',
    disableDeviceFallback: false,
  });
  return r.success;
}

export async function restoreSession(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync('user');
  if (!raw) return null;
  const u = JSON.parse(raw) as User;
  useAppStore.getState().setUser(u);
  return u;
}
