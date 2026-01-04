# Step 11: Product Catalog and Inventory Management

## 1. The "Why" Behind This Step: The Lifeblood of Commerce

An e-commerce store is only as good as what it has in stock. In the previous steps, we built the "Memory" (Schemas) for our products. Now, we are building the **Management Layer** that allows both customers to view products and workers to control them.

**The Strategy**: We use a single **`ProductsController`**. 
- **Customers** can view the catalog (Public access).
*   **Workers** can add or edit products (Protected by Roles).
- This keeps all product-related code in one place, making it easier to maintain.

---

## 2. Core Concepts & Definitions

#### 2.1 Atomic Updates

- **Definition**: An operation that happens completely or not at all.
- **The Logic**: When updating stock levels, we use **Atomic Operations**. Instead of saying `stock = 10`, we say `stock = stock - 1`. This prevents "Race Conditions" where two people buy the last item at the exact same millisecond.

#### 2.2 Role-Based Access Control (RBAC)

- **Definition**: Restricting system access to authorized users based on their role (e.g., 'customer', 'worker', 'admin').
- **The Logic**: In our single controller, we use decorators to say: "Anyone can read, but only workers can write."

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Inventory Service

In `apps/api/src/modules/products/inventory.service.ts`, we handle the math of stock management.

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>
  ) {}

  async updateStock(productId: string, quantityChange: number): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Business Logic: Don't allow negative stock
    const currentStock = (product.attributes['stock'] as number) || 0;
    if (currentStock + quantityChange < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    // Atomic Update in MongoDB using the $inc (Increment) operator
    return this.productModel.findByIdAndUpdate(
      productId,
      { $inc: { 'attributes.stock': quantityChange } },
      { new: true }
    ).exec();
  }
}
```

### Step 3.2: Create the Products Controller (Combined)

Create `apps/api/src/modules/products/products.controller.ts`. This handles both public and worker actions.

```typescript
import { Controller, Post, Body, Put, Param, Get } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from 'nest-keycloak-connect'; // Official role decorator
import { Product } from './schemas/product.schema';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // 1. PUBLIC: Anyone can browse products
  @Public()
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // 2. PROTECTED: Only workers can create/edit
  @Post()
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  create(@Body() productData: Partial<Product>) {
    return this.productsService.create(productData);
  }

  @Put(':id')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  update(@Param('id') id: string, @Body() updateData: Partial<Product>) {
    // Logic for updating product details
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `@Roles({ roles: [...] })`

- **Definition**: A decorator from `nest-keycloak-connect`.
- **The Logic**: This is your "VIP Pass" checker. Even if a user is logged in, if they don't have the 'worker' role in Keycloak, they will get a **403 Forbidden** error when trying to POST a new product.

#### 4.2 `$inc` (The Incrementor)

- **The Logic**: Instead of replacing the whole product document, `$inc` only changes one specific number. This is the **safest** way to handle inventory in a high-traffic store.

#### 4.3 `attributes.stock`

- **The Logic**: Because our MongoDB schema is flexible (using the `attributes` object), we can store stock levels inside that object. This allows us to have different inventory rules for candles (by weight) vs signs (by dimensions).

---

## 5. Verification & Learning Check

### 5.1 The "Two-Role" Test

1.  **As a Customer**: Try to POST a product to `http://localhost:3000/api/products`. You should get a **403 Forbidden**.
2.  **As a Worker**: Log in with a worker account and try the same POST. You should get a **201 Created**.

### 6. Checklist for Success

- [ ] **Controller**: Did you combine public and protected routes in `products.controller.ts`?
- [ ] **RBAC**: Is the `@Roles()` decorator protecting the Create and Update methods?
- [ ] **Atomic**: Is the `InventoryService` using `$inc`?

**Moving Forward**: Inventory is safe. Now we need to get those products to our customers! We'll integrate **Shippo** for shipping and order tracking next.
