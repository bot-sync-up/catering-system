import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const baseURL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:4000/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use(async (config) => {
  const t = await AsyncStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const EXPENSE_TYPE_HE = {
  FUEL: 'דלק', SERVICE: 'טיפול', REPAIR: 'תיקון', FINE: 'קנס',
};
export const PURPOSE_HE = { BUSINESS: 'עסקי', PRIVATE: 'פרטי', MIXED: 'מעורב' };
export const ALERT_LEVEL_HE = { D60: '60 ימים', D30: '30 ימים', D7: '7 ימים', EXPIRED: 'פג תוקף' };

export const formatDateHe = (d) => d ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(new Date(d)) : '';
