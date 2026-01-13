# Step 13: Admin Management and ADP HR Integration - Overview

## 1. The "Why" Behind This Step: The Corporate Backbone

A successful business needs to take care of its workers just as well as its customers. For "Sawdust and Scents" to grow, we need to manage our employees, their payroll, and their HR data professionally.

**The Problem**: Handling payroll, taxes, and employee benefits is a legal and accounting nightmare. You should never build your own payroll system.

**The Solution**: We integrate with **ADP**.

- **The Analogy**: Imagine ADP as your "Virtual HR Department."
  - Instead of keeping employee Social Security numbers and bank details on your server (which is dangerous!), you let the experts at ADP handle it.
  - Our Admin Page simply "Asks" ADP: "How many hours did Chris work this week?" or "Is Sarah's payroll processed?"

---

## 2. What We're Building

By the end of this multi-part module, you'll have:

1. **ADP Service** - Handles OAuth authentication and fetches employee/payroll data from ADP
2. **Keycloak Admin Service** - Programmatically creates and manages users in Keycloak
3. **HR Service** - Orchestrates employee synchronization between ADP and Keycloak
4. **Management Controller** - Provides admin dashboard endpoints that aggregate data from multiple sources
5. **Missing Service Methods** - Completes inventory and orders services needed for the dashboard

---

## 3. Core Concepts & Definitions

### 3.1 OAuth 2.0 (The Security Handshake)

- **Definition**: A secure way for two websites to talk about a user without sharing their password.
- **The Logic**: To talk to ADP, our server gets a "Secret Ticket" (an Access Token). We show this ticket every time we ask for HR data.

### 3.2 PII (Personally Identifiable Information)

- **Definition**: Sensitive data like Home Addresses or Social Security numbers.
- **The Logic**: Because we use ADP, our database **never** stores PII. We only store the "ADP ID." This protects "Sawdust and Scents" from massive legal liability if our server is ever hacked.

### 3.3 Service Architecture (Separation of Concerns)

Before we dive into code, let's understand our refactored architecture:

```
┌─────────────────────────────────────────────┐
│         ManagementController                │
│  (Handles HTTP requests from admin UI)      │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│           HRService (Orchestrator)          │
│  • syncEmployees()                          │
│  • Coordinates ADP ↔ Keycloak sync          │
└──────┬──────────────────────────┬───────────┘
       │                          │
       ↓                          ↓
┌──────────────────┐    ┌─────────────────────┐
│   ADPService     │    │ KeycloakAdminService│
│ • OAuth tokens   │    │ • User creation     │
│ • Get employees  │    │ • Role assignment   │
│ • Payroll data   │    │ • User search       │
└──────────────────┘    └─────────────────────┘
```

**Why Three Services?**

- **Separation of Concerns**: Each service has one job
- **Testability**: Mock external services independently
- **Reusability**: Use `KeycloakAdminService` in other modules
- **Maintainability**: Easier to debug and extend

---

## 4. Multi-Database Aggregation

Our admin dashboard pulls data from **three different sources**:

```
┌─────────────────────────────────────────────────────────┐
│              Admin Dashboard Overview                    │
│  "Show me everything important at a glance"             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────┐
│         ManagementController.getOverview()               │
│  Aggregates data from three different sources            │
└───┬──────────────────┬──────────────────┬───────────────┘
    │                  │                  │
    ↓                  ↓                  ↓
┌─────────┐    ┌──────────────┐    ┌──────────────┐
│ MongoDB │    │  PostgreSQL  │    │   ADP API    │
│         │    │              │    │  (External)  │
├─────────┤    ├──────────────┤    ├──────────────┤
│Products │    │    Orders    │    │   Payroll    │
│Inventory│    │              │    │  Employees   │
└─────────┘    └──────────────┘    └──────────────┘
```

**Key Concepts:**

- **Parallel Requests**: We use `Promise.all()` to fetch from all three sources simultaneously
- **Graceful Degradation**: If ADP is down, the dashboard still shows inventory and orders
- **Single Unified Response**: The frontend gets one JSON object with all dashboard data

---

## 5. Module Breakdown

This is a large module, so we've broken it into digestible parts:

| Module  | Topic                          | What You'll Build                                          |
| ------- | ------------------------------ | ---------------------------------------------------------- |
| **13a** | ADP Service                    | OAuth authentication, fetch employees and payroll from ADP |
| **13b** | Keycloak Admin Service         | Programmatically create users, assign roles, search users  |
| **13c** | HR Service & Missing Methods   | Sync employees, complete inventory/orders service methods  |
| **13d** | Management Controller & Module | Wire everything together, create dashboard endpoints       |
| **13e** | ADP Query Syntax Tutorial      | Deep dive into OData queries used by ADP                   |
| **13f** | Keycloak Admin API Tutorial    | Understand Keycloak's admin API and sync logic             |
| **13g** | Dashboard Aggregation Tutorial | Master `Promise.all()` and data aggregation patterns       |

---

## 6. Prerequisites

Before proceeding with this module, ensure you have completed:

- ✅ Step 11: Product and Inventory Management (base structure)
- ✅ Step 12: Order Fulfillment (base structure)
- ✅ Step 6: Keycloak Authentication Integration

You should have:

- MongoDB running with Product collection
- PostgreSQL running with Orders table
- Keycloak running and configured

---

## 7. Environment Configuration

Add the following to your `apps/api/.env.local`:

```bash
# ADP Configuration
ADP_CLIENT_ID=your_adp_client_id
ADP_CLIENT_SECRET=your_adp_client_secret
ADP_TOKEN_URL=https://accounts.adp.com/auth/oauth/v2/token
ADP_API_URL=https://api.adp.com/hr/v2

# Keycloak Admin Configuration (for programmatic user management)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_REALM=sawdust-scents
```

**Important Notes:**

- **ADP Credentials**: You'll need to register for an ADP Developer account and create an application
- **Keycloak Admin**: These credentials allow our API to create/manage users programmatically
- **Security**: Never commit these values to Git! Keep them in `.env.local` (which is in `.gitignore`)

---

## 8. Learning Objectives

By completing this module series, you will understand:

1. **OAuth 2.0 Client Credentials Flow** - How to authenticate server-to-server
2. **Token Caching** - Optimize API calls by caching access tokens
3. **Service Orchestration** - Coordinate multiple services to accomplish complex tasks
4. **Keycloak Admin API** - Programmatically manage users and roles
5. **Data Aggregation** - Combine data from multiple sources efficiently
6. **Graceful Error Handling** - Build resilient systems that degrade gracefully
7. **Security Best Practices** - Keep sensitive data out of your database

---

## 9. Security Principles

### 9.1 Never Store Sensitive Data

**DON'T:**

```typescript
// ❌ BAD - Storing SSN in your database
await this.usersRepo.save({
  email: 'worker@company.com',
  ssn: '123-45-6789', // NEVER DO THIS!
  bankAccount: '9876543210', // NEVER DO THIS!
});
```

**DO:**

```typescript
// ✅ GOOD - Only store references
await this.usersRepo.save({
  email: 'worker@company.com',
  adpId: 'ADP12345', // Reference to ADP record
  keycloakId: 'uuid-here', // Reference to Keycloak user
});
```

### 9.2 Token Security

- **Cache Tokens**: Don't request new tokens for every API call
- **Expiration Buffers**: Refresh tokens before they expire (e.g., 5 minutes early)
- **Never Log Tokens**: Keep access tokens out of your application logs
- **Use HTTPS**: Always use HTTPS in production (ADP requires it)

---

## 10. Testing Strategy

### 10.1 Unit Tests

Test each service in isolation:

```typescript
describe('ADPService', () => {
  it('should cache access tokens', async () => {
    const token1 = await adpService.getAccessToken();
    const token2 = await adpService.getAccessToken();
    expect(token1).toBe(token2); // Should return same cached token
  });
});
```

### 10.2 Integration Tests

Test the sync flow end-to-end:

```typescript
describe('HRService', () => {
  it('should sync employees from ADP to Keycloak', async () => {
    const stats = await hrService.syncEmployees();
    expect(stats.created).toBeGreaterThan(0);
    expect(stats.errors).toHaveLength(0);
  });
});
```

### 10.3 Manual Testing

Use curl to test endpoints:

```bash
# Test dashboard overview
curl -X GET "http://localhost:3000/api/management/dashboard/overview" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"

# Test employee sync
curl -X POST "http://localhost:3000/api/management/employees/sync" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 11. Next Steps

Now that you understand the architecture and objectives, proceed to:

➡️ **Step 13a: ADP Service Implementation** - Build the foundation for ADP integration

This module will guide you through:

- Setting up OAuth 2.0 authentication
- Implementing token caching
- Fetching employee and payroll data from ADP
- Proper error handling and logging

---

## 12. Quick Reference

### Key Files Created in This Module Series

```
apps/api/src/modules/management/
├── adp.service.ts              # ADP API integration
├── keycloak-admin.service.ts   # Keycloak user management
├── hr.service.ts               # Employee sync orchestration
├── management.controller.ts    # Dashboard endpoints
└── management.module.ts        # Module configuration

apps/api/src/modules/products/
└── inventory.service.ts        # + getLowStockItems()

apps/api/src/modules/orders/
└── orders.service.ts           # + getPendingOrdersCount()
```

### Key Endpoints

| Method | Endpoint                             | Purpose                             |
| ------ | ------------------------------------ | ----------------------------------- |
| GET    | `/api/management/dashboard/overview` | Get aggregated dashboard data       |
| POST   | `/api/management/employees/sync`     | Sync employees from ADP to Keycloak |

### Required Roles

All management endpoints require the `admin` role from Keycloak.

---

**Ready? Let's build! Continue to Step 13a →**
