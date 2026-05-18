import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import he from './he.json';

i18n.use(initReactI18next).init({
  resources: { he: { translation: he } },
  lng: 'he',
  fallbackLng: 'he',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',
});

// Locale info available for RTL fallback if needed
export const locale = Localization.getLocales()[0]?.languageCode ?? 'he';

export default i18n;
