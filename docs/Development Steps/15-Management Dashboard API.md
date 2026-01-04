# Step 15: Management Dashboard API

## 1. The "Why" Behind This Step: The Manager's Lens

Administrators (Step 14) need deep access to every record. **Managers**, however, need speed and clarity. They need to see how the store is performing *at a glance*.

**The Strategy**: We create a specific **Management Dashboard API** that provides pre-aggregated "Metrics."
- **The Concept**: Instead of the frontend asking for 1,000 orders and counting them (which is slow), the backend does the math once and sends back a single number like `totalSalesToday`.

---

## 2. Core Concepts & Definitions

#### 2.1 Metrics & KPIs (Key Performance Indicators)

- **Definition**: Quantitative values used to measure success.
- **Examples**: `activeCarts`, `pendingFulfillment`, `lowStockCount`.

#### 2.2 Dashboard Aggregation

- **The Logic**: The dashboard controller is an "Information Hub." It doesn't own any data; it asks every other service for a small piece of information and combines them into one JSON "Package."

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the Management Controller

Create `apps/api/src/modules/management/management.controller.ts`.

```typescript
import { Controller, Get } from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';
import { ManagementService } from './management.service';

@Controller('management')
@Roles({ roles: ['realm:manager', 'realm:admin'] }) // Open to both managers and admins
export class ManagementController {
  constructor(private managementService: ManagementService) {}

  @Get('dashboard/overview')
  async getDashboardOverview() {
    // This method returns a "Snapshot" of the whole business
    return this.managementService.getOverview();
  }

  @Get('inventory/alerts')
  async getInventoryAlerts() {
    // Returns only products that need immediate attention
    return this.managementService.getLowStockAlerts();
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 "At-a-Glance" Data

- **The Logic**: Notice we aren't returning full `Product[]` or `Order[]` arrays. We are returning specialized "Data Transfer Objects" (DTOs) that only contain the high-level stats the UI needs to build charts and graphs.

#### 4.2 Multi-Role Access

- **The Logic**: `@Roles({ roles: ['realm:manager', 'realm:admin'] })`. 
- **The Lesson**: You can pass an array of roles. If the user has *either* one of these roles, the bouncer will let them through. This allows for hierarchical security (Admins can do everything, Managers can do most things).

---

## 5. Verification & Learning Check

### 5.1 The "Snapshot" Check

1.  **Start API**: `npx nx serve api`.
2.  **Visit Swagger**: Look for the `management` section.
3.  **The Lesson**: When you run `dashboard/overview`, look for fields like `totalOrders` or `inventoryValue`. This data proves your "Hub" is successfully talking to the "Silos."

### 6. Checklist for Success

- [ ] **Role**: Is the route accessible to both `manager` and `admin`?
- [ ] **Aggregation**: Does the service combine data from Postgres and Mongo?
- [ ] **Performance**: Are you returning only the necessary metrics instead of large data lists?

**Moving Forward**: The business side is secure. Now let's build something friendly for our customers: the **Rowan Chatbot** API.

