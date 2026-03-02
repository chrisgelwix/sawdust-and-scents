/**
 * Augments react-i18next's type system so that useTranslation() returns
 * fully typed keys for every namespace — autocomplete + compile-time safety.
 */
import 'react-i18next';

import type enCommon        from '../../../public/locales/en/common.json';
import type enAuth          from '../../../public/locales/en/auth.json';
import type enFooter        from '../../../public/locales/en/footer.json';
import type enAbout         from '../../../public/locales/en/about.json';
import type enHelp          from '../../../public/locales/en/help.json';
import type enTerms         from '../../../public/locales/en/terms.json';
import type enPrivacy       from '../../../public/locales/en/privacy.json';
import type enAccessibility from '../../../public/locales/en/accessibility.json';
import type enSitemap       from '../../../public/locales/en/sitemap.json';
import type enContact       from '../../../public/locales/en/contact.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common:        typeof enCommon;
      auth:          typeof enAuth;
      footer:        typeof enFooter;
      about:         typeof enAbout;
      help:          typeof enHelp;
      terms:         typeof enTerms;
      privacy:       typeof enPrivacy;
      accessibility: typeof enAccessibility;
      sitemap:       typeof enSitemap;
      contact:       typeof enContact;
    };
  }
}
