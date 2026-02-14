# Step 25: Product Catalog and Detail Pages

## 1. The "Why" Behind This Step: The Visual Catalog

This is the most visited part of your application. The **Product Catalog** is where customers browse your wood signs and candles. It needs to be fast, visually appealing, and informative enough to drive a purchase.

**The Strategy**: We use **Material-UI Grid** for layout and **React Router** for dynamic navigation.
- **The Analogy**: Imagine walking through a physical store. The Catalog is the aisle with all the products on shelves. The Detail Page is when a customer picks up a specific candle to read the label and check the price.
- **The Logic**: We'll build a "Master-Detail" pattern where clicking a product card in the grid navigates to a dedicated page for that item.

---

## 2. Core Concepts & Definitions

### 2.1 Master-Detail Pattern
- **Definition**: A UI pattern where you show a list of items (Master) and clicking one reveals all its details (Detail).

### 2.2 Dynamic Routing
- **Definition**: Using parameters in the URL (e.g., `/products/:id`) to tell the app which specific product to display.

### 2.3 Skeleton Loading
- **Definition**: A grey placeholder that looks like the content while it's still loading from the API.
- **The Logic**: It makes the app feel faster because the layout appears instantly even if the data is a few milliseconds behind.

---

## 3. Prerequisites

Before proceeding, ensure you have:
- ✅ Step 19 - React Frontend Foundation (MUI setup)
- ✅ Step 21 - Storybook (ProductCard component created)
- ✅ API running at `http://localhost:3000`

---

## 4. Step-by-Step Implementation

### Step 4.1: Create the API Client Hook

We'll use a custom hook to fetch products. This keeps our components clean.

**File**: `apps/web/src/app/hooks/useProducts.ts`

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
        setProducts(response.data);
      } catch (err) {
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return { products, loading, error };
}
```

### Step 4.2: Build the Product Grid

**File**: `apps/web/src/app/pages/Products/ProductGrid.tsx`

```tsx
import { Grid, Container, Typography, Box } from '@mui/material';
import { ProductCard } from '../../components/ProductCard/ProductCard';
import { useProducts } from '../../hooks/useProducts';
import { useNavigate } from 'react-router-dom';

export function ProductGrid() {
  const { products, loading, error } = useProducts();
  const navigate = useNavigate();

  if (loading) return <Typography>Loading catalog...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Container sx={{ py: 8 }} maxWidth="lg">
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Our Collection
      </Typography>
      <Grid container spacing={4}>
        {products.map((product) => (
          <Grid item key={product._id} xs={12} sm={6} md={4}>
            <ProductCard
              {...product}
              onViewDetails={() => navigate(`/products/${product._id}`)}
              onAddToCart={() => console.log('Add to cart:', product._id)}
            />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
```

### Step 4.3: Build the Product Detail Page

**File**: `apps/web/src/app/pages/Products/ProductDetail.tsx`

```tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Typography, Button, Box, Chip, Divider } from '@mui/material';
import { useProduct } from '../../hooks/useProduct'; // Similar to useProducts but for one ID

export function ProductDetail() {
  const { id } = useParams();
  const { product, loading } = useProduct(id);
  const navigate = useNavigate();

  if (loading) return <Typography>Loading details...</Typography>;
  if (!product) return <Typography>Product not found</Typography>;

  return (
    <Container sx={{ py: 8 }}>
      <Button onClick={() => navigate(-1)} sx={{ mb: 4 }}>← Back to Catalog</Button>
      <Grid container spacing={6}>
        <Grid item xs={12} md={6}>
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            style={{ width: '100%', borderRadius: '8px' }} 
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="overline" color="text.secondary">
            {product.category}
          </Typography>
          <Typography variant="h2" gutterBottom>{product.name}</Typography>
          <Typography variant="h4" color="primary" sx={{ mb: 2 }}>
            ${product.price.toFixed(2)}
          </Typography>
          <Typography variant="body1" paragraph>
            {product.description}
          </Typography>
          
          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>Specifications</Typography>
            <Divider sx={{ mb: 2 }} />
            {Object.entries(product.attributes).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {key}
                </Typography>
                <Typography variant="body2">{String(value)}</Typography>
              </Box>
            ))}
          </Box>

          <Button 
            variant="contained" 
            size="large" 
            fullWidth 
            disabled={!product.inStock}
          >
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}
```

---

## 5. Deep Dive: Code Keyword Breakdown

### 5.1 `useParams()`
- **The Logic**: It grabs the `:id` portion of the URL. If the URL is `/products/123`, `id` will be `123`.

### 5.2 `Container maxWidth="lg"`
- **The Logic**: Ensures your content doesn't stretch too wide on huge monitors, keeping it centered and readable.

### 5.3 `Grid item xs={12} sm={6} md={4}`
- **The Logic**: This is **Responsive Design**.
  - `xs={12}`: Full width on mobile (1 product per row).
  - `sm={6}`: Half width on tablets (2 products per row).
  - `md={4}`: One-third width on desktops (3 products per row).

---

## 6. Verification & Learning Check

### 6.1 The "Responsiveness" Test
1. Start the app: `nx serve web`.
2. Open your browser's Developer Tools (F12).
3. Switch to Mobile View.
4. **The Lesson**: If your 3-column grid snaps into 1 column on a small screen, your responsive design is working!

---

## 7. Checklist for Success
- [ ] **Data Fetching**: Are products successfully loading from the API?
- [ ] **Routing**: Does clicking a card take you to the correct detail page?
- [ ] **Empty States**: Do you handle "Product not found" gracefully?
- [ ] **MUI Grid**: Is the layout consistent across devices?

---

**Moving Forward**: Now that we can see products, customers need to find them. Next, we'll implement **Search, Filtering, and Sorting**.
