# Step 13: Admin Management and ADP HR Integration

## 1. The "Why" Behind This Step: The Corporate Backbone

A successful business needs to take care of its workers just as well as its customers. For "Sawdust and Scents" to grow, we need to manage our employees, their payroll, and their HR data professionally.

**The Problem**: Handling payroll, taxes, and employee benefits is a legal and accounting nightmare. You should never build your own payroll system.

**The Solution**: We integrate with **ADP**.
- **The Analogy**: Imagine ADP as your "Virtual HR Department." 
    - Instead of keeping employee Social Security numbers and bank details on your server (which is dangerous!), you let the experts at ADP handle it. 
    - Our Admin Page simply "Asks" ADP: "How many hours did Chris work this week?" or "Is Sarah's payroll processed?"

---

## 2. Core Concepts & Definitions

#### 2.1 OAuth 2.0 (The Security Handshake)

- **Definition**: A secure way for two websites to talk about a user without sharing their password.
- **The Logic**: To talk to ADP, our server gets a "Secret Ticket" (an Access Token). We show this ticket every time we ask for HR data.

#### 2.2 PII (Personally Identifiable Information)

- **Definition**: Sensitive data like Home Addresses or Social Security numbers.
- **The Logic**: Because we use ADP, our database **never** stores PII. We only store the "ADP ID." This protects "Sawdust and Scents" from massive legal liability if our server is ever hacked.

---

## 3. Step-by-Step Implementation

### Step 3.1: Create the HR Service

Create `apps/api/src/modules/management/hr.service.ts`. This service will bridge the gap between our Admin page and ADP.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class HRService {
  constructor(private config: ConfigService) {}

  private async getAccessToken() {
    // Logic to get OAuth2 token from ADP
    // This usually involves sending your ClientID and ClientSecret
  }

  async getEmployeePayroll(employeeId: string) {
    const token = await this.getAccessToken();
    const response = await axios.get(`https://api.adp.com/hr/v2/workers/${employeeId}/pay-statements`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  async syncEmployees() {
    // Logic to ensure every worker in ADP has a 'Worker' account in our Keycloak
  }
}
```

### Step 3.2: Create the Management Module

To ensure all these new services and controllers work together, we must register them in a dedicated module. 

Create `apps/api/src/modules/management/management.module.ts`.

**Crucial Step**: Since the Management Dashboard needs to talk to the Products and Orders databases, we must **import** those modules here.

```typescript
import { Module } from '@nestjs/common';
import { HRService } from './hr.service';
import { ManagementController } from './management.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    ProductsModule, // Gives access to InventoryService
    OrdersModule,   // Gives access to OrdersService
  ],
  controllers: [ManagementController],
  providers: [HRService],
  exports: [HRService],
})
export class ManagementModule {}
```

### Step 3.3: Create the Admin Dashboard Controller

This controller combines Inventory, User Maint, and HR. Create `apps/api/src/modules/management/management.controller.ts`.

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { HRService } from './hr.service';
import { InventoryService } from '../products/inventory.service';
import { OrdersService } from '../orders/orders.service';

@Controller('management/dashboard')
export class ManagementController {
  constructor(
    private hrService: HRService,
    private inventoryService: InventoryService,
    private ordersService: OrdersService
  ) {}

  @Get('overview')
  async getOverview() {
    return {
      lowStock: await this.inventoryService.getLowStockItems(),
      pendingOrders: await this.ordersService.getPendingOrdersCount(),
      // payrollStatus: await this.hrService.getPayrollSummary(),
    };
  }
}
```

---

## 4. Deep Dive: Code Keyword Breakdown

#### 4.1 `Axios`

- **Definition**: A popular library for making "HTTP Requests" (talking to other websites).
- **The Logic**: We use Axios to "Call" the ADP servers across the internet and wait for their response.

#### 4.2 `OAuth Token`

- **The Logic**: Think of this as a "Temporary Badge." It expires every few hours. Our service must be smart enough to "Renew" the badge whenever it runs out.

#### 4.3 `Aggregation`

- **The Logic**: Our Dashboard Controller performs **Aggregation**. It gathers data from three different places (Mongo, Postgres, and the ADP API) and combines them into one single "Dashboard View" for the worker.

---

## 5. Verification & Learning Check

### 5.1 The "Privacy" Check

1.  **Check your Postgres Database**: Look at the `users` table. 
2.  **The Lesson**: Do you see payroll data? **No!** You should only see a `keycloakId` and an `adpId`. This proves your security architecture is protecting your employees.

### 6. Checklist for Success

- [ ] **Security**: Are your ADP API credentials stored in `.env.local`?
- [ ] **Orchestration**: Does your Dashboard Controller combine data from multiple sources?
- [ ] **Privacy**: Are you avoiding storing sensitive employee data in your own database?

**Moving Forward**: We have the entire backend ready—Security, Databases, Shipping, and HR! Now it's time to build the **User Interface (React)** so the world can see what we've built.


