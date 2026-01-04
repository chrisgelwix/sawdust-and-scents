# Step 09: Cart and Checkout Services

## 1. The "Why" Behind This Step: The Master Orchestrator

Until now, we have built separate "Silos" for our data:
- **Users & Orders** live in the structured world of **PostgreSQL**.
- **Products** live in the flexible world of **MongoDB**.

In a real-world application, these silos need to talk to each other. When a user clicks "Checkout," the system must perform a complex dance:
1.  **Check the Cart**: What does the user want to buy?
2.  **Verify the Product**: Does this product still exist in MongoDB? Is it active?
3.  **Calculate the Price**: Don't trust the price sent from the frontend! Calculate it yourself using the database records.
4.  **Create the Order**: Save the final transaction in PostgreSQL.
5.  **Clear the Cart**: The transaction is done.

The **Cart and Checkout** services are the "Master Orchestrator" (or the Head Chef) that coordinates all these different parts into a single, successful operation.

---

## 2. Core Concepts & Definitions

#### 2.1 Transient vs. Persistent State

- **Transient State (The Cart)**: A shopping cart is temporary. In this guide, we store the cart in memory (using a `Map`). In a larger app, you might use **Redis** (a fast, temporary database). If the server restarts, the cart is lost, which is acceptable for this stage of learning.
- **Persistent State (The Order)**: Once a user buys something, it must be saved forever. This is why the final Order is moved to **PostgreSQL**.

#### 2.2 Cross-Module Dependency Injection

- **The Concept**: This is the first time one of our services will "borrow" tools from multiple other modules. Our `CheckoutService` will depend on `ProductsService` (MongoDB) and `OrdersService` (Postgres).

#### 2.3 Financial Precision (The `reduce` method)

- **The Logic**: In e-commerce, you never want to do math one item at a time if you can avoid it. We use the JavaScript `.reduce()` method to transform a list of items into a single, accurate total amount.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Cart Service

Create `apps/api/src/modules/cart/cart.service.ts`. This service manages the "in-memory" shopping list for each user.

```typescript
import { Injectable } from '@nestjs/common';
import { CartItem } from '@sdas/shared-types';

@Injectable()
export class CartService {
  // We use a Map as a temporary 'In-Memory' database.
  // The Key is the UserId, the Value is the array of items.
  private carts: Map<string, CartItem[]> = new Map();

  async getCart(userId: string): Promise<CartItem[]> {
    return this.carts.get(userId) || [];
  }

  async addToCart(userId: string, item: CartItem): Promise<CartItem[]> {
    const cart = await this.getCart(userId);
    const existing = cart.find((i) => i.productId === item.productId);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push(item);
    }

    this.carts.set(userId, cart);
    return cart;
  }

  async clearCart(userId: string): Promise<void> {
    this.carts.delete(userId);
  }
}
```

### Step 3.2: Create the Checkout Service

This is our Orchestrator. Create `apps/api/src/modules/cart/checkout.service.ts`.

**Important**: This service depends on `ProductsService` and `OrdersService`. If you haven't created a basic `OrdersService` in Step 07, you will need one now that can save orders to the database.

```typescript
import { 
  Injectable, 
  BadRequestException, 
  NotFoundException 
} from '@nestjs/common';
import { CartService } from './cart.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { Order, OrderStatus } from '@sdas/shared-types';

@Injectable()
export class CheckoutService {
  constructor(
    private cartService: CartService,
    private productsService: ProductsService,
    private ordersService: OrdersService
  ) {}

  async checkout(userId: string): Promise<Order> {
    // 1. Get the items from the user's cart
    const cartItems = await this.cartService.getCart(userId);
    if (cartItems.length === 0) {
      throw new BadRequestException('Cannot checkout with an empty cart');
    }

    // 2. Validate prices and existence from MongoDB
    const validatedItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await this.productsService.findOne(item.productId);
        if (!product || !product.isActive) {
          throw new NotFoundException(`Product ${item.productId} no longer available`);
        }
        return {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: item.quantity,
        };
      })
    );

    // 3. Calculate total securely
    const totalAmount = validatedItems.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );

    // 4. Save to PostgreSQL via the OrdersService
    const order = await this.ordersService.create({
      userId,
      items: validatedItems,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    // 5. Success! Clear the cart
    await this.cartService.clearCart(userId);

    return order;
  }
}
```

### Step 3.3: Configure the Cart Module

Update `apps/api/src/modules/cart/cart.module.ts`. Because we are using services from other modules, we must import those modules here.

```typescript
import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ProductsModule, // Gives us access to ProductsService
    OrdersModule,   // Gives us access to OrdersService
  ],
  providers: [CartService, CheckoutService],
  exports: [CartService, CheckoutService],
})
export class CartModule {}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `private carts: Map<string, CartItem[]>`

- **Definition**: A `Map` is a collection of keyed data items, similar to an Object.
- **The Logic**: It's much faster than an array for lookups. Instead of looping through all users to find a cart, we just say `carts.get(userId)` and it finds it instantly.

#### 4.2 `Promise.all()`

- **Definition**: A utility that waits for multiple "IOUs" (Promises) to finish at once.
- **The Logic**: When we validate 10 items in a cart, we don't want to wait for Item 1, THEN Item 2, THEN Item 3. `Promise.all` sends all 10 requests to the database at the same time, making the checkout much faster.

#### 4.3 `reduce()`

- **Definition**: An array method that "folds" a list into a single value.
- **The Logic**: `(sum, item) => sum + (price * qty)`. It starts with a `sum` of `0`. For every item, it adds the subtotal to the `sum` and passes it to the next item. At the end, you have one final number.

#### 4.4 `BadRequestException` vs `NotFoundException`

- **The Logic**: These are "Semantic Errors." 
    - Use `BadRequest` when the user did something wrong (like trying to buy nothing).
    - Use `NotFound` when the system can't find something it expected (like a product that was deleted).
- **The Result**: NestJS automatically converts these into the correct HTTP status codes (400 and 404) for the frontend.

---

## 5. Verification & Learning Check

### 5.1 The "Silo" Test

1.  **Run the API**: `npx nx serve api`.
2.  **Logic Check**: Does the `CartModule` successfully import `ProductsModule`? 
    - If you get an error saying `ProductsService not found`, it usually means you forgot to add `ProductsService` to the `exports` array in `products.module.ts`.

### 6. Checklist for Success

- [ ] **Dependencies**: Did you import `ProductsModule` and `OrdersModule` into `CartModule`?
- [ ] **Exceptions**: Did you use `throw new BadRequestException()` for empty carts?
- [ ] **Types**: Are you using `OrderStatus.PENDING` from your shared library?
- [ ] **Memory**: Do you understand that the `Map` in `CartService` will clear if you restart the server?

**Moving Forward**: We have the "Brain" of our store working! Now we need to create the "Front Door" (API Endpoints) so our users can actually call these functions. We'll build the **Authentication Endpoints** next.
