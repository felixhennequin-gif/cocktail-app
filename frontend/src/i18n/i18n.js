import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './locales/fr.json'
import en from './locales/en.json'

// Langue initiale : localStorage → navigator.language → 'fr'
const storedLang = localStorage.getItem('lang')
const browserLang = navigator.language?.startsWith('en') ? 'en' : 'fr'
const initialLang = storedLang || browserLang

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: initialLang,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
