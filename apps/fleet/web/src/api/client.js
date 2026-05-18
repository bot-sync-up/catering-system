import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const FUEL_HE = {
  PETROL: 'בנזין', DIESEL: 'דיזל', HYBRID: 'היברידי', ELECTRIC: 'חשמלי', GAS: 'גז',
};
export const DOC_TYPE_HE = {
  TEST: 'טסט', INSURANCE_MANDATORY: 'ביטוח חובה', INSURANCE_COMPREHENSIVE: 'ביטוח מקיף',
  LICENSE: 'רישיון רכב', LICENSE_DRIVER: 'רישיון נהיגה',
};
export const EXPENSE_TYPE_HE = {
  FUEL: 'דלק', SERVICE: 'טיפול', REPAIR: 'תיקון', FINE: 'קנס',
  PARKING: 'חנייה', TOLL: 'אגרה', WASH: 'שטיפה', OTHER: 'אחר',
};
export const PURPOSE_HE = { BUSINESS: 'עסקי', PRIVATE: 'פרטי', MIXED: 'מעורב' };
export const ALERT_LEVEL_HE = {
  D60: '60 ימים', D30: '30 ימים', D7: '7 ימים', EXPIRED: 'פג תוקף',
};

export const formatILS = (n) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n || 0);
export const formatDateHe = (d) => d ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(new Date(d)) : '';
