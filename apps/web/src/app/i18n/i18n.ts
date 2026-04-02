import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

export const NAMESPACES = [
  'common', 'auth', 'footer', 'about', 'help',
  'terms', 'privacy', 'accessibility', 'sitemap', 'contact',
] as const;

export type Namespace = (typeof NAMESPACES)[number];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ['en', 'de', 'fr', 'es', 'pl'],
    fallbackLng:   'en',
    defaultNS:     'common',
    ns:            NAMESPACES,
    preload:       ['en'],

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order:              ['localStorage', 'navigator'],
      caches:             ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
