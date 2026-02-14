# Step 26: Search, Filtering, and Sorting

## 1. The "Why" Behind This Step: Helping Customers Find What They Want

A store with hundreds of products can be overwhelming. **Search, Filtering, and Sorting** are the navigation tools that help a customer go from "I'm just browsing" to "I want *this* specific lavender candle."

**The Strategy**: We'll implement a state-driven filtering system that communicates with our backend query parameters.
- **The Analogy**: Imagine walking into a department store and asking the clerk, "Show me all candles (Filter) under $20 (Filter), sorted by newest (Sort)."
- **The Logic**: We'll use a **Search Bar**, a **Filter Sidebar**, and a **Sort Dropdown** to update the URL parameters, which in turn triggers a new API request.

---

## 2. Core Concepts & Definitions

### 2.1 Query Parameters
- **Definition**: The part of a URL after the `?` (e.g., `/products?category=candle&sort=price_asc`).
- **The Logic**: This is the standard way to send filter instructions to an API.

### 2.2 Debouncing
- **Definition**: Waiting for a short pause (e.g., 300ms) after the user stops typing before actually performing a search.
- **The Logic**: This prevents the app from sending 20 API requests while the user types "Lavender." It sends just one when they finish.

### 2.3 URL as State
- **Definition**: Storing the current filters in the URL instead of just in React memory.
- **The Logic**: This allows users to bookmark a filtered view or share a link like "Look at all these blue signs!"

---

## 3. Prerequisites

Before proceeding, ensure you have:
- ✅ Step 25 - Product Catalog implemented.
- ✅ API updated to handle query params (from Step 11/13e).

---

## 4. Step-by-Step Implementation

### Step 4.1: The Search Bar Component

**File**: `apps/web/src/app/components/Filters/SearchBar.tsx`

```tsx
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useState, useEffect } from 'react';

export function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value), 400); // Debounce
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <TextField
      fullWidth
      placeholder="Search for candles, signs..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
}
```

### Step 4.2: The Filter Sidebar

**File**: `apps/web/src/app/components/Filters/FilterSidebar.tsx`

```tsx
import { Box, Typography, Checkbox, FormControlLabel, Slider, Button } from '@mui/material';

export function FilterSidebar({ onFilterChange }: { onFilterChange: (filters: any) => void }) {
  return (
    <Box sx={{ p: 2, borderRight: '1px solid #ddd', height: '100%' }}>
      <Typography variant="h6" gutterBottom>Categories</Typography>
      {['Candle', 'Sign', 'Decor'].map(cat => (
        <FormControlLabel
          key={cat}
          control={<Checkbox onChange={(e) => onFilterChange({ category: cat, active: e.target.checked })} />}
          label={cat}
        />
      ))}
      
      <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>Price Range</Typography>
      <Slider
        defaultValue={[0, 100]}
        valueLabelDisplay="auto"
        onChangeCommitted={(_, val) => onFilterChange({ priceRange: val })}
      />

      <Button fullWidth variant="outlined" sx={{ mt: 4 }}>Clear All</Button>
    </Box>
  );
}
```

---

## 5. Verification & Learning Check

### 5.1 The "Zero Results" Test
1. Type something gibberish into your search bar (e.g., "xyz789").
2. **The Lesson**: If your app displays a friendly "No products match your search" message instead of a blank white screen, your error/empty state handling is correct.

---

## 6. Checklist for Success
- [ ] **Debouncing**: Does the search wait until you stop typing?
- [ ] **URL Sync**: When you filter for "Candles," does the URL change to `?category=Candle`?
- [ ] **Combined Filters**: Can you search for "Lavender" AND filter for "Under $30" at the same time?

---

**Moving Forward**: Now that customers can find products, they need a place to store them before buying. Next is the **Shopping Cart**.
