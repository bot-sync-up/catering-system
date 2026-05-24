import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { DEFAULT_LOCALE, NAMESPACES, SUPPORTED_LOCALES, type SupportedLocale } from './types';

// ייבוא סטטי של resources (יוטמע בזמן build)
import heCommon from './locales/he/common.json';
import heOrders from './locales/he/orders.json';
import heKitchen from './locales/he/kitchen.json';
import heCrm from './locales/he/crm.json';
import heFinance from './locales/he/finance.json';
import heMobile from './locales/he/mobile.json';
import heEmails from './locales/he/emails.json';
import heErrors from './locales/he/errors.json';
import heValidation from './locales/he/validation.json';

import enCommon from './locales/en/common.json';
import enOrders from './locales/en/orders.json';
import enKitchen from './locales/en/kitchen.json';
import enCrm from './locales/en/crm.json';
import enFinance from './locales/en/finance.json';
import enMobile from './locales/en/mobile.json';
import enEmails from './locales/en/emails.json';
import enErrors from './locales/en/errors.json';
import enValidation from './locales/en/validation.json';

import arCommon from './locales/ar/common.json';
import arOrders from './locales/ar/orders.json';
import arKitchen from './locales/ar/kitchen.json';
import arCrm from './locales/ar/crm.json';
import arFinance from './locales/ar/finance.json';
import arMobile from './locales/ar/mobile.json';
import arEmails from './locales/ar/emails.json';
import arErrors from './locales/ar/errors.json';
import arValidation from './locales/ar/validation.json';

import ruCommon from './locales/ru/common.json';
import ruOrders from './locales/ru/orders.json';
import ruKitchen from './locales/ru/kitchen.json';
import ruCrm from './locales/ru/crm.json';
import ruFinance from './locales/ru/finance.json';
import ruMobile from './locales/ru/mobile.json';
import ruEmails from './locales/ru/emails.json';
import ruErrors from './locales/ru/errors.json';
import ruValidation from './locales/ru/validation.json';

import amCommon from './locales/am/common.json';
import amOrders from './locales/am/orders.json';
import amKitchen from './locales/am/kitchen.json';
import amCrm from './locales/am/crm.json';
import amFinance from './locales/am/finance.json';
import amMobile from './locales/am/mobile.json';
import amEmails from './locales/am/emails.json';
import amErrors from './locales/am/errors.json';
import amValidation from './locales/am/validation.json';

export const resources = {
  he: {
    common: heCommon, orders: heOrders, kitchen: heKitchen, crm: heCrm,
    finance: heFinance, mobile: heMobile, emails: heEmails, errors: heErrors, validation: heValidation,
  },
  en: {
    common: enCommon, orders: enOrders, kitchen: enKitchen, crm: enCrm,
    finance: enFinance, mobile: enMobile, emails: enEmails, errors: enErrors, validation: enValidation,
  },
  ar: {
    common: arCommon, orders: arOrders, kitchen: arKitchen, crm: arCrm,
    finance: arFinance, mobile: arMobile, emails: arEmails, errors: arErrors, validation: arValidation,
  },
  ru: {
    common: ruCommon, orders: ruOrders, kitchen: ruKitchen, crm: ruCrm,
    finance: ruFinance, mobile: ruMobile, emails: ruEmails, errors: ruErrors, validation: ruValidation,
  },
  am: {
    common: amCommon, orders: amOrders, kitchen: amKitchen, crm: amCrm,
    finance: amFinance, mobile: amMobile, emails: amEmails, errors: amErrors, validation: amValidation,
  },
} as const;

export interface InitOptions {
  /** ברירת מחדל: he */
  lng?: SupportedLocale;
  /** טעינה דינמית של תרגומים מהשרת. ברירת מחדל: false (resources סטטיים) */
  loadFromBackend?: boolean;
  /** דיבוג i18next */
  debug?: boolean;
  /** הפעלת זיהוי שפה אוטומטי בדפדפן */
  detect?: boolean;
}

export async function initI18n(opts: InitOptions = {}): Promise<I18nInstance> {
  const instance = i18next.createInstance();

  let chain: any = instance.use(initReactI18next);
  if (opts.loadFromBackend) chain = chain.use(HttpBackend);
  if (opts.detect) chain = chain.use(LanguageDetector);

  await chain.init({
    lng: opts.lng ?? DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    ns: NAMESPACES as unknown as string[],
    defaultNS: 'common',
    resources: opts.loadFromBackend ? undefined : resources,
    debug: opts.debug ?? false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    backend: opts.loadFromBackend
      ? { loadPath: '/locales/{{lng}}/{{ns}}.json' }
      : undefined,
  });

  return instance;
}

/** מופע יחיד גלובלי — שימוש סטנדרטי באפליקציה */
export const i18n = i18next;
