# Step 24: Internationalization (i18n) and RTL Support

## 1. The "Why" Behind This Step: Speaking the Customer's Language

If you want to sell your wood signs and scented candles globally, you need to speak your customers' languages. **Internationalization (i18n)** is the process of designing your app so it can be easily adapted to different languages and regions.

**The Strategy**: We use **react-i18next** for the frontend and a localization strategy for the backend.
- **The Analogy**: Imagine your app is a restaurant menu. Instead of printing separate menus for every language (which is hard to update), you print a menu with "Slot IDs" (e.g., `#Item1`) and keep a translation book at the table.
- **The Arabic Challenge**: Arabic is a **Right-to-Left (RTL)** language. This means the entire layout of your app needs to "flip"—the sidebar moves to the right, text aligns right, and icons might need to be mirrored.

---

## 2. Core Concepts & Definitions

### 2.1 i18n vs l10n

- **i18n (Internationalization)**: The technical setup that *enables* multiple languages (the plumbing).
- **l10n (Localization)**: The actual process of translating content and adapting for a specific region (the paint and furniture).

### 2.2 ICU Message Format

- **Definition**: A standard way to handle complex translations like plurals ("1 item" vs "5 items") and gender.
- **The Logic**: Instead of `count + " items"`, you use `{count, plural, one {# item} other {# items}}`.

### 2.3 RTL (Right-to-Left)

- **Definition**: Languages like Arabic and Hebrew that are read from right to left.
- **The Logic**: CSS properties like `margin-left` become problematic. We use "Logical Properties" like `margin-inline-start` so they adapt automatically based on the direction.

---

## 3. Prerequisites

Before proceeding, ensure you have:

- ✅ Step 19 - React Frontend Foundation
- ✅ Step 21 - Storybook (for testing components in different languages)
- ✅ Material-UI installed (MUI has great RTL support)

---

## 4. Step-by-Step Implementation: Frontend (React)

### Step 4.1: Install i18n Libraries

```bash
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

### Step 4.2: Create the i18n Configuration

**File**: `apps/web/src/app/i18n/config.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi) // Load translations from files
  .use(LanguageDetector) // Detect browser language
  .use(initReactI18next) // Bind to React
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'ar'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    backend: {
      loadPath: '/assets/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['queryString', 'cookie', 'localStorage', 'navigator'],
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
```

### Step 4.3: Initialize in Main Entry Point

**File**: `apps/web/src/main.tsx`

```tsx
import './app/i18n/config'; // Import the config
import { Suspense } from 'react';

// Wrap your app in Suspense to handle loading translation files
root.render(
  <Suspense fallback="Loading language...">
    <App />
  </Suspense>
);
```

### Step 4.4: Create Translation Files

Create these directories: `apps/web/public/assets/locales/{en,es,fr,ar}/translation.json`

**Example (English)**: `en/translation.json`
```json
{
  "welcome": "Welcome to Sawdust & Scents",
  "shop_now": "Shop Now",
  "cart_count": "You have {{count}} item in your cart",
  "cart_count_plural": "You have {{count}} items in your cart"
}
```

**Example (Arabic)**: `ar/translation.json`
```json
{
  "welcome": "مرحباً بكم في Sawdust & Scents",
  "shop_now": "تسوق الآن",
  "cart_count": "لديك {{count}} منتج في عربتك",
  "cart_count_plural": "لديك {{count}} منتجات في عربتك"
}
```

---

## 5. Handling RTL (Arabic) with Material-UI

Material-UI makes RTL support relatively easy, but it requires a few extra steps.

### Step 5.1: Install RTL Plugins

```bash
npm install stylis stylis-plugin-rtl
```

### Step 5.2: Create the RTL Provider

**File**: `apps/web/src/app/context/ThemeContext.tsx`

```tsx
import { createTheme, ThemeProvider } from '@mui/material/styles';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

// Create caches for LTR and RTL
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const cacheLtr = createCache({
  key: 'mui',
});

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    // Update the document direction and language
    document.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRtl]);

  const theme = createTheme({
    direction: isRtl ? 'rtl' : 'ltr',
    palette: {
      primary: { main: '#5d4037' },
    },
    // For Arabic, you might want to use a different font
    typography: {
      fontFamily: isRtl ? '"Cairo", "Roboto", sans-serif' : '"Roboto", sans-serif',
    },
  });

  return (
    <CacheProvider value={isRtl ? cacheRtl : cacheLtr}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
};
```

---

## 6. Using Translations in Components

### Method 1: The `useTranslation` Hook (Recommended)

```tsx
import { useTranslation } from 'react-i18next';

export function WelcomeComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button>{t('shop_now')}</button>
      <p>{t('cart_count', { count: 5 })}</p>
    </div>
  );
}
```

### Method 2: The `Trans` Component (for complex HTML)

```tsx
import { Trans } from 'react-i18next';

<Trans i18nKey="terms_link">
  Read our <a href="/terms">Terms of Service</a>.
</Trans>
```

---

## 7. Backend Localization (NestJS)

The backend also needs to be aware of the language, especially for error messages and emails.

### Step 7.1: Language Middleware

**File**: `apps/api/src/modules/common/middleware/language.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LanguageMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Check Accept-Language header
    const lang = req.headers['accept-language']?.split(',')[0] || 'en';
    req['language'] = lang;
    next();
  }
}
```

### Step 7.2: Using Language in Services

```typescript
@Injectable()
export class OrdersService {
  async notifyCustomer(order: Order, lang: string) {
    const message = lang === 'ar' ? 'شكراً لطلبك' : 'Thank you for your order';
    // Send email...
  }
}
```

---

## 8. Best Practices for i18n

### 8.1 Avoid Concatenation

**Bad**: `<span>{t('you_have')} {count} {t('items')}</span>`  
**Good**: `<span>{t('cart_summary', { count })}</span>`

### 8.2 Use Logical Properties in CSS

Instead of `margin-left`, use `margin-inline-start`.  
Instead of `padding-right`, use `padding-inline-end`.  
This ensures spacing flips automatically for Arabic!

### 8.3 Externalize All Strings

Never hardcode text in your components. If you see `"Submit"`, move it to `translation.json`.

### 8.4 Test with "Pseudolocalization"

Replace all characters with accented versions (e.g., `Wéllcômé`) to ensure your layout doesn't break when strings are longer.

---

## 9. Verification & Learning Check

### 9.1 The "Flip" Test

1. **Switch to Arabic**: Use a language switcher in your app.
2. **Observe**:
   - Does the text align to the right?
   - Does the sidebar move to the right side of the screen?
   - Do the "Back" arrows point the other way?
3. **The Lesson**: RTL is more than just translating words; it's about mirroring the user experience.

### 9.2 The "Plural" Test

1. **Test 0 items**: Should say "You have 0 items".
2. **Test 1 item**: Should say "You have 1 item".
3. **The Lesson**: Proper i18n handles grammar rules, not just dictionary lookups.

---

## 10. Checklist for Success

- [ ] **Library Installed**: `react-i18next` and `i18next` are in `package.json`.
- [ ] **Config Setup**: `i18n/config.ts` is initialized.
- [ ] **Translation Files**: JSON files exist for all 4 languages.
- [ ] **RTL Support**: `stylis-plugin-rtl` is configured with MUI.
- [ ] **Language Switcher**: User can change language in the UI.
- [ ] **Detection**: App remembers the user's language choice.
- [ ] **Typography**: Arabic font (like Cairo) is applied for `ar` locale.

---

## 11. Vocabulary Breakdown

- **i18n (Internationalization)**: Enabling multiple languages technically.
- **l10n (Localization)**: Providing specific content for a region.
- **RTL (Right-to-Left)**: Writing system used in Arabic.
- **Namespace (ns)**: Dividing translation files into smaller chunks (e.g., `auth.json`, `cart.json`).
- **Interpolation**: Inserting variables into strings (e.g., `{{count}}`).
- **Logical Properties**: CSS properties that adapt to text direction.

---

## 12. Next Steps

Now that your app can speak multiple languages:

1. **Implement Language Switcher**: Add a dropdown in the Navbar.
2. **Translate Core Pages**: Products, Cart, Checkout.
3. **Localized Formatting**: Dates (`2026/01/17`), Currency (`$24.99` vs `24,99 €`).
4. **Move to Step 25**: Implement Product Catalog Features.

**Congratulations!** Your storefront is now ready for a global audience! 🌍✈️
