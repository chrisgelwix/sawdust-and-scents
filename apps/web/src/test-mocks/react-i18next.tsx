/**
 * Automatic Jest mock for react-i18next.
 *
 * Mapped via moduleNameMapper in jest.config.cts so every test file gets
 * real English strings from the bundled locale JSON — no changes to
 * existing test assertions required.
 */
import { readFileSync } from 'fs';
import path from 'path';
import React from 'react';

function loadPublicJson(relativeToThisFile: string): unknown {
  const abs = path.resolve(__dirname, relativeToThisFile);
  return JSON.parse(readFileSync(abs, 'utf-8')) as unknown;
}

const enCommon = loadPublicJson('../../public/locales/en/common.json');
const enAuth = loadPublicJson('../../public/locales/en/auth.json');
const enFooter = loadPublicJson('../../public/locales/en/footer.json');
const enAbout = loadPublicJson('../../public/locales/en/about.json');
const enHelp = loadPublicJson('../../public/locales/en/help.json');
const enTerms = loadPublicJson('../../public/locales/en/terms.json');
const enPrivacy = loadPublicJson('../../public/locales/en/privacy.json');
const enAccessibility = loadPublicJson('../../public/locales/en/accessibility.json');
const enSitemap = loadPublicJson('../../public/locales/en/sitemap.json');
const enContact = loadPublicJson('../../public/locales/en/contact.json');

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
  contact:       flatten(enContact),
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
export const useTranslation = (ns?: string | string[]) => ({
  t: makeT(ns ?? 'common'),
  i18n: { changeLanguage: () => Promise.resolve(), language: 'en' },
});

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
  init: () => undefined,
};
