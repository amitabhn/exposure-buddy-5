import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import en from './locales/en.json'

const deviceLang = getLocales()[0]?.languageCode ?? 'en'

i18n.use(initReactI18next).init({
  lng: deviceLang,
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
  },
  interpolation: {
    escapeValue: false, // React Native handles output escaping
  },
})

export default i18n
