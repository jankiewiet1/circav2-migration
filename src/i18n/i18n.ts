import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { addDynamicTranslations } from '@/services/translationService';

// Import translation JSON files
import enTranslation from './locales/en/translation.json';
import nlTranslation from './locales/nl/translation.json';
import deTranslation from './locales/de/translation.json';

// the translations
const resources = {
  en: {
    translation: enTranslation,
    dynamic: {} // Will be populated with Supabase translations
  },
  nl: {
    translation: nlTranslation,
    dynamic: {}
  },
  de: {
    translation: deTranslation,
    dynamic: {}
  }
};

i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next
  .use(initReactI18next)
  // init i18n
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    ns: ['translation', 'dynamic'],
    defaultNS: 'translation'
  });

// Load dynamic translations from Supabase
// This is done after initialization to prevent blocking the app startup
addDynamicTranslations(i18n, ['marketing', 'email']).catch(error => {
  console.error('Failed to load dynamic translations:', error);
});

export default i18n; 