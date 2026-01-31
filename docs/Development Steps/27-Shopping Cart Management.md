# Step 27: Shopping Cart Management (Frontend State)

## 1. The "Why" Behind This Step: The Holding Area

The **Shopping Cart** is where intent turns into commitment. It needs to be persistent, easy to update, and always visible. 

**The Strategy**: We'll use **React Context API** or **Zustand** for global state management.
- **The Analogy**: Imagine walking through the store with a physical basket. Every time you pick up an item, you put it in the basket. The basket travels with you to every aisle.
- **The Logic**: We don't want to lose the cart if the user refreshes the page, so we'll sync the state with **LocalStorage**.

---

## 2. Core Concepts & Definitions

### 2.1 Global State
- **Definition**: Data that is accessible from anywhere in the app (like the number of items in the cart).

### 2.2 Persistence
- **Definition**: Saving data so it's still there when you come back. We'll use the browser's `localStorage` to keep the cart "alive" between sessions.

### 2.3 Optimistic Updates
- **Definition**: Instantly updating the UI when a user clicks "Add to Cart," rather than waiting for the backend to say "OK." This makes the app feel lightning-fast.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Cart Context

**File**: `apps/web/src/app/context/CartContext.tsx`

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const CartContext = createContext<any>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product._id);
      if (existing) {
        return prev.map(i => i.id === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: product._id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeItem, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
```

---

## 4. Checklist for Success
- [ ] **Persistence**: Add an item, refresh the page. Is it still there?
- [ ] **Quantities**: Does adding the same item twice show `quantity: 2`?
- [ ] **Calculation**: Is the total price math correct?

---

**Moving Forward**: The cart is full. It's time to pay. Next is the **Checkout Flow**.
