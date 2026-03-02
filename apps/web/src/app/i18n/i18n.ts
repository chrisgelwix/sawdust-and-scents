import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// ── Bundled English resources (zero-latency on first render) ──────────────────
import enCommon       from '../../../public/locales/en/common.json';
import enAuth         from '../../../public/locales/en/auth.json';
import enFooter       from '../../../public/locales/en/footer.json';
import enAbout        from '../../../public/locales/en/about.json';
import enHelp         from '../../../public/locales/en/help.json';
import enTerms        from '../../../public/locales/en/terms.json';
import enPrivacy      from '../../../public/locales/en/privacy.json';
import enAccessibility from '../../../public/locales/en/accessibility.json';
import enSitemap      from '../../../public/locales/en/sitemap.json';
import enContact      from '../../../public/locales/en/contact.json';

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
    // English is pre-bundled — other languages lazy-load from /public/locales/
    resources: {
      en: {
        common:        enCommon,
        auth:          enAuth,
        footer:        enFooter,
        about:         enAbout,
        help:          enHelp,
        terms:         enTerms,
        privacy:       enPrivacy,
        accessibility: enAccessibility,
        sitemap:       enSitemap,
        contact:       enContact,
      },
    },
    partialBundledLanguages: true,        // bundle EN; fetch others on demand
    supportedLngs: ['en', 'de', 'fr', 'es', 'pl'],
    fallbackLng:   'en',
    defaultNS:     'common',
    ns:            NAMESPACES,

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
