# Step 14: Admin API Endpoints

## 1. The "Why" Behind This Step: The Control Center

Every professional e-commerce platform needs a "Back Office." While customers use the main site, the owners of **Sawdust and Scents** need dedicated endpoints to oversee the entire operation. 

**The Strategy**: We create **Admin Endpoints** that provide high-level access to products, orders, and external data (like ADP).
- **The Concept**: This is about **Global Visibility**. Administrators don't look at one order; they look at *all* orders. They don't look at one worker; they look at the entire *HR system*.

---

## 2. Core Concepts & Definitions

#### 2.0 Keycloak Pre-requisites (Admin Role)
As defined in **Step 06b**, the endpoints in this module are protected by the highest level of security:
- **Role Created**: `admin` must exist in Keycloak.
- **User Assigned**: Your test account must have the `admin` role assigned in the **Role Mapping** tab.
- **The Concept**: This ensures that even a standard worker cannot access sensitive HR or system-wide order summaries.

#### 2.1 API Versioning & Prefixes

- **The Logic**: We use the `/admin` prefix to separate management logic from public logic. This allows us to apply different security rules (like "Admin-Only") to an entire group of URLs at once.

#### 2.2 Data Aggregation

- **The Logic**: Admin endpoints often need to pull data from multiple places (Postgres, Mongo, and APIs) and "Flatten" them into a single report. 

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Admin Controller

Create `apps/api/src/modules/management/admin.controller.ts`. 

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { HRService } from './hr.service';

@Controller('admin')
@Roles({ roles: ['realm:admin'] }) // Only users with 'admin' role can enter
export class AdminController {
  constructor(
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private hrService: HRService
  ) {}

  @Get('orders/summary')
  async getOrderSummary() {
    // Logic to get all orders across the system
    return this.ordersService.findAll();
  }

  @Get('inventory/health')
  async getInventoryHealth() {
    // Logic to see which products are low or out of stock
    return this.productsService.findAll(); 
  }

  @Get('hr/sync')
  async syncWithADP() {
    // Trigger a sync with the ADP API
    return this.hrService.syncEmployees();
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `@Roles({ roles: ['realm:admin'] })`

- **The Logic**: By placing this at the **Class Level** (above the class name), it automatically protects *every single method* inside this controller. You don't have to remember to protect each one individually.

#### 4.2 Cross-Service Injection

- **The Logic**: The `AdminController` is a "Super-Consumer." It injects services from the Orders module, Products module, and Management module. This is the beauty of NestJS—modules can share services as long as they are exported correctly.

---

## 5. Verification & Learning Check

### 5.1 The "Forbidden" Test

1.  **Login as a Customer**: Get a JWT for a standard user.
2.  **Try Access**: Navigate to `http://localhost:3000/api/admin/orders/summary`.
3.  **Result**: You should get a **403 Forbidden**.
4.  **The Lesson**: This proves your "Admin Shield" is working. Even though the user is "Authenticated" (logged in), they are not "Authorized" (admin role) to see this data.

### 6. Checklist for Success

- [ ] **Shield**: Is the controller protected by the `realm:admin` role?
- [ ] **Imports**: Did you import `OrdersModule` and `ProductsModule` into your `ManagementModule`?
- [ ] **Endpoints**: Do you have routes for Orders, Inventory, and HR?

**Moving Forward**: We have the raw admin data. Now we need a specific "Dashboard" view that provides the quick stats for the managers. We'll build the **Management Dashboard Endpoints** next.

