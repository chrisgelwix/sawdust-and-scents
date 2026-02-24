# Step 22b: Navigation Header & Layout Components

## 1. The "Why" Behind This Step: The Storefront Window

A customer's first impression of a store is its window. In e-commerce, that window is the **navigation header**. It needs to answer three questions instantly:

1. **"Who are you?"** — The Logo
2. **"What do you sell?"** — The Category Navigation
3. **"How do I find what I want?"** — The Search Bar

Looking at the screenshot from CandleScience — one of our target competitors — we can see a pattern that every professional e-commerce site uses:

| Zone | Component | Purpose |
|---|---|---|
| Top strip | `AnnouncementBanner` | Promotions, shipping thresholds |
| Middle row | `Logo` + `SearchBar` + `HeaderActions` | Brand identity, discovery, account |
| Bottom row | `CategoryNav` | Shop navigation |

**The Strategy**: We don't build one massive `<AppBar>` and dump everything in it. We build **small, focused components** and compose them together inside a `SiteHeader`. This follows the same pattern as the successful e-commerce sites we are modelling — and it makes each piece easy to test, style, and reuse.

---

## 2. Component Architecture Plan

Before writing a single line of code, we map out what we are building and why it is split this way.

```
SiteHeader (container)
├── AnnouncementBanner    ← promotional strip at the very top
└── AppBar (MUI)
    ├── Toolbar: Top Row
    │   ├── Logo             ← brand icon + "sawdust & scents" text
    │   ├── SearchBar        ← pill-shaped search input
    │   └── HeaderActions    ← Rewards | Help | Account | Cart
    └── Toolbar: Category Row
        └── CategoryNav      ← Wood Signs | Candles | Gift Sets | ...
```

### 2.1 Why Multiple Components Instead of One?

| Concern | One Big Component | Split Components |
|---|---|---|
| Reading the code | Hard — 300 lines of mixed logic | Easy — each file has one job |
| Testing | Must test everything at once | Test each piece in isolation |
| Reuse | Impossible | `SearchBar` can be reused on mobile |
| Future changes | "Don't touch it, it'll break" | Swap `CategoryNav` for a Mega-menu |

---

## 3. Folder Structure

Create this folder structure inside `apps/web/src/app/`:

```
apps/web/src/app/
└── components/
    └── layout/
        ├── AnnouncementBanner.tsx
        ├── Logo.tsx
        ├── SearchBar.tsx
        ├── HeaderActions.tsx
        ├── CategoryNav.tsx
        └── SiteHeader.tsx
```

> **The Rule**: All layout-level components (things that appear on every page) live in `components/layout/`. Page-specific components will live in `components/pages/` later.

---

## 4. Step-by-Step Implementation

### Step 4.1: AnnouncementBanner

**Purpose**: A thin strip above the header that shows a rotating promotion (e.g., "Free shipping on orders over $75!"). This is the first thing a customer sees.

File: `apps/web/src/app/components/layout/AnnouncementBanner.tsx`

```tsx
import { Box, Typography, Button } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface AnnouncementBannerProps {
  message: string;
  ctaText?: string;
  ctaHref?: string;
}

export const AnnouncementBanner = ({
  message,
  ctaText,
  ctaHref,
}: AnnouncementBannerProps) => {
  return (
    <Box
      sx={{
        bgcolor: '#e0f2f1',        // Soft teal — eye-catching but not aggressive
        px: 3,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="body2" sx={{ color: '#00695c', fontWeight: 500 }}>
        {message}
      </Typography>

      {ctaText && ctaHref && (
        <Button
          href={ctaHref}
          variant="contained"
          size="small"
          endIcon={<ChevronRightIcon />}
          sx={{
            bgcolor: '#00695c',
            borderRadius: '20px',        // Pill shape — matches the screenshot
            textTransform: 'none',
            '&:hover': { bgcolor: '#004d40' },
          }}
        >
          {ctaText}
        </Button>
      )}
    </Box>
  );
};
```

**Key Decisions**:
- `interface AnnouncementBannerProps` — We define exactly what data this component needs. `ctaText` and `ctaHref` are optional (`?`) because sometimes you just want a text-only banner.
- The teal color is intentional — it creates a visual break from the white header below, drawing the eye upward.

---

### Step 4.2: Logo

**Purpose**: Display the brand icon (a stylized "S&S" square) and the brand name. This is what customers bookmark in their memory.

File: `apps/web/src/app/components/layout/Logo.tsx`

```tsx
import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export const Logo = () => {
  return (
    <Box
      component={Link}
      to="/"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        textDecoration: 'none',   // Remove the default link underline
        mr: 4,                     // Push the search bar away from the logo
        flexShrink: 0,             // Never let the logo shrink or wrap
      }}
    >
      {/* Brand Icon — the "S&S" square */}
      <Box
        sx={{
          width: 48,
          height: 48,
          bgcolor: '#5d4037',        // Wood Brown — our primary brand color
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="h6"
          sx={{ color: '#ffb74d', fontWeight: 900, letterSpacing: '-1px' }}
        >
          S&S
        </Typography>
      </Box>

      {/* Brand Name Text */}
      <Box>
        <Typography
          variant="h6"
          sx={{
            color: '#3e2723',
            fontWeight: 400,
            lineHeight: 1,
          }}
        >
          <Box component="span" sx={{ fontWeight: 700 }}>sawdust</Box>
          {' & '}
          <Box component="span" sx={{ fontWeight: 700 }}>scents</Box>
        </Typography>
      </Box>
    </Box>
  );
};
```

**Key Decisions**:
- `component={Link}` — MUI's `Box` accepts a `component` prop, turning it into any HTML element or React Router component. This means our logo is a `<a>` tag pointing to `/` under the hood — correct for SEO.
- `flexShrink: 0` — Prevents the logo from being crushed on smaller screens. The logo is identity; it must never be compromised.

---

### Step 4.3: SearchBar

**Purpose**: Allow customers to find products by typing. Visually, it is the widest element in the header, occupying the center space.

File: `apps/web/src/app/components/layout/SearchBar.tsx`

```tsx
import { useState } from 'react';
import { InputBase, Box, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Box
      sx={{
        flexGrow: 1,               // Grow to fill available center space
        maxWidth: 600,             // Cap width so it doesn't touch the edges
        mx: 'auto',                // Center it horizontally
        bgcolor: '#f0f0f0',
        borderRadius: '24px',      // Pill shape — matches the screenshot
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 0.5,
      }}
    >
      <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
      <InputBase
        fullWidth
        placeholder="Search wood signs, candles, gift sets..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{ fontSize: '0.95rem' }}
      />
      {query && (
        <IconButton size="small" onClick={handleSearch} aria-label="search">
          <SearchIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};
```

**Key Decisions**:
- `flexGrow: 1` — This is how the search bar expands to fill the space between the logo and the action icons. It's the same CSS technique the screenshot uses.
- `encodeURIComponent` — Safely encodes special characters in the search term before putting it in the URL (e.g., "wood & scents" becomes "wood%20%26%20scents"). Never trust raw user input in a URL.
- `InputBase` over `TextField` — `InputBase` gives us a bare input with no border, letting us style the surrounding `Box` as the "field". This is the correct MUI pattern for custom-styled search bars.

---

### Step 4.4: HeaderActions

**Purpose**: The right-side action icons — Rewards, Help, Account (connected to Keycloak auth state), and a Cart with an item count badge.

File: `apps/web/src/app/components/layout/HeaderActions.tsx`

```tsx
import { Box, IconButton, Typography, Badge, Button } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

interface HeaderActionsProps {
  cartItemCount?: number;
}

export const HeaderActions = ({ cartItemCount = 0 }: HeaderActionsProps) => {
  const { authenticated, user, login, logout } = useAuth();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        ml: 3,
        flexShrink: 0,             // Never let actions wrap to next line
      }}
    >
      {/* Rewards Link */}
      <Button
        component={Link}
        to="/rewards"
        sx={{ color: 'text.primary', textTransform: 'none', fontWeight: 500 }}
      >
        Rewards
      </Button>

      {/* Help Link */}
      <Button
        component={Link}
        to="/help"
        sx={{ color: 'text.primary', textTransform: 'none', fontWeight: 500 }}
      >
        Help
      </Button>

      {/* Account — shows username when logged in, Login button when not */}
      {authenticated ? (
        <Button
          onClick={logout}
          sx={{ color: 'text.primary', textTransform: 'none', fontWeight: 500 }}
        >
          {user?.given_name ?? 'Account'}
        </Button>
      ) : (
        <Button
          onClick={login}
          sx={{ color: 'text.primary', textTransform: 'none', fontWeight: 500 }}
        >
          Account
        </Button>
      )}

      {/* Cart Icon with item badge */}
      <IconButton component={Link} to="/cart" aria-label="shopping cart">
        <Badge
          badgeContent={cartItemCount}
          color="secondary"
          sx={{
            '& .MuiBadge-badge': {
              bgcolor: '#00695c',
              color: 'white',
            },
          }}
        >
          <ShoppingCartIcon />
        </Badge>
      </IconButton>
    </Box>
  );
};
```

**Key Decisions**:
- `useAuth()` — The `HeaderActions` component subscribes to the authentication context. When the user logs in, `authenticated` becomes `true` and the "Account" button updates to show their first name. No props drilling needed.
- `Badge` — MUI's `Badge` wraps any icon and adds a little number bubble. The `badgeContent` prop will eventually be driven by our cart state (built in Step 30).
- `cartItemCount = 0` — Default prop value. If no cart state exists yet, the badge shows nothing (0 hides the badge automatically in MUI).

---

### Step 4.5: CategoryNav

**Purpose**: A horizontal row of product category links. This is the "department directory" of the store — the fastest way for a browsing customer to orient themselves.

File: `apps/web/src/app/components/layout/CategoryNav.tsx`

```tsx
import { Box, Button } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

const CATEGORIES = [
  { label: 'Wood Signs',      href: '/products?category=wood-signs' },
  { label: 'Candles',         href: '/products?category=candles' },
  { label: 'Gift Sets',       href: '/products?category=gift-sets' },
  { label: 'Custom Orders',   href: '/products?category=custom' },
  { label: 'Home Decor',      href: '/products?category=home-decor' },
  { label: 'New Arrivals',    href: '/products?category=new-arrivals' },
  { label: 'Sale',            href: '/products?category=sale' },
];

export const CategoryNav = () => {
  const { pathname, search } = useLocation();
  const currentPath = pathname + search;

  return (
    <Box
      component="nav"
      aria-label="Product categories"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 2,
        borderTop: '1px solid',
        borderColor: 'divider',     // MUI's built-in divider color — adapts to dark mode
        overflowX: 'auto',          // Scroll horizontally on small screens
        '&::-webkit-scrollbar': { display: 'none' },  // Hide scrollbar but keep scroll
      }}
    >
      {CATEGORIES.map((cat) => {
        const isActive = currentPath === cat.href;
        return (
          <Button
            key={cat.href}
            component={Link}
            to={cat.href}
            sx={{
              color: isActive ? 'primary.main' : 'text.primary',
              fontWeight: isActive ? 700 : 500,
              textTransform: 'none',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',  // Never let a category label line-break
              borderBottom: isActive ? '2px solid' : '2px solid transparent',
              borderColor: isActive ? 'primary.main' : 'transparent',
              borderRadius: 0,
              py: 1.5,
            }}
          >
            {cat.label}
          </Button>
        );
      })}
    </Box>
  );
};
```

**Key Decisions**:
- `CATEGORIES` array — All the navigation links live in one array at the top of the file. Adding a new category is a one-line change. No digging through JSX.
- `useLocation()` — We compare the current URL to each category's `href` to apply the active underline style. This is the correct React Router pattern.
- `whiteSpace: 'nowrap'` — Category labels like "Custom Orders" must never word-wrap. They would become unreadable.
- `component="nav"` + `aria-label` — Semantic HTML and ARIA labelling. Screen readers will announce "Product categories navigation" to visually impaired users.

---

### Step 4.6: SiteHeader (The Composer)

**Purpose**: This is not a "dumb" component that renders UI — it is a **Composer**. Its only job is to import the five pieces above and arrange them in the correct order. Think of it as the conductor of an orchestra.

File: `apps/web/src/app/components/layout/SiteHeader.tsx`

```tsx
import { AppBar, Box, Toolbar } from '@mui/material';
import { AnnouncementBanner } from './AnnouncementBanner';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { HeaderActions } from './HeaderActions';
import { CategoryNav } from './CategoryNav';

export const SiteHeader = () => {
  return (
    <Box component="header">
      {/* Zone 1: Announcement strip */}
      <AnnouncementBanner
        message="Free shipping on orders over $75! 🕯️"
        ctaText="Shop Now"
        ctaHref="/products"
      />

      {/* Zone 2: Main header — Logo + Search + Actions */}
      <AppBar
        position="sticky"          // Sticks to the top as you scroll
        elevation={0}
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          top: 0,
        }}
      >
        <Toolbar sx={{ gap: 2, py: 1 }}>
          <Logo />
          <SearchBar />
          <HeaderActions cartItemCount={0} />
        </Toolbar>

        {/* Zone 3: Category navigation row */}
        <CategoryNav />
      </AppBar>
    </Box>
  );
};
```

**Key Decisions**:
- `position="sticky"` — The header "sticks" to the top of the viewport as the user scrolls down the product list. This is standard e-commerce UX. `position="static"` would scroll away with the page.
- `elevation={0}` + manual `borderBottom` — MUI's default `AppBar` has a drop shadow. Our design calls for a clean flat border instead (matching the screenshot).
- `bgcolor: 'white'` — MUI's default `AppBar` uses the theme's `primary` color (Wood Brown). We override it here because our header is white — the category nav is where the brand color shows via the active underline.

---

### Step 4.7: Wire It All Together in app.tsx

Replace the existing `<AppBar>` in `apps/web/src/app/app.tsx` with the new `SiteHeader`:

```tsx
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { SiteHeader } from './components/layout/SiteHeader';

const theme = createTheme({
  palette: {
    primary: { main: '#5d4037' },   // Wood Brown
    secondary: { main: '#ffb74d' }, // Candle Amber
  },
});

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <SiteHeader />
        <Box component="main" sx={{ px: 3, py: 4 }}>
          <Routes>
            <Route path="/" element={<div>Welcome to Sawdust & Scents!</div>} />
            <Route path="/products" element={<div>Product Catalog</div>} />
            <Route path="/cart" element={<div>Shopping Cart</div>} />
            <Route path="/rewards" element={<div>Rewards Program</div>} />
            <Route path="/help" element={<div>Help Center</div>} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
```

---

## 5. Deep Dive: Code Keyword Breakdown

#### 5.1 `flexGrow: 1` (The Space Distributor)

- **The Logic**: In a `display: flex` row, `flexGrow: 1` says "take all the leftover space." The Logo has a fixed width, the Actions have a fixed width — the `SearchBar` with `flexGrow: 1` takes everything in between. This is exactly how the screenshot achieves the wide, centered search bar.

#### 5.2 `position="sticky"` vs `position="static"` vs `position="fixed"`

| Value | Behavior | Use Case |
|---|---|---|
| `static` | Scrolls with page, disappears at top | Simple pages |
| `sticky` | Stays at top *once* the user scrolls past it | ✅ E-commerce headers |
| `fixed` | Always at top, overlaps content | Floating action buttons |

#### 5.3 `component` Prop (MUI's Superpower)

- **The Logic**: MUI components accept a `component` prop that changes the underlying HTML tag without changing the styles. `<Box component={Link}>` renders as a React Router `<Link>` (and therefore an `<a>` tag) but keeps all MUI Box styling. This is how we get a styled, accessible, navigating logo without any hacks.

#### 5.4 `Badge` (Composition Pattern)

- **The Logic**: `Badge` is a "wrapper" component. It doesn't have its own appearance — it attaches a small status indicator to whatever you wrap it around. `<Badge badgeContent={3}><CartIcon /></Badge>` is the standard MUI pattern for notification counts.

#### 5.5 `useLocation()` (Active State)

- **The Logic**: React Router's `useLocation()` hook returns the current URL. By comparing `currentPath === cat.href`, we can highlight whichever category the user is currently browsing. This is purely presentational — no state, no side effects, no API calls.

---

## 6. Verification & Learning Check

### 6.1 The Visual Test

1. Start the web app: `npx nx serve web`
2. Visit `http://localhost:4200`
3. **What you should see** (top to bottom):
   - ✅ A soft teal announcement bar with a "Shop Now" pill button
   - ✅ A white header row: brown "S&S" logo | wide pill search bar | text action links | cart icon
   - ✅ A row of category links with a brown underline on the active one
   - ✅ Header sticks to the top as you scroll down

### 6.2 The Interaction Test

| Action | Expected Result |
|---|---|
| Click the logo | Navigates to `/` |
| Type in the search bar and press Enter | Navigates to `/products?search=your+query` |
| Click "Candles" in the category nav | Navigates to `/products?category=candles` and "Candles" gets the active underline |
| Click "Account" (not logged in) | Triggers Keycloak login redirect |
| After login, check "Account" button | Shows your first name |

### 6.3 The Checklist

- [ ] **Folder structure**: Does `components/layout/` exist with all 6 files?
- [ ] **Logo**: Does clicking it go to `/`?
- [ ] **Search**: Does pressing Enter navigate with the search query in the URL?
- [ ] **Active category**: Does the active category get an underline?
- [ ] **Auth integration**: Does the Account button change based on login state?
- [ ] **Sticky header**: Does the header stay at the top when you scroll?
- [ ] **app.tsx**: Has the old inline `<AppBar>` been replaced with `<SiteHeader />`?

---

## 7. What We Learned

| Concept | Applied Where |
|---|---|
| Component Composition | `SiteHeader` assembles 5 focused pieces |
| CSS Flexbox (`flexGrow`) | `SearchBar` expands to fill center space |
| MUI `component` prop | Logo and buttons navigate via React Router |
| React Router `useLocation` | Category active state detection |
| Context API (`useAuth`) | `HeaderActions` reads auth state without props |
| Semantic HTML (`<nav>`, `aria-label`) | `CategoryNav` is accessible to screen readers |
| Prop Defaults | `cartItemCount = 0` handles missing cart state |

**Moving Forward**: The storefront now has a professional face. Next, we integrate **Keycloak** into the header so the Account button is fully wired to our authentication system.
