# Step 13c: HR Service and Missing Methods

## Overview

Before the Admin Dashboard can function, we need to complete three services:

1. **HRService** - Orchestrates employee sync between ADP and Keycloak
2. **InventoryService** - Add `getLowStockItems()` for dashboard
3. **OrdersService** - Add `getPendingOrdersCount()` for dashboard

This module covers all three implementations and their alternative approaches.

---

## Table of Contents

1. [HR Service - The Orchestrator](#1-hr-service---the-orchestrator)
2. [Implementing syncEmployees()](#2-implementing-syncemployees)
3. [Delegation Methods](#3-delegation-methods)
4. [InventoryService - getLowStockItems()](#4-inventoryservice---getlowstockitems)
5. [OrdersService - getPendingOrdersCount()](#5-ordersservice---getpendingorderscount)
6. [Testing All Methods](#6-testing-all-methods)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. HR Service - The Orchestrator

### What is an Orchestrator?

The HR Service doesn't talk to external APIs directly. Instead, it **orchestrates** (coordinates) other services to accomplish complex tasks.

### The Analogy: A Symphony Conductor

```
┌────────────────────────────────────────┐
│         HR Service (Conductor)         │
│   "Sync employees from ADP to KC"      │
└──────────┬─────────────────┬───────────┘
           │                 │
           ↓                 ↓
┌──────────────────┐  ┌─────────────────┐
│   ADPService     │  │ KeycloakAdmin   │
│   (Violins)      │  │   (Cellos)      │
│ • Get employees  │  │ • Create users  │
└──────────────────┘  └─────────────────┘
```

Just like a conductor doesn't play instruments but directs the orchestra, the HR Service doesn't call APIs directly but directs other services.

### Why Orchestration?

**Without Orchestration (Bad):**

```typescript
// ❌ Controller directly coordinating services
async syncEmployees() {
  const adpToken = await adpService.getToken();
  const employees = await adpService.getEmployees(adpToken);
  
  for (const emp of employees) {
    const kcToken = await keycloakService.getToken();
    const exists = await keycloakService.findUser(kcToken, emp.email);
    if (!exists) {
      await keycloakService.createUser(kcToken, emp);
      await keycloakService.assignRole(kcToken, userId, 'worker');
    }
  }
}
```

**With Orchestration (Good):**

```typescript
// ✅ HR Service handles complexity
async syncEmployees() {
  return this.hrService.syncEmployees();
}
```

All the complexity is hidden inside HRService!

---

## 2. Implementing syncEmployees()

### The Sync Algorithm

```
┌─────────────────────────────────────────────────┐
│ Step 1: Fetch Active Employees from ADP        │
│ Result: Array of 50 employees                  │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│ Step 2: For Each Employee                      │
│   2a. Extract: name, email, ADP ID, job title  │
│   2b. Validate: email and ADP ID exist         │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│ Step 3: Check if User Exists in Keycloak       │
│   Query by email address                       │
└──────────────┬──────────────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
         ↓           ↓
   ┌─────────┐  ┌─────────┐
   │ Exists  │  │  New    │
   └────┬────┘  └────┬────┘
        │            │
        ↓            ↓
  ┌──────────┐  ┌──────────────┐
  │ Update   │  │ Create       │
  │ Info     │  │ Assign Role  │
  └──────────┘  └──────────────┘
        │            │
        └─────┬──────┘
              │
              ↓
   ┌─────────────────────┐
   │ Track Statistics    │
   │ created: 10         │
   │ updated: 38         │
   │ skipped: 2          │
   └─────────────────────┘
```

### Complete Implementation

**File: `apps/api/src/modules/management/hr.service.ts`**

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
        // Extract identifiers outside try block for error handling
        const adpId = worker.workerId?.idValue;
        const email = worker.person?.communication?.emails?.[0]?.emailUri;

        try {
          // Extract worker information
          const firstName = worker.person?.legalName?.givenName;
          const lastName = worker.person?.legalName?.familyName1;
          const jobTitle = worker.person?.workAssignment?.[0]?.jobTitle;

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

### Code Walkthrough

**1. Statistics Tracking:**

```typescript
const stats: SyncStats = {
  created: 0,   // New users created
  updated: 0,   // Existing users updated
  skipped: 0,   // Workers that failed
  errors: [],   // Error messages
};
```

This gives the admin visibility into what happened during sync.

**2. Error Scope Management:**

```typescript
// Extract identifiers OUTSIDE try block
const adpId = worker.workerId?.idValue;
const email = worker.person?.communication?.emails?.[0]?.emailUri;

try {
  // Process worker...
} catch (workerError) {
  // Can access 'email' in catch block for error message
  stats.errors.push(`${email || 'unknown'}: ${errorMessage}`);
}
```

**Why?** Variables declared inside `try` aren't accessible in `catch`.

**3. Username Generation:**

```typescript
username: email.split('@')[0] + '_worker'
```

Examples:
- `john.doe@sawdustandscents.com` → `john.doe_worker`
- `sarah@company.com` → `sarah_worker`

**4. Keycloak Attributes:**

```typescript
attributes: {
  adpId: [adpId],                        // Link to ADP
  jobTitle: [jobTitle || ''],            // Job title (or empty)
  syncedAt: [new Date().toISOString()],  // Last sync timestamp
}
```

Remember: Keycloak attributes are **always arrays**!

**5. Graceful Failure:**

```typescript
try {
  // Process each worker
} catch (workerError) {
  // Log error but continue with next worker
  stats.skipped++;
  stats.errors.push(`${email}: ${errorMessage}`);
}
```

If one employee fails, we don't stop the entire sync.

---

## 3. Delegation Methods

These methods simply forward calls to ADPService:

```typescript
async getEmployeePayroll(employeeId: string): Promise<any> {
  return this.adpService.getEmployeePayroll(employeeId);
}

async getPayrollSummary(): Promise<any> {
  return this.adpService.getPayrollSummary();
}
```

### Why Delegate?

**Single Entry Point**: Controllers call `hrService`, not `adpService` directly.

```
Controller → HRService → ADPService
     ✅ Good (through orchestrator)

Controller → ADPService
     ❌ Bad (bypasses orchestrator)
```

This allows HRService to add business logic later (caching, auditing, etc.) without changing controllers.

---

## 4. InventoryService - getLowStockItems()

### Understanding the Product Schema

Stock is stored in the `attributes` object:

```typescript
{
  _id: '...',
  name: 'Oak Candle',
  price: 25.99,
  category: 'candles',
  attributes: {
    stock: 3,                // Current stock level
    lowStockThreshold: 10    // Alert when stock <= 10
  },
  isActive: true
}
```

### Implementation 1: In-Memory Filtering (Simple)

**File: `apps/api/src/modules/products/inventory.service.ts`**

Add this method to the `InventoryService` class:

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

**Pros:**
- ✅ Simple to understand
- ✅ Works with any data structure
- ✅ Easy to debug

**Cons:**
- ❌ Loads ALL products into memory
- ❌ Slower with large catalogs (1000+ products)
- ❌ More network transfer from MongoDB

### Implementation 2: Database-Level Filtering (Optimized)

For better performance with large product catalogs:

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
      // Stage 1: Only active products
      { $match: { isActive: true } },

      // Stage 2: Add computed fields for comparison
      {
        $addFields: {
          stock: { $ifNull: ['$attributes.stock', 0] },
          threshold: { $ifNull: ['$attributes.lowStockThreshold', 10] },
        },
      },

      // Stage 3: Filter where stock <= threshold
      {
        $match: {
          $expr: { $lte: ['$stock', '$threshold'] },
        },
      },

      // Stage 4: Sort by stock level (lowest first)
      { $sort: { stock: 1 } },
    ]);

    return lowStockProducts;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch low stock items: ${errorMessage}`);
  }
}
```

**Pros:**
- ✅ Filtering happens in MongoDB (faster)
- ✅ Only returns low stock items (less network transfer)
- ✅ Scales to millions of products
- ✅ Sorted results

**Cons:**
- ❌ More complex to understand
- ❌ Harder to debug
- ❌ Aggregation pipeline syntax learning curve

### Which to Use?

| Catalog Size | Recommendation |
|--------------|----------------|
| < 1,000 products | Implementation 1 (Simple) |
| 1,000 - 10,000 products | Either works |
| > 10,000 products | Implementation 2 (Optimized) |

---

## 5. OrdersService - getPendingOrdersCount()

### Understanding Order Status

Orders have lifecycle statuses:

```
pending → processing → shipped → delivered
                ↓
            cancelled
```

For the dashboard, we want orders that need attention: `pending` and `processing`.

### Implementation 1: Simple Count

**File: `apps/api/src/modules/orders/orders.service.ts`**

Add this method to the `OrdersService` class:

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

**Simple and Fast**: Perfect for a dashboard that just needs a number.

### Implementation 2: Detailed Breakdown

If you want more details for the dashboard:

```typescript
/**
 * Get detailed count of orders by status
 *
 * @returns {Promise<object>} Counts broken down by status
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

**Pros:**
- ✅ More detailed dashboard metrics
- ✅ `Promise.all()` runs all queries in parallel (fast!)
- ✅ Single method call from controller

**Cons:**
- ❌ More database queries
- ❌ Overkill if you only need pending count

### Which to Use?

- **Dashboard Overview**: Implementation 1 (simple count)
- **Detailed Analytics Page**: Implementation 2 (breakdown)

You can implement both! The controller decides which to use.

---

## 6. Testing All Methods

### 6.1 Test HR Service Sync

```typescript
describe('HRService', () => {
  let service: HRService;
  let adpService: ADPService;
  let keycloakService: KeycloakAdminService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HRService,
        {
          provide: ADPService,
          useValue: {
            getActiveEmployees: jest.fn(),
          },
        },
        {
          provide: KeycloakAdminService,
          useValue: {
            findUserByEmail: jest.fn(),
            createUser: jest.fn(),
            assignRole: jest.fn(),
            generateTemporaryPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HRService>(HRService);
    adpService = module.get<ADPService>(ADPService);
    keycloakService = module.get<KeycloakAdminService>(KeycloakAdminService);
  });

  it('should create new users for ADP employees not in Keycloak', async () => {
    // Mock ADP returning 2 employees
    jest.spyOn(adpService, 'getActiveEmployees').mockResolvedValue([
      {
        workerId: { idValue: 'ADP123' },
        person: {
          legalName: { givenName: 'John', familyName1: 'Doe' },
          communication: { emails: [{ emailUri: 'john@test.com' }] },
          workAssignment: [{ jobTitle: 'Manager' }],
        },
      },
      {
        workerId: { idValue: 'ADP456' },
        person: {
          legalName: { givenName: 'Jane', familyName1: 'Smith' },
          communication: { emails: [{ emailUri: 'jane@test.com' }] },
          workAssignment: [{ jobTitle: 'Worker' }],
        },
      },
    ]);

    // Mock Keycloak - users don't exist
    jest.spyOn(keycloakService, 'findUserByEmail').mockResolvedValue(null);
    jest.spyOn(keycloakService, 'createUser').mockResolvedValue('new-user-id');
    jest.spyOn(keycloakService, 'generateTemporaryPassword').mockReturnValue('TempPass123!');

    const stats = await service.syncEmployees();

    expect(stats.created).toBe(2);
    expect(stats.updated).toBe(0);
    expect(stats.skipped).toBe(0);
    expect(keycloakService.createUser).toHaveBeenCalledTimes(2);
    expect(keycloakService.assignRole).toHaveBeenCalledTimes(2);
  });
});
```

### 6.2 Test Inventory Service

```typescript
describe('InventoryService', () => {
  it('should return low stock items', async () => {
    // Add test products to MongoDB
    await productModel.create([
      {
        name: 'Oak Candle',
        price: 25.99,
        category: 'candles',
        attributes: { stock: 3, lowStockThreshold: 10 },
        isActive: true,
      },
      {
        name: 'Pine Soap',
        price: 12.99,
        category: 'soaps',
        attributes: { stock: 15, lowStockThreshold: 10 },
        isActive: true,
      },
    ]);

    const lowStockItems = await inventoryService.getLowStockItems();

    expect(lowStockItems).toHaveLength(1);
    expect(lowStockItems[0].name).toBe('Oak Candle');
  });
});
```

### 6.3 Test Orders Service

```typescript
describe('OrdersService', () => {
  it('should count pending orders correctly', async () => {
    // Add test orders to PostgreSQL
    await ordersRepository.save([
      { status: 'pending', total: 99.99 },
      { status: 'pending', total: 49.99 },
      { status: 'processing', total: 149.99 },
      { status: 'delivered', total: 29.99 },
    ]);

    const count = await ordersService.getPendingOrdersCount();

    expect(count).toBe(3); // 2 pending + 1 processing
  });
});
```

### 6.4 Integration Test

Test the full dashboard flow:

```bash
# Start all services
nx serve api

# Test dashboard endpoint
curl -X GET "http://localhost:3000/api/management/dashboard/overview" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

Expected response:

```json
{
  "inventory": {
    "lowStockItems": [
      {
        "name": "Oak Candle",
        "stock": 3,
        "threshold": 10
      }
    ]
  },
  "orders": {
    "pendingCount": 23
  },
  "payroll": {
    "processingPayRuns": 1,
    "lastPayRunDate": "2026-01-10"
  },
  "timestamp": "2026-01-11T12:00:00.000Z"
}
```

---

## 7. Troubleshooting

### Issue: "Cannot find module ADPService"

**Cause**: HRService can't find ADPService dependency.

**Solution**:
1. Verify `ADPService` is in the same directory
2. Check import statement: `import { ADPService } from './adp.service';`
3. Ensure `ManagementModule` provides `ADPService`

### Issue: "worker.workAssignment is undefined"

**Cause**: ADP API response doesn't include `workAssignment`.

**Solution**:
```typescript
// Add safe navigation
const jobTitle = worker.person?.workAssignment?.[0]?.jobTitle || 'Unknown';
```

### Issue: "Attributes must be an array"

**Cause**: Keycloak attributes set as strings instead of arrays.

**Solution**:
```typescript
// ❌ WRONG
attributes: {
  adpId: 'ADP123'
}

// ✅ CORRECT
attributes: {
  adpId: ['ADP123']
}
```

### Issue: "getLowStockItems returns empty array"

**Cause**: No products have `lowStockThreshold` attribute.

**Solution**:
1. Update products to include threshold:
   ```javascript
   db.products.updateMany(
     {},
     { $set: { 'attributes.lowStockThreshold': 10 } }
   )
   ```
2. Or modify code to use default threshold:
   ```typescript
   const threshold = (product.attributes['lowStockThreshold'] as number) || 10;
   ```

### Issue: "getPendingOrdersCount returns wrong number"

**Cause**: SQL query not matching status correctly.

**Solution**:
1. Check order statuses in database:
   ```sql
   SELECT DISTINCT status FROM orders;
   ```
2. Adjust query to match actual status values
3. Ensure status field is indexed for performance

---

## 8. Complete File Checklist

Before proceeding to the next step, ensure these files are complete:

### ✅ HRService
**File**: `apps/api/src/modules/management/hr.service.ts`

- [ ] `syncEmployees()` implemented
- [ ] `getEmployeePayroll()` delegation added
- [ ] `getPayrollSummary()` delegation added
- [ ] `SyncStats` interface exported
- [ ] Proper error handling in place

### ✅ InventoryService
**File**: `apps/api/src/modules/products/inventory.service.ts`

- [ ] `getLowStockItems()` implemented
- [ ] Chooses appropriate implementation (simple vs optimized)
- [ ] Error handling in place
- [ ] Returns `Product[]` type

### ✅ OrdersService
**File**: `apps/api/src/modules/orders/orders.service.ts`

- [ ] `getPendingOrdersCount()` implemented
- [ ] Optional: `getOrdersBreakdown()` for details
- [ ] Error handling in place
- [ ] Returns `number` type

---

## 9. Key Takeaways

### What You Learned

1. **Service Orchestration**: Coordinating multiple services to accomplish complex tasks
2. **Graceful Error Handling**: One failure doesn't stop the entire process
3. **Statistics Tracking**: Providing visibility into batch operations
4. **MongoDB vs PostgreSQL Queries**: Different approaches for different databases
5. **Optimization Strategies**: When to filter in-memory vs database-level
6. **Delegation Pattern**: Forwarding calls while maintaining single entry point

### Best Practices Applied

- ✅ Single Responsibility Principle (each service has one job)
- ✅ Dependency Injection (services injected via constructor)
- ✅ Error handling at multiple levels
- ✅ TypeScript typing for all methods
- ✅ Comprehensive logging
- ✅ Statistics for monitoring

---

## 10. Next Steps

All services are now complete! Proceed to:

➡️ **Step 13d: Management Controller and Module**

This final step will:
- Wire all services together in the Management Module
- Create the dashboard controller endpoints
- Test the complete admin dashboard functionality

---

**Congratulations!** You've implemented three critical services. Continue to Step 13d →


