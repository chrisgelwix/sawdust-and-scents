# Step 13a: Implementing Missing Methods for Admin Dashboard

## Overview

Before the Admin Dashboard and ADP HR Integration (Step 13) can be fully functional, we need to implement several missing methods across different services. This document identifies all missing methods and provides their complete implementations.

---

## Prerequisites

Before proceeding with this step, ensure you have completed:

- ✅ Step 11: Product and Inventory Management (base structure)
- ✅ Step 12: Order Fulfillment (base structure)
- ✅ Step 13: ADP Service, Keycloak Admin Service, and HR Service created

---

## Missing Methods Checklist

| Service          | Missing Method            | Purpose                            | Status     |
| ---------------- | ------------------------- | ---------------------------------- | ---------- |
| InventoryService | `getLowStockItems()`      | Get products below stock threshold | ⚠️ Missing |
| OrdersService    | `getPendingOrdersCount()` | Count orders awaiting fulfillment  | ⚠️ Missing |
| HRService        | `syncEmployees()`         | Sync ADP employees to Keycloak     | ⚠️ Missing |
| HRService        | `getEmployeePayroll()`    | Get employee payroll data          | ⚠️ Missing |
| HRService        | `getPayrollSummary()`     | Get payroll status summary         | ⚠️ Missing |

---

## Part 1: InventoryService - Add getLowStockItems()

### File: `apps/api/src/modules/products/inventory.service.ts`

### Current State Analysis

The `InventoryService` currently only has an `updateStock()` method. We need to add a method that queries MongoDB for products where the stock level is below a defined threshold.

### Understanding the Product Schema

From our Product schema:

```typescript
@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true }) name!: string;
  @Prop() description!: string;
  @Prop({ required: true }) price!: number;
  @Prop({ required: true }) category!: string;
  @Prop({ type: Object }) attributes!: Record<string, unknown>;
  @Prop({ default: true }) isActive!: boolean;
}
```

Stock is stored in the `attributes` object as `attributes.stock`, and we need to define a threshold (e.g., `attributes.lowStockThreshold`).

### Implementation

Add this method to `InventoryService`:

```typescript
/**
 * Get all products with low stock levels
 *
 * A product is considered "low stock" if:
 * 1. It has a lowStockThreshold defined in attributes
 * 2. Current stock is below or equal to that threshold
 *
 * @returns {Promise<Product[]>} Array of products with low stock
 */
async getLowStockItems(): Promise<Product[]> {
  try {
    // Find all active products
    const products = await this.productModel
      .find({ isActive: true })
      .exec();

    // Filter products where stock <= threshold
    const lowStockProducts = products.filter((product) => {
      const stock = (product.attributes['stock'] as number) || 0;
      const threshold = (product.attributes['lowStockThreshold'] as number) || 10;

      return stock <= threshold;
    });

    return lowStockProducts;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch low stock items: ${errorMessage}`);
  }
}
```

### Alternative: Database-Level Filtering (More Efficient)

For better performance with large product catalogs, you can filter at the database level:

```typescript
/**
 * Get all products with low stock levels (optimized version)
 *
 * Uses MongoDB aggregation pipeline for efficient filtering
 *
 * @returns {Promise<Product[]>} Array of products with low stock
 */
async getLowStockItems(): Promise<Product[]> {
  try {
    // Use MongoDB aggregation for server-side filtering
    const lowStockProducts = await this.productModel.aggregate([
      // Only active products
      { $match: { isActive: true } },

      // Add computed field for comparison
      {
        $addFields: {
          stock: { $ifNull: ['$attributes.stock', 0] },
          threshold: { $ifNull: ['$attributes.lowStockThreshold', 10] },
        },
      },

      // Filter where stock <= threshold
      {
        $match: {
          $expr: { $lte: ['$stock', '$threshold'] },
        },
      },

      // Sort by stock level (lowest first)
      { $sort: { stock: 1 } },
    ]);

    return lowStockProducts;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch low stock items: ${errorMessage}`);
  }
}
```

### Testing the Method

```typescript
// Test in a controller or use a test script
const lowStockItems = await inventoryService.getLowStockItems();
console.log(`Found ${lowStockItems.length} low stock items:`, lowStockItems);
```

**Expected Output:**

```javascript
[
  {
    _id: '...',
    name: 'Oak Candle',
    price: 25.99,
    category: 'candles',
    attributes: { stock: 3, lowStockThreshold: 10 },
    isActive: true,
  },
  {
    _id: '...',
    name: 'Pine Soap',
    price: 12.99,
    category: 'soaps',
    attributes: { stock: 1, lowStockThreshold: 5 },
    isActive: true,
  },
];
```

---

## Part 2: OrdersService - Add getPendingOrdersCount()

### File: `apps/api/src/modules/orders/orders.service.ts`

### Current State Analysis

The `OrdersService` has basic CRUD methods but lacks a method to count orders by status. We need to query PostgreSQL for orders with a "pending" or "processing" status.

### Understanding Order Status

Orders typically have statuses like:

- `pending` - Order placed, awaiting payment confirmation
- `processing` - Payment confirmed, preparing for shipment
- `shipped` - Order has been shipped
- `delivered` - Order delivered to customer
- `cancelled` - Order cancelled

For the admin dashboard, we want to count orders in `pending` and `processing` states.

### Implementation

Add this method to `OrdersService`:

```typescript
/**
 * Get count of orders that are pending fulfillment
 *
 * Counts orders with status 'pending' or 'processing'
 *
 * @returns {Promise<number>} Count of pending orders
 */
async getPendingOrdersCount(): Promise<number> {
  try {
    const count = await this.ordersRepository.count({
      where: [
        { status: 'pending' },
        { status: 'processing' },
      ],
    });

    return count;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get pending orders count: ${errorMessage}`);
  }
}
```

### Enhanced Version with Details

If you want to provide more detailed information:

```typescript
/**
 * Get detailed count of orders by status
 *
 * @returns {Promise<{ pending: number; processing: number; total: number }>}
 */
async getPendingOrdersCount(): Promise<number> {
  try {
    const [pending, processing] = await Promise.all([
      this.ordersRepository.count({ where: { status: 'pending' } }),
      this.ordersRepository.count({ where: { status: 'processing' } }),
    ]);

    return pending + processing;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get pending orders count: ${errorMessage}`);
  }
}

/**
 * Get breakdown of orders by status (bonus method)
 */
async getOrdersBreakdown(): Promise<{
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  total: number;
}> {
  try {
    const [pending, processing, shipped, delivered, total] = await Promise.all([
      this.ordersRepository.count({ where: { status: 'pending' } }),
      this.ordersRepository.count({ where: { status: 'processing' } }),
      this.ordersRepository.count({ where: { status: 'shipped' } }),
      this.ordersRepository.count({ where: { status: 'delivered' } }),
      this.ordersRepository.count(),
    ]);

    return { pending, processing, shipped, delivered, total };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get orders breakdown: ${errorMessage}`);
  }
}
```

### Testing the Method

```typescript
// Test in a controller or use a test script
const pendingCount = await ordersService.getPendingOrdersCount();
console.log(`Pending orders: ${pendingCount}`);
```

**Expected Output:**

```
Pending orders: 23
```

---

## Part 3: HRService - Complete Implementation

### File: `apps/api/src/modules/management/hr.service.ts`

### Current State Analysis

The `HRService` file has been created but is incomplete. It incorrectly has ADP authentication logic (which should be in `ADPService`) and is missing the core orchestration methods.

### The Correct HRService Implementation

**Replace the entire contents** of `apps/api/src/modules/management/hr.service.ts` with:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ADPService, ADPEmployee } from './adp.service';
import { KeycloakAdminService } from './keycloak-admin.service';

export interface SyncStats {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class HRService {
  private readonly logger = new Logger(HRService.name);

  constructor(
    private adpService: ADPService,
    private keycloakAdminService: KeycloakAdminService
  ) {}

  /**
   * Sync Employees from ADP to Keycloak
   *
   * The Synchronization Flow:
   * 1. Fetch all active employees from ADP (via ADPService)
   * 2. For each employee:
   *    a. Check if they exist in Keycloak (via KeycloakAdminService)
   *    b. If not, create a new Keycloak user with 'worker' role
   *    c. If yes, update their information if needed
   * 3. Return statistics about the sync operation
   *
   * @returns {Promise<SyncStats>} Statistics about created, updated, and skipped users
   */
  async syncEmployees(): Promise<SyncStats> {
    this.logger.log('Starting employee sync from ADP to Keycloak');

    const stats: SyncStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Step 1: Get all active workers from ADP
      const workers = await this.adpService.getActiveEmployees();
      this.logger.log(`Found ${workers.length} active workers in ADP`);

      // Step 2: Process each worker
      for (const worker of workers) {
        try {
          // Extract worker information
          const adpId = worker.workerID?.idValue;
          const firstName = worker.person?.legalName?.givenName;
          const lastName = worker.person?.legalName?.familyName1;
          const email = worker.person?.communication?.emails?.[0]?.emailUri;
          const jobTitle = worker.workAssignment?.[0]?.jobTitle;

          // Validate required fields
          if (!adpId || !email) {
            this.logger.warn(`Skipping worker without ADP ID or email`);
            stats.skipped++;
            stats.errors.push(`Missing data for worker: ${adpId || 'unknown'}`);
            continue;
          }

          // Check if user already exists in Keycloak
          const existingUser =
            await this.keycloakAdminService.findUserByEmail(email);

          if (existingUser) {
            // User exists - update their information
            this.logger.debug(
              `User ${email} already exists in Keycloak, updating...`
            );

            await this.keycloakAdminService.updateUser(existingUser.id!, {
              firstName,
              lastName,
              email,
              attributes: {
                adpId: [adpId],
                jobTitle: [jobTitle || ''],
                syncedAt: [new Date().toISOString()],
              },
            });

            stats.updated++;
          } else {
            // User doesn't exist - create new user
            this.logger.log(`Creating new Keycloak user for ${email}`);

            const temporaryPassword =
              this.keycloakAdminService.generateTemporaryPassword();

            const userId = await this.keycloakAdminService.createUser(
              {
                username: email.split('@')[0] + '_worker',
                email,
                firstName,
                lastName,
                enabled: true,
                emailVerified: true,
                attributes: {
                  adpId: [adpId],
                  jobTitle: [jobTitle || ''],
                  syncedAt: [new Date().toISOString()],
                },
              },
              temporaryPassword
            );

            // Assign 'worker' role to the new user
            await this.keycloakAdminService.assignRole(userId, 'worker');

            stats.created++;
          }
        } catch (workerError) {
          const errorMessage =
            workerError instanceof Error
              ? workerError.message
              : 'Unknown error';
          this.logger.error(
            `Failed to sync worker: ${errorMessage}`,
            workerError
          );
          stats.skipped++;
          stats.errors.push(`${email || 'unknown'}: ${errorMessage}`);
        }
      }

      this.logger.log(`Employee sync complete: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Employee sync failed', error);
      throw new Error(`Failed to sync employees from ADP: ${errorMessage}`);
    }
  }

  /**
   * Get payroll data for an employee (delegates to ADPService)
   *
   * @param {string} employeeId - ADP employee ID
   * @returns {Promise<any>} Employee payroll data
   */
  async getEmployeePayroll(employeeId: string): Promise<any> {
    return this.adpService.getEmployeePayroll(employeeId);
  }

  /**
   * Get payroll summary for dashboard (delegates to ADPService)
   *
   * @returns {Promise<any>} Payroll summary
   */
  async getPayrollSummary(): Promise<any> {
    return this.adpService.getPayrollSummary();
  }
}
```

### Key Changes from Current File

| Issue in Current File            | Correction                                |
| -------------------------------- | ----------------------------------------- |
| Has ADP authentication logic     | Removed - that belongs in ADPService      |
| Missing constructor dependencies | Added ADPService and KeycloakAdminService |
| Missing syncEmployees()          | Added complete implementation             |
| Missing getEmployeePayroll()     | Added delegation to ADPService            |
| Missing getPayrollSummary()      | Added delegation to ADPService            |

---

## Part 4: Verify All Dependencies Are in Place

Before testing, ensure these files exist and are complete:

### 1. ADPService (`apps/api/src/modules/management/adp.service.ts`)

Should have these methods:

- ✅ `getAccessToken()` - OAuth2 authentication
- ✅ `getActiveEmployees()` - Fetch employees from ADP
- ✅ `getEmployeePayroll(employeeId)` - Get payroll data
- ✅ `getPayrollSummary()` - Get payroll status

### 2. KeycloakAdminService (`apps/api/src/modules/management/keycloak-admin.service.ts`)

Should have these methods:

- ✅ `getAdminToken()` - Get Keycloak admin token
- ✅ `findUserByEmail(email)` - Search for user
- ✅ `createUser(userData, password)` - Create new user
- ✅ `updateUser(userId, userData)` - Update existing user
- ✅ `assignRole(userId, roleName)` - Assign role to user
- ✅ `generateTemporaryPassword()` - Generate secure password

### 3. ManagementModule (`apps/api/src/modules/management/management.module.ts`)

Should import and export all services:

```typescript
import { Module } from '@nestjs/common';
import { ADPService } from './adp.service';
import { KeycloakAdminService } from './keycloak-admin.service';
import { HRService } from './hr.service';
import { ManagementController } from './management.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ProductsModule, // Gives access to InventoryService
    OrdersModule, // Gives access to OrdersService
  ],
  controllers: [ManagementController],
  providers: [ADPService, KeycloakAdminService, HRService],
  exports: [ADPService, KeycloakAdminService, HRService],
})
export class ManagementModule {}
```

---

## Part 5: Fix Typos in ManagementController

### File: `apps/api/src/modules/management/management.controller.ts`

There are several typos in the current implementation. Here are the corrections:

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';
import { HRService } from './hr.service';
import { InventoryService } from '../products/inventory.service';
import { OrdersService } from '../orders/orders.service';

@Controller('management')
@Roles({ roles: ['realm:admin'] }) // Fixed: removed space in 'realm: admin'
export class ManagementController {
  constructor(
    private hrService: HRService,
    private inventoryService: InventoryService,
    private ordersService: OrdersService
  ) {}

  /**
   * Get dashboard overview with aggregated data from multiple sources
   */
  @Get('dashboard/overview')
  async getOverview() {
    // Aggregate data from MongoDB, PostgreSQL, and ADP API
    const [lowStock, pendingOrders, payrollStatus] = await Promise.all([
      this.inventoryService.getLowStockItems(),
      this.ordersService.getPendingOrdersCount(),
      this.hrService.getPayrollSummary().catch(() => null), // Fixed typo: getPayrollSrummary
    ]);

    return {
      inventory: {
        lowStockItems: lowStock, // Fixed typo: lowStockIems
      },
      orders: {
        pendingCount: pendingOrders,
      },
      payroll: payrollStatus,
      timestamp: new Date().toISOString(), // Fixed typo: timeStamp
    };
  }

  /**
   * Trigger manual employee sync from ADP to Keycloak
   */
  @Post('employees/sync')
  async syncEmployees() {
    const result = await this.hrService.syncEmployees();

    return {
      message: 'Employee sync completed',
      stats: result,
    };
  }
}
```

### Typos Fixed:

| Line | Before                 | After                 | Issue                    |
| ---- | ---------------------- | --------------------- | ------------------------ |
| 8    | `'realm: admin'`       | `'realm:admin'`       | Extra space in role name |
| 25   | `getPayrollSrummary()` | `getPayrollSummary()` | Typo in method name      |
| 30   | `lowStockIems`         | `lowStockItems`       | Typo in property name    |
| 36   | `timeStamp`            | `timestamp`           | Inconsistent casing      |

---

## Part 6: Update ProductsModule and OrdersModule

### Ensure Services Are Exported

Both modules need to export their services so ManagementModule can use them.

#### File: `apps/api/src/modules/products/products.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './products.service';
import { InventoryService } from './inventory.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, InventoryService],
  exports: [ProductsService, InventoryService], // Export both services
})
export class ProductsModule {}
```

#### File: `apps/api/src/modules/orders/orders.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrdersController],
  providers: [OrdersService, ShippingService],
  exports: [OrdersService, ShippingService], // Export both services
})
export class OrdersModule {}
```

---

## Part 7: Implementation Checklist

Complete these tasks in order:

### Step 1: Update InventoryService

- [ ] Open `apps/api/src/modules/products/inventory.service.ts`
- [ ] Add the `getLowStockItems()` method
- [ ] Save the file

### Step 2: Update OrdersService

- [ ] Open `apps/api/src/modules/orders/orders.service.ts`
- [ ] Add the `getPendingOrdersCount()` method
- [ ] Save the file

### Step 3: Replace HRService

- [ ] Open `apps/api/src/modules/management/hr.service.ts`
- [ ] Replace entire contents with the correct implementation
- [ ] Ensure imports are correct
- [ ] Save the file

### Step 4: Fix ManagementController Typos

- [ ] Open `apps/api/src/modules/management/management.controller.ts`
- [ ] Fix the role decorator: `'realm:admin'`
- [ ] Fix method name: `getPayrollSummary()`
- [ ] Fix property name: `lowStockItems`
- [ ] Fix property name: `timestamp`
- [ ] Save the file

### Step 5: Verify Module Exports

- [ ] Check `ProductsModule` exports `InventoryService`
- [ ] Check `OrdersModule` exports `OrdersService`
- [ ] Check `ManagementModule` imports both modules

### Step 6: Verify All Services Exist

- [ ] Confirm `ADPService` is complete with all methods
- [ ] Confirm `KeycloakAdminService` is complete with all methods
- [ ] Confirm `HRService` is complete with all methods

---

## Part 8: Testing Instructions

**⚠️ After completing all implementations above, return to Step 13 documentation and follow the testing procedures outlined there.**

Specifically, you should test:

### Test 1: Dashboard Overview Endpoint

```bash
# Test the aggregated dashboard
curl -X GET "http://localhost:3000/api/management/dashboard/overview" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "inventory": {
    "lowStockItems": [{ "name": "Oak Candle", "stock": 3, "threshold": 10 }]
  },
  "orders": {
    "pendingCount": 23
  },
  "payroll": {
    "processingPayRuns": 2,
    "lastPayRunDate": "2026-01-05"
  },
  "timestamp": "2026-01-08T15:30:00.000Z"
}
```

### Test 2: Employee Sync Endpoint

```bash
# Test employee synchronization
curl -X POST "http://localhost:3000/api/management/employees/sync" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "message": "Employee sync completed",
  "stats": {
    "created": 3,
    "updated": 2,
    "skipped": 0,
    "errors": []
  }
}
```

### Test 3: Individual Service Methods

Test each service independently:

```bash
# In NestJS application context or test file

// Test InventoryService
const lowStock = await inventoryService.getLowStockItems();
console.log('Low stock items:', lowStock.length);

// Test OrdersService
const pendingCount = await ordersService.getPendingOrdersCount();
console.log('Pending orders:', pendingCount);

// Test HRService
const payrollSummary = await hrService.getPayrollSummary();
console.log('Payroll summary:', payrollSummary);
```

---

## Part 9: Common Issues and Solutions

### Issue 1: "Cannot find module 'ConfigService'"

**Cause:** HRService was incorrectly importing ConfigService

**Solution:** Removed from HRService (it's only needed in ADPService and KeycloakAdminService)

### Issue 2: "Cannot read property 'getLowStockItems' of undefined"

**Cause:** ProductsModule not exporting InventoryService

**Solution:** Add `exports: [InventoryService]` to ProductsModule

### Issue 3: "Method 'getPayrollSummary' does not exist"

**Cause:** Typo in ManagementController

**Solution:** Fix typo: `getPayrollSrummary` → `getPayrollSummary`

### Issue 4: "Role 'realm: admin' not found"

**Cause:** Extra space in role decorator

**Solution:** Fix typo: `'realm: admin'` → `'realm:admin'`

### Issue 5: "ADPService is not a constructor"

**Cause:** ADPService not provided in ManagementModule

**Solution:** Ensure ManagementModule includes ADPService in providers array

---

## Part 10: File Summary

After completing this step, these files should be modified:

```
apps/api/src/modules/
├── products/
│   ├── inventory.service.ts           (MODIFIED - added getLowStockItems)
│   └── products.module.ts             (VERIFIED - exports InventoryService)
├── orders/
│   ├── orders.service.ts              (MODIFIED - added getPendingOrdersCount)
│   └── orders.module.ts               (VERIFIED - exports OrdersService)
└── management/
    ├── hr.service.ts                  (REPLACED - complete rewrite)
    ├── management.controller.ts       (MODIFIED - fixed typos)
    └── management.module.ts           (VERIFIED - imports correct modules)
```

---

## Completion Checklist

Before returning to Step 13 for testing:

- [ ] All three services have their missing methods implemented
- [ ] All typos in ManagementController are fixed
- [ ] ProductsModule exports InventoryService
- [ ] OrdersModule exports OrdersService
- [ ] ManagementModule imports both ProductsModule and OrdersModule
- [ ] ADPService is complete with all required methods
- [ ] KeycloakAdminService is complete with all required methods
- [ ] HRService is completely rewritten with correct logic
- [ ] Application compiles without errors
- [ ] Ready to proceed with testing from Step 13

---

## Next Steps

✅ **Once all implementations are complete, return to:**

📄 **[Step 13: Admin Dashboard and ADP HR Integration](./13-Admin%20Dashboard%20and%20ADP%20HR%20Integration.md#5-verification--learning-check)**

Follow the testing procedures in **Section 5: Verification & Learning Check** to ensure all services are working correctly.

---

## Summary

This step filled in the missing pieces needed for Step 13 to function:

1. ✅ **InventoryService.getLowStockItems()** - Query MongoDB for low stock products
2. ✅ **OrdersService.getPendingOrdersCount()** - Count pending orders in PostgreSQL
3. ✅ **HRService** - Complete orchestration service for ADP ↔ Keycloak sync
4. ✅ **Fixed typos** - Corrected role names, method names, and property names
5. ✅ **Verified module exports** - Ensured all services are accessible

With these implementations, the Admin Dashboard will have full functionality for monitoring inventory, orders, and HR data in one unified view.
