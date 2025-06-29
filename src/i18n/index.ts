import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enPopup from '../locales/en/popup.json';

import hiCommon from '../locales/hi/common.json';
import hiPopup from '../locales/hi/popup.json';

import taCommon from '../locales/ta/common.json';
import taPopup from '../locales/ta/popup.json';

const resources = {
  en: {
    common: enCommon,
    popup: enPopup
  },
  hi: {
    common: hiCommon,
    popup: hiPopup
  },
  ta: {
    common: taCommon,
    popup: taPopup
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'popup'],
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;