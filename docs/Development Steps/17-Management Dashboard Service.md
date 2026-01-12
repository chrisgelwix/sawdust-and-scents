# Step 17: Management Dashboard Service

## 1. The "Why" Behind This Step: The Data Weaver

The Management Controller (Step 15) is the "Front Door," but the **Management Dashboard Service** is the "Office" where all the actual work happens. It is the bridge that weaves together PostgreSQL, MongoDB, and external APIs.

**The Concept**: Business intelligence requires data from everywhere.
- **SQL** knows the total revenue.
- **NoSQL** knows which items are selling out.
- **ADP** knows if we have enough staff to fulfill the orders.

---

## 2. Core Concepts & Definitions

#### 2.1 Cross-Database Join (Application Level)

- **Definition**: Combining data from two different databases inside your code.
- **The Logic**: Because Postgres and Mongo can't talk to each other directly, our NestJS service acts as the "Middleman." It fetches the list of orders from Postgres, then fetches the product names from Mongo, and merges them into one list.

#### 2.2 Threshold Logic (The Alarm)

- **The Logic**: Every product in our MongoDB has a `lowStockThreshold`. The service's job is to scan the catalog and find anything where `quantity < threshold`.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Management Service

Create `apps/api/src/modules/management/management.service.ts`.

```typescript
import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { HRService } from './hr.service';

@Injectable()
export class ManagementService {
  constructor(
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private hrService: HRService
  ) {}

  async getOverview() {
    // Aggregating data from multiple sources
    const [orders, products] = await Promise.all([
      this.ordersService.findAll(),
      this.productsService.findAll()
    ]);

    return {
      totalSales: orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
      orderCount: orders.length,
      productCount: products.length,
      lowStockAlerts: products.filter(p => (p.attributes['stock'] as number) < 5).length
    };
  }

  async getLowStockAlerts() {
    const products = await this.productsService.findAll();
    return products.filter(p => (p.attributes['stock'] as number) < 5);
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `Promise.all([ ... ])`

- **The Logic**: Efficiency is key! Instead of waiting for Postgres to finish, THEN starting Mongo, `Promise.all` starts both requests at the same time. This cuts the dashboard loading time in half.

#### 4.2 `orders.reduce(...)`

- **The Logic**: We use `reduce` to sum up the `totalAmount` of all orders. 
- **Pro Tip**: Always use `Number(o.totalAmount)` because SQL "Decimal" fields often come back as strings to prevent rounding errors.

---

## 5. Verification & Learning Check

### 5.1 The Logic Check

1.  **Mock Data**: Ensure you have at least 2 orders in Postgres and 2 products in Mongo.
2.  **Verify**: Run the `getOverview()` logic via Swagger.
3.  **The Lesson**: If the `totalSales` math is correct, your "Data Weaver" is successfully performing application-level joins.

### 6. Checklist for Success

- [ ] **Constructor**: Did you inject all 3 necessary services?
- [ ] **Async**: Are you using `Promise.all` for performance?
- [ ] **Math**: Are you handling the conversion of SQL strings to numbers?

**Moving Forward**: The business brain is complete. Now let's build the **Chatbot Service** logic to make Rowan more than just a simple responder.



