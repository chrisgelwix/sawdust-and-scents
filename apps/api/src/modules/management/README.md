# Management Module

Admin dashboard and HR management functionality.

## Overview

Provides administrative capabilities including HR management, ADP integration, Keycloak user administration, and dashboard analytics.

## Responsibilities

- Admin dashboard data aggregation
- ADP employee data synchronization
- Keycloak user management
- Employee provisioning and deprovisioning
- HR analytics and reporting
- Payroll summary display

## Key Components

### ADPService (`adp.service.ts`)
Integration with ADP Workforce Now API:
- OAuth 2.0 authentication with ADP
- Fetch active employee data
- Retrieve payroll information
- Token caching for performance

**Key Methods:**
- `getAccessToken()`: Authenticates with ADP, caches token
- `getActiveEmployees()`: Fetches all active employees
- `getEmployeePayroll(employeeId)`: Gets payroll for specific employee
- `getPayrollSummary()`: Dashboard payroll overview

### KeycloakAdminService (`keycloak-admin.service.ts`)
Programmatic Keycloak user management:
- Create Keycloak users
- Search for existing users
- Update user information
- Assign roles and permissions
- Enable/disable users

**Key Methods:**
- `findUserByEmail(email)`: Search for user
- `createUser(userData)`: Create new Keycloak user
- `assignRole(userId, role)`: Add role to user
- `disableUser(userId)`: Deactivate user account

### HRService (`hr.service.ts`)
Orchestrates HR operations:
- Sync employees from ADP to Keycloak
- Handle new employee onboarding
- Process employee terminations
- Reconcile differences between systems

**Sync Logic:**
1. Fetch employees from ADP
2. For each ADP employee:
   - Search Keycloak by email
   - If not found: create new user
   - If found: update information
3. Assign appropriate roles based on job title/department

### ManagementController (`management.controller.ts`)
Admin API endpoints:
- Dashboard statistics
- Employee sync triggers
- HR reports
- System health checks

## Dependencies

- **ProductsModule**: Dashboard product metrics
- **OrdersModule**: Dashboard order analytics
- External APIs:
  - ADP Workforce Now
  - Keycloak Admin API

## Environment Variables

Required in `.env.local`:

```bash
# ADP Configuration
ADP_CLIENT_ID=your-adp-client-id
ADP_CLIENT_SECRET=your-adp-secret
ADP_TOKEN_URL=https://accounts.adp.com/auth/oauth/v2/token
ADP_API_URL=https://api.adp.com/hr/v2

# Keycloak Admin
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=sawdust-scents
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=admin-password
```

## API Endpoints

### Dashboard
```http
GET /management/dashboard
```
Returns aggregated dashboard data:
- Total products, orders, revenue
- Recent orders
- Inventory alerts
- Payroll summary

### Employee Sync
```http
POST /management/sync-employees
```
Triggers ADP → Keycloak employee synchronization

### HR Reports
```http
GET /management/employees
GET /management/payroll
```

## Security

All management endpoints require:
- ✅ Authentication (valid JWT token)
- ✅ Admin role (`@Roles('admin')`)
- ✅ HTTPS in production

## Employee Sync Flow

```
1. Admin triggers sync (or scheduled job)
    ↓
2. HRService fetches employees from ADP
    ↓
3. For each employee:
    ├─→ Check if Keycloak user exists
    ├─→ Create user if new
    ├─→ Update user if existing
    └─→ Assign roles based on job title
    ↓
4. Return sync report
```

## Error Handling

**ADP Integration Errors:**
- Token expiration: Auto-refresh with cached credentials
- API rate limits: Implement exponential backoff
- Network failures: Retry with timeout

**Keycloak Admin Errors:**
- User already exists: Update instead of create
- Invalid email: Skip and log error
- Permission denied: Verify admin credentials

## Testing

Mock external services in tests:

```typescript
const mockADPService = {
  getActiveEmployees: jest.fn().mockResolvedValue([
    { workerId: { idValue: 'ADP123' }, ... }
  ])
};

const mockKeycloakAdmin = {
  findUserByEmail: jest.fn().mockResolvedValue(null),
  createUser: jest.fn().mockResolvedValue('user-id')
};
```

## Performance Optimization

**Token Caching:**
- ADP tokens cached for ~55 minutes (5-minute buffer)
- Reduces authentication overhead

**Batch Operations:**
- Sync employees in batches of 50
- Prevents memory issues with large organizations

**Dashboard Aggregation:**
- Use `Promise.all()` for parallel queries
- Cache dashboard data for 5 minutes

## Scheduled Jobs

Future enhancement: Automated employee sync

```typescript
@Cron('0 2 * * *')  // 2 AM daily
async syncEmployeesJob() {
  await this.hrService.syncEmployees();
}
```

## Related Documentation

- `/docs/Development Steps/13-Admin Dashboard and ADP HR Integration.md`
- `/docs/Development Steps/13a-ADP Service Implementation.md`
- `/docs/Development Steps/13f-Keycloak Admin API and Sync Logic Tutorial.md`
- `/docs/Development Steps/13g-Dashboard Aggregation and Promise.all Tutorial.md`

## Troubleshooting

**ADP Authentication Failed:**
- Verify `ADP_CLIENT_ID` and `ADP_CLIENT_SECRET`
- Check ADP Developer Portal app status
- Ensure correct API permissions

**Keycloak User Creation Failed:**
- Verify admin credentials
- Check realm name is correct
- Ensure user doesn't already exist

**Dashboard Loading Slow:**
- Check database query performance
- Verify Promise.all usage for parallel queries
- Consider adding caching layer


