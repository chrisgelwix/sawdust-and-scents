# Step 31c: SEO, Analytics, and Metadata

## 1. The "Why" Behind This Step: The Megaphone

If you build a beautiful store in the middle of a forest and nobody has a map, you won't sell anything. **SEO (Search Engine Optimization)** and **Analytics** are the map and the megaphone that bring customers to your door.

**The Strategy**: We use **React Helmet** for SEO and **GA4** for tracking.
- **The Analogy**: Metadata is the "Signage" on your store. It tells people what's inside before they walk in. Analytics is the "Customer Counter" at the door that tells you how they found you.

---

## 2. Core Concepts & Definitions

### 2.1 Meta Tags
- **Definition**: Small snippets of text that describe a page's content. They don't appear on the page itself, but in the code for Google to read.

### 2.2 Open Graph (OG) Tags
- **The Logic**: These tags control how your site looks when shared on social media (Facebook, Twitter, LinkedIn). They ensure a large product image and clear title appear.

---

## 3. Step-by-Step Implementation

### Step 3.1: Install React Helmet

```bash
npm install react-helmet-async
```

### Step 3.2: Create a Reusable SEO Component

**File**: `apps/web/src/app/components/Common/SEO.tsx`

```tsx
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

export function SEO({ title, description, image, url }: SEOProps) {
  const siteTitle = 'Sawdust & Scents';
  const fullTitle = `${title} | ${siteTitle}`;

  return (
    <Helmet>
      {/* Standard SEO */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Social Media (Open Graph) */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:type" content="website" />
    </Helmet>
  );
}
```

---

## 4. Verification & Learning Check

### 4.1 The "Social Share" Test
1. Use a tool like **Meta's Sharing Debugger**.
2. Paste a link to one of your products.
3. **The Lesson**: If you see your product's photo and title in the preview, your Open Graph tags are working!

---

**Moving Forward**: We are visible and selling. Now we need to ensure the app stays healthy. Our final "Polish" step is **Monitoring and Logging (Step 31d)**.
