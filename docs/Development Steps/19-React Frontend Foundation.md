# Step 19: React Frontend Foundation

## 1. The "Why" Behind This Step: The Face of the Business

Everything we've built so far—the databases, the security, the shipping—is invisible to the customer. The **React Frontend** is the "Storefront." This is where the beautiful wood signs and scented candles are displayed to the world.

**The Strategy**: We use **React** with **Vite** and **Material-UI (MUI)**.
- **Vite**: The "Speed Demon" of build tools. It makes the developer experience incredibly fast.
- **MUI**: A world-class UI library. Instead of building buttons and menus from scratch, we use pre-designed components that look professional and work on mobile instantly.

---

## 2. Core Concepts & Definitions

#### 2.1 SPA (Single Page Application)

- **Definition**: A website that loads only once. When you click a link, the page doesn't refresh; React just swaps out the middle part of the screen. This makes the site feel as fast as a mobile app.

#### 2.2 Component-Based Architecture

- **The Logic**: Everything in React is a "Component" (a Lego brick). A `ProductCard` is a brick. A `Navbar` is a brick. You build your pages by snapping these bricks together.

---

## 3. Step-by-Step Implementation

### Step 3.1: Initialize the React App

Run the Nx generator to set up the web project if you haven't already.

```bash
npx nx generate @nx/react:application apps/web --routing --style=css --no-interactive
```

### Step 3.2: Install UI Libraries

We need MUI and its icons.

```bash
# @mui/material: The core UI components
# @emotion/react: The engine that handles CSS-in-JS
# @mui/icons-material: Thousands of free icons (Cart, User, etc.)
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

### Step 3.3: Set up the App Entry Point

Update `apps/web/src/app/app.tsx`.

```tsx
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Route, Routes } from 'react-router-dom';

// Create a custom theme for Sawdust & Scents
const theme = createTheme({
  palette: {
    primary: { main: '#5d4037' }, // Wood Brown
    secondary: { main: '#ffb74d' }, // Candle Amber
  },
});

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Resets default browser styles */}
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <Routes>
          <Route path="/" element={<div>Welcome to Sawdust & Scents!</div>} />
          <Route path="/products" element={<div>Product Catalog</div>} />
        </Routes>
      </Box>
    </ThemeProvider>
  );
}

export default App;
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `ThemeProvider`

- **The Logic**: It wraps your whole app in a "Style Blanket." Every MUI button or menu inside this blanket will automatically know to use the "Wood Brown" color we defined.

#### 4.2 `CssBaseline`

- **The Logic**: Every browser (Chrome, Safari, Firefox) has slightly different default margins and fonts. `CssBaseline` "levels the playing field," making your app look identical on every device.

#### 4.3 `sx={{ ... }}`

- **The Logic**: This is MUI's "Super CSS" property. It allows you to write styles directly inside your HTML-like code without creating separate `.css` files.

---

## 5. Verification & Learning Check

### 5.1 The "Brown" Test

1.  **Start the Web App**: `npx nx serve web`.
2.  **Visit**: `http://localhost:4200`.
3.  **The Lesson**: If the background isn't pure white and you see your welcome text, the `ThemeProvider` and `CssBaseline` are working correctly.

### 6. Checklist for Success

- [ ] **MUI**: Are the material libraries installed?
- [ ] **Theme**: Is your custom theme applied at the root?
- [ ] **Routing**: Does `/products` show different text than `/`?

**Moving Forward**: The storefront is open! Now we need to hire the bouncer for the front door. We'll integrate **Keycloak** into the frontend next.

