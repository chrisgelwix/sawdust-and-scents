# Step 09: Cart and Checkout Services

## 1. The "Why" Behind This Step: The Orchestrator

Until now, we have built separate "Silos" (Users, Products, Orders). Each is perfect in its own database, but they are isolated. The **Cart and Checkout** step is where we create the **Orchestration Layer**.

This is the most critical logic in your application. It is where you handle the transition from a user "looking" at a product (MongoDB) to "owning" a product (PostgreSQL).

---

## 2. Core Concepts & Definitions

#### 2.1 State Management (Transient vs. Persistent)

- **Transient State (The Cart)**: A shopping cart is temporary. If a user adds an item but never buys it, we don't necessarily need to keep that data forever.

#### 2.2 Orchestration

- **Definition**: A process that coordinates multiple services. During checkout, our `CheckoutService` must talk to MongoDB to verify the product, and PostgreSQL to save the order.

---

## 3. Step-by-Step Implementation

### Step 3.1: Implement the Cart Service

Create `apps/api/src/modules/cart/cart.service.ts`.

```typescript
import { Injectable } from '@nestjs/common';
import { CartItem } from '@sdas/shared-types';

@Injectable()
export class CartService {
  private carts: Map<string, CartItem[]> = new Map();

  async getCart(userId: string): Promise<CartItem[]> {
    return this.carts.get(userId) || [];
  }

  async addToCart(
    userId: string,
    item: CartItem
  ): Promise<CartItem[]> {
    const cart = await this.getCart(userId);
    const existing = cart.find(
      (i) => i.productId === item.productId
    );

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push(item);
    }

    this.carts.set(userId, cart);
    return cart;
  }
}
```

### 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `Map<string, CartItem[]>`

- **Definition**: A built-in JavaScript data structure for storing Key-Value pairs.
- **The Logic**: We use the User's ID (the `string`) as the **Key**, and their list of products (the `CartItem[]`) as the **Value**. This allows us to quickly find the right cart for the right user.

#### 4.2 `reduce` (Used in `calculateTotal`)

- **Definition**: A functional programming method used on arrays.
- **The Logic**: It "reduces" an entire list of products into a single number (the total price). It loops through every item, multiplies its price by its quantity, and adds it to a "running total."

#### 4.3 `BadRequestException` (In the Checkout Service)

- **Definition**: A built-in NestJS error class.
- **The Logic**: Instead of just returning `false` if something goes wrong, you "throw" this exception. NestJS will catch it and automatically send a professional `400 Bad Request` response to the user's browser with your specific error message.

#### 4.4 `constructor` (Dependency Injection)

- **Definition**: The function that runs when a class is created.
- **The Logic**: This is where we "ask" NestJS for the other services we need. By listing `private ordersService: OrdersService` in the constructor, NestJS automatically finds that service and hands it to us so we can use it.

---

## 5. Verification & Learning Check

### 5.1 The Orchestration Flow

Trace the data:

1.  **Input**: User ID from Keycloak.
2.  **Lookup**: Items from `CartService`.
3.  **Validation**: Status from `ProductsService` (MongoDB).
4.  **Output**: New record in `OrdersService` (Postgres).

### 6. Checklist for Success

- [ ] **Cross-Pollination**: Does `CheckoutService` import both `ProductsService` and `OrdersService`?
- [ ] **Math**: Is `calculateTotal` using `reduce` to ensure a single final number?
- [ ] **Cleanup**: Is the cart cleared _after_ the order is saved?

**Moving Forward**: We have the business logic working behind the scenes. Now we need to expose it through the "Front Door": the **Authentication Endpoints**.
