/**
 * Automatic Jest mock for react-i18next.
 *
 * Mapped via moduleNameMapper in jest.config.cts so every test file gets
 * real English strings from the bundled locale JSON — no changes to
 * existing test assertions required.
 */
import React from 'react';

import enCommon        from '../../public/locales/en/common.json';
import enAuth          from '../../public/locales/en/auth.json';
import enFooter        from '../../public/locales/en/footer.json';
import enAbout         from '../../public/locales/en/about.json';
import enHelp          from '../../public/locales/en/help.json';
import enTerms         from '../../public/locales/en/terms.json';
import enPrivacy       from '../../public/locales/en/privacy.json';
import enAccessibility from '../../public/locales/en/accessibility.json';
import enSitemap       from '../../public/locales/en/sitemap.json';

// ── Flatten nested JSON to dot-notation keys ──────────────────────────────────
function flatten(obj: unknown, prefix = ''): Record<string, string> {
  if (typeof obj !== 'object' || obj === null) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[full] = value;
    } else if (Array.isArray(value)) {
      // Preserve arrays as JSON so returnObjects still works in components
      result[full] = JSON.stringify(value);
      value.forEach((item, i) => {
        if (typeof item === 'string') result[`${full}.${i}`] = item;
        else if (typeof item === 'object') Object.assign(result, flatten(item, `${full}.${i}`));
      });
    } else if (typeof value === 'object') {
      Object.assign(result, flatten(value, full));
    }
  }
  return result;
}

const NS: Record<string, Record<string, string>> = {
  common:        flatten(enCommon),
  auth:          flatten(enAuth),
  footer:        flatten(enFooter),
  about:         flatten(enAbout),
  help:          flatten(enHelp),
  terms:         flatten(enTerms),
  privacy:       flatten(enPrivacy),
  accessibility: flatten(enAccessibility),
  sitemap:       flatten(enSitemap),
};

// ── t() factory ───────────────────────────────────────────────────────────────
function makeT(ns: string | string[] = 'common') {
  const namespace = Array.isArray(ns) ? ns[0] : ns;
  return (key: string, opts?: Record<string, unknown>): string => {
    // Support "ns:key" notation
    const [resolvedNs, resolvedKey] = key.includes(':')
      ? (key.split(':', 2) as [string, string])
      : [namespace, key];

    const dict = NS[resolvedNs] ?? {};
    let value = dict[resolvedKey] ?? key;

    // Interpolation: replace {{variable}} placeholders
    if (opts && typeof opts === 'object') {
      value = Object.entries(opts).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v)),
        value,
      );
    }
    return value;
  };
}

// ── Exports ───────────────────────────────────────────────────────────────────
export const useTranslation = jest.fn((ns?: string | string[]) => ({
  t: makeT(ns ?? 'common'),
  i18n: { changeLanguage: jest.fn(), language: 'en' },
}));

export const Trans = ({
  children,
  i18nKey,
  ns,
}: {
  children?: React.ReactNode;
  i18nKey?: string;
  ns?: string;
}) => {
  if (i18nKey && !children) {
    const t = makeT(ns ?? 'common');
    return <>{t(i18nKey)}</>;
  }
  return <>{children ?? null}</>;
};

export const initReactI18next = {
  type: '3rdParty' as const,
  init: jest.fn(),
};
