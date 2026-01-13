# Step 14: Additional Admin API Endpoints

## 1. The "Why" Behind This Step: Extending the Admin Dashboard

In **Step 13** (modules 13-13d), we built the core admin management system with the dashboard overview and employee sync. Now we'll extend this with additional administrative capabilities.

**What We've Already Built** (in Step 13):

- ✅ Dashboard overview endpoint (`GET /management/dashboard/overview`)
- ✅ Employee sync endpoint (`POST /management/employees/sync`)
- ✅ ADPService, KeycloakAdminService, and HRService
- ✅ Integration with inventory and orders services

**What We're Adding Now** (in Step 14):

- 📋 Detailed orders management endpoints
- 📦 Enhanced inventory management endpoints
- 👥 Individual employee management endpoints
- 📊 Advanced analytics and reporting

---

## 2. Prerequisites

Before proceeding with this step, ensure you have completed:

- ✅ Step 13 (all parts: 13-13d) - Admin Dashboard and ADP HR Integration
- ✅ Step 11 - Product and Inventory Management
- ✅ Step 12 - Order Fulfillment and Shippo Integration

You should have:

- `ManagementController` with dashboard overview
- `HRService`, `ADPService`, and `KeycloakAdminService`
- Admin role configured in Keycloak

---

## 3. Understanding the Current Architecture

From Step 13, we have:

```
ManagementController (/api/management)
├── GET  /dashboard/overview    → Dashboard with aggregated data
└── POST /employees/sync        → Sync employees from ADP
```

Now we'll extend it with more specific admin operations.

---

## 4. Extending the Management Controller

### File: `apps/api/src/modules/management/management.controller.ts`

Add these additional endpoints to the existing `ManagementController`:

```typescript
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';
import { HRService } from './hr.service';
import { InventoryService } from '../products/inventory.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';

@Controller('management')
@Roles({ roles: ['realm:admin'] })
export class ManagementController {
  constructor(
    private hrService: HRService,
    private inventoryService: InventoryService,
    private ordersService: OrdersService,
    private productsService: ProductsService // Add ProductsService
  ) {}

  // ============================================
  // EXISTING ENDPOINTS (from Step 13d)
  // ============================================

  @Get('dashboard/overview')
  async getOverview() {
    // ... (already implemented in Step 13d)
  }

  @Post('employees/sync')
  async syncEmployees() {
    // ... (already implemented in Step 13d)
  }

  // ============================================
  // NEW ENDPOINTS (Step 14)
  // ============================================

  /**
   * Get all orders with filtering and pagination
   */
  @Get('orders')
  async getAllOrders() {
    const orders = await this.ordersService.findAll();
    return {
      total: orders.length,
      orders,
    };
  }

  /**
   * Get orders by status
   */
  @Get('orders/status/:status')
  async getOrdersByStatus(@Param('status') status: string) {
    // Assuming you have a findByStatus method in OrdersService
    const orders = await this.ordersService.findByStatus(status);
    return {
      status,
      count: orders.length,
      orders,
    };
  }

  /**
   * Get detailed inventory report
   */
  @Get('inventory/report')
  async getInventoryReport() {
    const [allProducts, lowStockItems] = await Promise.all([
      this.productsService.findAll(),
      this.inventoryService.getLowStockItems(),
    ]);

    const totalValue = allProducts.reduce((sum, product) => {
      const stock = (product.attributes?.['stock'] as number) || 0;
      return sum + product.price * stock;
    }, 0);

    return {
      totalProducts: allProducts.length,
      lowStockCount: lowStockItems.length,
      totalInventoryValue: totalValue,
      lowStockItems: lowStockItems.map((item) => ({
        id: item._id,
        name: item.name,
        stock: item.attributes?.['stock'],
        threshold: item.attributes?.['lowStockThreshold'],
        reorderRecommended: true,
      })),
    };
  }

  /**
   * Get individual employee payroll
   */
  @Get('employees/:employeeId/payroll')
  async getEmployeePayroll(@Param('employeeId') employeeId: string) {
    try {
      const payroll = await this.hrService.getEmployeePayroll(employeeId);
      return {
        employeeId,
        payroll,
      };
    } catch (error) {
      return {
        employeeId,
        error: 'Failed to fetch payroll data',
      };
    }
  }

  /**
   * Get analytics summary
   */
  @Get('analytics/summary')
  async getAnalyticsSummary() {
    const [orders, products, lowStock, payrollSummary] = await Promise.all([
      this.ordersService.findAll(),
      this.productsService.findAll(),
      this.inventoryService.getLowStockItems(),
      this.hrService.getPayrollSummary().catch(() => null),
    ]);

    // Calculate revenue (sum of all delivered orders)
    const revenue = orders
      .filter((order) => order.status === 'delivered')
      .reduce((sum, order) => sum + order.total, 0);

    // Calculate average order value
    const avgOrderValue = orders.length > 0 ? revenue / orders.length : 0;

    return {
      sales: {
        totalRevenue: revenue,
        totalOrders: orders.length,
        averageOrderValue: avgOrderValue,
      },
      inventory: {
        totalProducts: products.length,
        lowStockItems: lowStock.length,
      },
      payroll: payrollSummary,
      generatedAt: new Date().toISOString(),
    };
  }
}
```

---

## 5. Adding Missing Methods to OrdersService

The new endpoints require a `findByStatus` method in `OrdersService`.

### File: `apps/api/src/modules/orders/orders.service.ts`

Add this method:

```typescript
/**
 * Find orders by status
 *
 * @param {string} status - Order status to filter by
 * @returns {Promise<Order[]>} Orders with the specified status
 */
async findByStatus(status: string): Promise<Order[]> {
  try {
    return await this.ordersRepository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to find orders by status: ${errorMessage}`);
  }
}
```

---

## 6. Testing the New Endpoints

### 6.1 Test Get All Orders

```bash
curl -X GET "http://localhost:3000/api/management/orders" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response:

```json
{
  "total": 45,
  "orders": [
    {
      "id": "uuid-123",
      "status": "pending",
      "total": 149.99,
      "createdAt": "2026-01-10T10:30:00Z"
    }
    // ... more orders
  ]
}
```

### 6.2 Test Get Orders by Status

```bash
curl -X GET "http://localhost:3000/api/management/orders/status/pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response:

```json
{
  "status": "pending",
  "count": 12,
  "orders": [
    // ... pending orders only
  ]
}
```

### 6.3 Test Inventory Report

```bash
curl -X GET "http://localhost:3000/api/management/inventory/report" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response:

```json
{
  "totalProducts": 150,
  "lowStockCount": 8,
  "totalInventoryValue": 45678.99,
  "lowStockItems": [
    {
      "id": "...",
      "name": "Oak Candle",
      "stock": 3,
      "threshold": 10,
      "reorderRecommended": true
    }
  ]
}
```

### 6.4 Test Analytics Summary

```bash
curl -X GET "http://localhost:3000/api/management/analytics/summary" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected response:

```json
{
  "sales": {
    "totalRevenue": 125340.5,
    "totalOrders": 842,
    "averageOrderValue": 148.86
  },
  "inventory": {
    "totalProducts": 150,
    "lowStockItems": 8
  },
  "payroll": {
    "processingPayRuns": 1,
    "lastPayRunDate": "2026-01-10"
  },
  "generatedAt": "2026-01-11T15:30:00.000Z"
}
```

---

## 7. Role-Based Authorization

### Implementing Granular Permissions

You can add more specific role requirements for certain endpoints:

```typescript
// Only super admins can view employee payroll
@Get('employees/:employeeId/payroll')
@Roles({ roles: ['realm:super-admin'] })
async getEmployeePayroll(@Param('employeeId') employeeId: string) {
  // ...
}

// HR managers can sync employees
@Post('employees/sync')
@Roles({ roles: ['realm:admin', 'realm:hr-manager'] })
async syncEmployees() {
  // ...
}

// Regular managers can view analytics
@Get('analytics/summary')
@Roles({ roles: ['realm:admin', 'realm:manager'] })
async getAnalyticsSummary() {
  // ...
}
```

---

## 8. Complete Endpoint Reference

After completing this step, your Management Controller has:

| Method | Endpoint                            | Purpose            | Role Required |
| ------ | ----------------------------------- | ------------------ | ------------- |
| GET    | `/management/dashboard/overview`    | Dashboard overview | `admin`       |
| POST   | `/management/employees/sync`        | Sync from ADP      | `admin`       |
| GET    | `/management/orders`                | All orders list    | `admin`       |
| GET    | `/management/orders/status/:status` | Orders by status   | `admin`       |
| GET    | `/management/inventory/report`      | Detailed inventory | `admin`       |
| GET    | `/management/employees/:id/payroll` | Employee payroll   | `admin`       |
| GET    | `/management/analytics/summary`     | Analytics report   | `admin`       |

---

## 9. Key Takeaways

### What You Learned

1. **Extending Existing Controllers**: Adding new endpoints to existing controllers
2. **Data Aggregation**: Combining data from multiple sources for analytics
3. **Calculated Metrics**: Deriving insights (revenue, average order value) from raw data
4. **Graceful Error Handling**: Some data can fail without breaking the entire response
5. **Structured Responses**: Consistent JSON structure for frontend consumption

### Best Practices Applied

- ✅ RESTful endpoint design
- ✅ Role-based access control
- ✅ Descriptive response objects
- ✅ Error handling for external services
- ✅ Calculated fields for analytics
- ✅ Parallel data fetching with `Promise.all()`

---

## 10. Troubleshooting

### Issue: "Cannot find method findByStatus"

**Solution**: Add the `findByStatus` method to `OrdersService` as shown in section 5.

### Issue: "Cannot inject ProductsService"

**Solution**: Ensure `ProductsModule` exports `ProductsService`:

```typescript
// In products.module.ts
exports: [ProductsService, InventoryService],
```

### Issue: "Analytics returns NaN for revenue"

**Solution**: Ensure orders have numeric `total` field and proper status filtering:

```typescript
const revenue = orders
  .filter(
    (order) => order.status === 'delivered' && typeof order.total === 'number'
  )
  .reduce((sum, order) => sum + order.total, 0);
```

---

## 11. Next Steps

Your admin API is now feature-complete! Proceed to:

➡️ **Step 15: Management Dashboard API** - Build the UI-focused API layer

or

➡️ **Step 19: React Frontend Foundation** - Start building the admin dashboard UI

---

## 12. Verification Checklist

Before moving on, verify:

- [ ] All new endpoints return data successfully
- [ ] `findByStatus` method added to `OrdersService`
- [ ] `ProductsService` injected in `ManagementController`
- [ ] Authorization works (admin role required)
- [ ] Analytics calculations are correct
- [ ] Inventory report shows low stock items
- [ ] Error handling works for external API failures
- [ ] All responses have consistent structure

---

**Congratulations!** Your admin management system is now complete with comprehensive endpoints for orders, inventory, employees, and analytics. The backend is ready for a full-featured admin dashboard UI!

---

## Appendix: Complete Controller Structure

After both Step 13d and Step 14, your `ManagementController` should have this structure:

```typescript
@Controller('management')
@Roles({ roles: ['realm:admin'] })
export class ManagementController {
  constructor(
    private hrService: HRService,
    private inventoryService: InventoryService,
    private ordersService: OrdersService,
    private productsService: ProductsService
  ) {}

  // Dashboard & Sync (Step 13d)
  getOverview();
  syncEmployees();

  // Orders Management (Step 14)
  getAllOrders();
  getOrdersByStatus();

  // Inventory Management (Step 14)
  getInventoryReport();

  // HR Management (Step 14)
  getEmployeePayroll();

  // Analytics (Step 14)
  getAnalyticsSummary();
}
```

This provides a complete admin API for managing all aspects of the business.
