import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import en from './locales/en.json'

// Normalize BCP-47 tag (e.g. 'en-US') to bare code ('en') so it matches resource keys.
const deviceLang = (getLocales()[0]?.languageCode ?? 'en').split('-')[0]

// With pre-loaded resources (no HTTP backend), i18next v26 init is synchronous — components
// calling t() on first render receive translations, not raw keys.
i18n.use(initReactI18next).init({
  lng: deviceLang,
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false, // React Native handles output escaping
  },
}).catch(console.error)

export default i18n
