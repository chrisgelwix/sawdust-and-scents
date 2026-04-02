/**
 * Augments react-i18next's type system so that useTranslation() returns
 * fully typed keys for every namespace — autocomplete + compile-time safety.
 */
import 'react-i18next';

type TranslationValue = string | number | boolean | null | TranslationDict | TranslationValue[];
type TranslationDict = { [key: string]: TranslationValue };

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: TranslationDict;
      auth: TranslationDict;
      footer: TranslationDict;
      about: TranslationDict;
      help: TranslationDict;
      terms: TranslationDict;
      privacy: TranslationDict;
      accessibility: TranslationDict;
      sitemap: TranslationDict;
      contact: TranslationDict;
    };
  }
}
