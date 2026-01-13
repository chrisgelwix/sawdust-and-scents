# Step 13b: Keycloak Admin Service Implementation

## Overview

The Keycloak Admin Service programmatically manages users in Keycloak. It handles creating users, assigning roles, searching for existing users, and updating user information - all through Keycloak's Admin REST API.

---

## Table of Contents

1. [Understanding the Keycloak Admin API](#1-understanding-the-keycloak-admin-api)
2. [Admin Authentication Strategy](#2-admin-authentication-strategy)
3. [Creating the Keycloak Interfaces](#3-creating-the-keycloak-interfaces)
4. [Implementing getAdminToken()](#4-implementing-getadmintoken)
5. [Implementing findUserByEmail()](#5-implementing-finduserbyemail)
6. [Implementing createUser()](#6-implementing-createuser)
7. [Implementing updateUser()](#7-implementing-updateuser)
8. [Implementing assignRole()](#8-implementing-assignrole)
9. [Password Generation](#9-password-generation)
10. [Testing the Keycloak Admin Service](#10-testing-the-keycloak-admin-service)

---

## 1. Understanding the Keycloak Admin API

### What is the Keycloak Admin API?

Keycloak provides a comprehensive REST API for managing users, roles, realms, and more. This is the **same API** the Keycloak web console uses behind the scenes.

### The Analogy: Two Doors to Keycloak

Think of Keycloak as having two entrances:

```
┌─────────────────────────────────────────┐
│           Keycloak Server               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Front Door (User Login)         │   │
│  │ /realms/sawdust-scents/...      │   │
│  │ Regular users log in here       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Back Door (Admin API)           │   │
│  │ /admin/realms/sawdust-scents/...│   │
│  │ System administrators only      │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Why Use the Admin API?

**Manual Process Without API:**

1. Admin logs into Keycloak console
2. Clicks "Add User"
3. Types in name, email, username
4. Sets temporary password
5. Assigns role
6. **Repeats for 50 new employees...** 😫

**Automated Process With API:**

1. Admin clicks "Sync Employees" button
2. System automatically creates all 50 employees in seconds ⚡
3. All get proper roles
4. All get temporary passwords
5. Welcome emails sent automatically

### Admin API Base Structure

```
Base URL: http://localhost:8080

User Endpoints (regular login):
  POST /realms/{realm}/protocol/openid-connect/token
  
Admin Endpoints (management):
  POST /admin/realms/master/protocol/openid-connect/token
  GET  /admin/realms/{realm}/users
  POST /admin/realms/{realm}/users
  PUT  /admin/realms/{realm}/users/{userId}
  GET  /admin/realms/{realm}/roles
  POST /admin/realms/{realm}/users/{userId}/role-mappings/realm
```

---

## 2. Admin Authentication Strategy

### How Keycloak Admin Authentication Works

Unlike ADP (which uses client credentials), Keycloak admin authentication uses the **Resource Owner Password Flow**:

```
┌─────────────┐                          ┌──────────────┐
│  Our API    │                          │   Keycloak   │
│  Server     │                          │              │
└──────┬──────┘                          └──────┬───────┘
       │                                        │
       │  1. POST /realms/master/token         │
       │     { username: admin,                │
       │       password: admin123,             │
       │       grant_type: password }          │
       │───────────────────────────────────────>│
       │                                        │
       │  2. { access_token, expires_in }      │
       │<───────────────────────────────────────│
       │                                        │
       │  3. GET /admin/realms/my-realm/users  │
       │     Authorization: Bearer <token>     │
       │───────────────────────────────────────>│
       │                                        │
       │  4. [user1, user2, ...]               │
       │<───────────────────────────────────────│
       │                                        │
```

### Master Realm vs Application Realm

Keycloak has two realms:

1. **Master Realm**: The "super admin" realm
   - Used for authentication to GET the admin token
   - Never use this for user login!
   
2. **Application Realm** (e.g., `sawdust-scents`):
   - Where your actual users live
   - Where you create/manage users

**The Pattern:**
- Authenticate against `master` realm
- Manage users in `sawdust-scents` realm

### Token Caching

Just like with ADP, we cache the admin token:

```typescript
private cachedAdminToken: string | null = null;
private adminTokenExpiration: Date | null = null;
```

**Why cache?**
- Admin operations happen frequently during sync
- Keycloak tokens expire quickly (default: 5 minutes)
- Avoids hammering Keycloak with auth requests

---

## 3. Creating the Keycloak Interfaces

### File: `apps/api/src/modules/management/keycloak-admin.service.ts`

Add this interface at the top:

```typescript
export interface KeycloakUser {
  id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  emailVerified: boolean;
  attributes?: Record<string, string[]>;
}
```

### Understanding the Interface

| Field | Type | Purpose |
|-------|------|---------|
| `id` | `string?` | Keycloak's internal user ID (returned after creation) |
| `username` | `string` | Login username |
| `email` | `string` | User's email address |
| `firstName` | `string` | User's first name |
| `lastName` | `string` | User's last name |
| `enabled` | `boolean` | Whether the account is active |
| `emailVerified` | `boolean` | Whether email is confirmed |
| `attributes` | `Record<string, string[]>` | Custom data (e.g., ADP ID, job title) |

### Why Attributes are Arrays

Keycloak attributes are **always arrays of strings**:

```typescript
// ✅ CORRECT
attributes: {
  adpId: ['ADP12345'],
  jobTitle: ['Production Manager'],
  department: ['Manufacturing']
}

// ❌ WRONG (will fail)
attributes: {
  adpId: 'ADP12345',      // Not an array!
  jobTitle: 'Manager'      // Not an array!
}
```

**Reason**: Keycloak supports multi-valued attributes (e.g., multiple phone numbers).

---

## 4. Implementing getAdminToken()

### Complete Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private cachedAdminToken: string | null = null;
  private adminTokenExpiration: Date | null = null;

  constructor(private config: ConfigService) {}

  /**
   * Get Keycloak admin token
   *
   * Uses the master realm admin account to perform user management operations.
   * Token is cached to avoid excessive authentication requests.
   *
   * @returns {Promise<string>} Valid admin access token
   */
  async getAdminToken(): Promise<string> {
    // Check if we have a valid cached token
    if (
      this.cachedAdminToken &&
      this.adminTokenExpiration &&
      new Date() < this.adminTokenExpiration
    ) {
      this.logger.debug('Using cached Keycloak admin token');
      return this.cachedAdminToken;
    }

    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = 'master'; // Use master realm for admin operations
    const adminUser = this.config.get<string>('KEYCLOAK_ADMIN');
    const adminPassword = this.config.get<string>('KEYCLOAK_ADMIN_PASSWORD');

    if (!adminUser || !adminPassword) {
      throw new Error('Keycloak admin credentials not configured');
    }

    try {
      this.logger.log('Requesting Keycloak admin token');

      const response = await axios.post(
        `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: adminUser,
          password: adminPassword,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.cachedAdminToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 300;
      this.adminTokenExpiration = new Date(
        Date.now() + (expiresIn - 60) * 1000
      );

      this.logger.log('Keycloak admin token obtained');
      return this.cachedAdminToken as string;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to obtain Keycloak admin token', error);
      throw new Error(`Keycloak admin authentication failed: ${errorMessage}`);
    }
  }
}
```

### Code Walkthrough

**1. Token Cache Check:**

```typescript
if (
  this.cachedAdminToken &&
  this.adminTokenExpiration &&
  new Date() < this.adminTokenExpiration
) {
  return this.cachedAdminToken;
}
```

Same pattern as ADP Service - return cached token if still valid.

**2. Master Realm Authentication:**

```typescript
const realm = 'master'; // Important! Authenticate against master
const response = await axios.post(
  `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
  ...
);
```

- Must use `master` realm for admin operations
- Uses `admin-cli` client (built-in Keycloak admin client)

**3. Password Grant Type:**

```typescript
new URLSearchParams({
  grant_type: 'password',    // Different from ADP!
  client_id: 'admin-cli',
  username: adminUser,
  password: adminPassword,
})
```

**ADP vs Keycloak:**
- **ADP**: `client_credentials` (server-to-server)
- **Keycloak**: `password` (username/password)

**4. Short Expiration:**

```typescript
const expiresIn = response.data.expires_in || 300; // Default 5 minutes
```

Keycloak admin tokens expire quickly (5 minutes vs ADP's 1 hour).

---

## 5. Implementing findUserByEmail()

### Complete Implementation

```typescript
/**
 * Find a Keycloak user by email
 *
 * @param {string} email - User's email address
 * @returns {Promise<KeycloakUser | null>} User object or null if not found
 */
async findUserByEmail(email: string): Promise<KeycloakUser | null> {
  const token = await this.getAdminToken();
  const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
  const realm = this.config.get<string>('KEYCLOAK_REALM'); // Use app realm!

  try {
    this.logger.debug(`Searching for user by email: ${email}`);
    const response = await axios.get(
      `${keycloakUrl}/admin/realms/${realm}/users`,
      {
        params: { email, exact: true },
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to find user by email: ${email}`, error);
    throw new Error(`Failed to search for user: ${errorMessage}`);
  }
}
```

### Code Walkthrough

**1. Application Realm:**

```typescript
const realm = this.config.get<string>('KEYCLOAK_REALM'); // sawdust-scents
```

Now we use the **application realm**, not master! This is where our users live.

**2. Query Parameters:**

```typescript
params: { email, exact: true }
```

- `email`: The email to search for
- `exact: true`: Must match exactly (not partial match)

**Without `exact: true`:**
```
Search: "john"
Results: john@test.com, johnny@test.com, john.smith@test.com
```

**With `exact: true`:**
```
Search: "john@test.com"
Results: john@test.com (only)
```

**3. Return First Match:**

```typescript
return response.data.length > 0 ? response.data[0] : null;
```

- Keycloak returns an array (even for single matches)
- Email should be unique, so take first result
- Return `null` if no matches found

---

## 6. Implementing createUser()

### Complete Implementation

```typescript
/**
 * Create a new Keycloak user
 *
 * @param {Partial<KeycloakUser>} userData - User data to create
 * @param {string} temporaryPassword - Initial password (user must change on first login)
 * @returns {Promise<string>} ID of the created user
 */
async createUser(
  userData: Partial<KeycloakUser>,
  temporaryPassword: string
): Promise<string> {
  const token = await this.getAdminToken();
  const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
  const realm = this.config.get<string>('KEYCLOAK_REALM');

  const newUserData = {
    ...userData,
    credentials: [
      {
        type: 'password',
        value: temporaryPassword,
        temporary: true, // User must change on first login
      },
    ],
  };

  try {
    this.logger.log(`Creating Keycloak user: ${userData.email}`);
    const response = await axios.post(
      `${keycloakUrl}/admin/realms/${realm}/users`,
      newUserData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract user ID from Location header
    const locationHeader = response.headers.location;
    const userId = locationHeader?.split('/').pop();

    if (!userId) {
      throw new Error('Failed to extract user ID from response');
    }

    this.logger.log(
      `User created successfully: ${userData.email} (ID: ${userId})`
    );
    return userId;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to create user: ${userData.email}`, error);
    throw new Error(`Failed to create Keycloak user: ${errorMessage}`);
  }
}
```

### Code Walkthrough

**1. Temporary Password:**

```typescript
credentials: [
  {
    type: 'password',
    value: temporaryPassword,
    temporary: true,  // Forces password change on first login
  },
],
```

**Why `temporary: true`?**
- Security best practice
- User must set their own password
- Prevents sharing of default passwords

**2. Extract User ID from Location Header:**

```typescript
const locationHeader = response.headers.location;
const userId = locationHeader?.split('/').pop();
```

Keycloak returns the user ID in the `Location` header:

```
Location: http://localhost:8080/admin/realms/sawdust-scents/users/12345-abcd-6789
```

We extract the last part: `12345-abcd-6789`

**3. Why Return User ID?**

```typescript
return userId;
```

We need the user ID to:
- Assign roles (next step)
- Update user information later
- Link to our database records

---

## 7. Implementing updateUser()

### Complete Implementation

```typescript
/**
 * Update an existing Keycloak user
 *
 * @param {string} userId - Keycloak user ID
 * @param {Partial<KeycloakUser>} userData - Data to update
 * @returns {Promise<void>}
 */
async updateUser(
  userId: string,
  userData: Partial<KeycloakUser>
): Promise<void> {
  const token = await this.getAdminToken();
  const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
  const realm = this.config.get<string>('KEYCLOAK_REALM');

  try {
    this.logger.debug(`Updating Keycloak user: ${userId}`);

    await axios.put(
      `${keycloakUrl}/admin/realms/${realm}/users/${userId}`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    this.logger.log(`User updated successfully: ${userId}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to update user: ${userId}`, error);
    throw new Error(`Failed to update Keycloak user: ${errorMessage}`);
  }
}
```

### Usage Example

```typescript
// Update user's job title when it changes in ADP
await keycloakAdminService.updateUser(userId, {
  attributes: {
    jobTitle: ['Senior Manager'],  // Remember: must be an array!
    syncedAt: [new Date().toISOString()],
  },
});
```

### Partial Updates

The `Partial<KeycloakUser>` type means you only need to send changed fields:

```typescript
// ✅ Update only email
await updateUser(userId, { email: 'newemail@test.com' });

// ✅ Update only attributes
await updateUser(userId, {
  attributes: { department: ['Sales'] }
});

// ✅ Update multiple fields
await updateUser(userId, {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@test.com'
});
```

---

## 8. Implementing assignRole()

### Complete Implementation

```typescript
/**
 * Assign a role to a user
 *
 * @param {string} userId - Keycloak user ID
 * @param {string} roleName - Name of the role to assign (e.g., 'worker', 'admin')
 * @returns {Promise<void>}
 */
async assignRole(userId: string, roleName: string): Promise<void> {
  const token = await this.getAdminToken();
  const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
  const realm = this.config.get<string>('KEYCLOAK_REALM');

  try {
    // Step 1: Get the role definition
    const rolesResponse = await axios.get(
      `${keycloakUrl}/admin/realms/${realm}/roles`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const role = rolesResponse.data.find((r: any) => r.name === roleName);

    if (!role) {
      throw new Error(`Role '${roleName}' not found in realm`);
    }

    // Step 2: Assign the role to the user
    await axios.post(
      `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
      [role],
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    this.logger.log(`Role '${roleName}' assigned to user: ${userId}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(
      `Failed to assign role '${roleName}' to user: ${userId}`,
      error
    );
    throw new Error(`Failed to assign role: ${errorMessage}`);
  }
}
```

### Code Walkthrough

**Why Two Steps?**

1. **Get Role Definition**: Keycloak needs the full role object (not just the name)
2. **Assign Role**: Send the role object to the user's role mappings

**Step 1: Find the Role:**

```typescript
const rolesResponse = await axios.get(`.../roles`);
const role = rolesResponse.data.find((r: any) => r.name === roleName);
```

Returns something like:

```json
{
  "id": "role-uuid-123",
  "name": "worker",
  "description": "Worker role",
  "composite": false
}
```

**Step 2: Assign the Role:**

```typescript
await axios.post(
  `.../users/${userId}/role-mappings/realm`,
  [role],  // Must be an array!
  ...
);
```

**Note**: The body is an array because you can assign multiple roles at once.

### Realm Roles vs Client Roles

This implementation uses **realm roles** (roles that apply to the entire realm).

- **Realm Roles**: Apply to all clients in the realm (`/role-mappings/realm`)
- **Client Roles**: Apply to specific clients (`/role-mappings/clients/{clientId}`)

For "Sawdust and Scents," realm roles are sufficient.

---

## 9. Password Generation

### Complete Implementation

```typescript
/**
 * Generate a secure temporary password
 *
 * @param {number} length - Length of password (default: 16)
 * @returns {string} Random secure password
 */
generateTemporaryPassword(length: number = 16): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  });
  
  return password;
}
```

### Security Considerations

**Character Set:**

```typescript
'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
```

- Lowercase letters (26)
- Uppercase letters (26)
- Numbers (10)
- Special characters (8)
- **Total: 70 possible characters**

**Password Strength:**

```
16 characters with 70 possibilities each:
70^16 = 3.36 × 10^29 possible passwords

Time to crack (at 1 billion attempts/second):
10^29 / 10^9 / 60 / 60 / 24 / 365 = 10 trillion years
```

**Why Temporary Passwords are OK:**

1. User must change it on first login (`temporary: true`)
2. Only used once
3. Sent via secure channel (not email, ideally)

### Production-Grade Alternative

For production, consider using a crypto-secure generator:

```typescript
import { randomBytes } from 'crypto';

generateTemporaryPassword(length: number = 16): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomValues = randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  
  return password;
}
```

---

## 10. Testing the Keycloak Admin Service

### 10.1 Unit Tests

Create `apps/api/src/modules/management/keycloak-admin.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KeycloakAdminService } from './keycloak-admin.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KeycloakAdminService', () => {
  let service: KeycloakAdminService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        KeycloakAdminService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                KEYCLOAK_URL: 'http://localhost:8080',
                KEYCLOAK_ADMIN: 'admin',
                KEYCLOAK_ADMIN_PASSWORD: 'admin',
                KEYCLOAK_REALM: 'sawdust-scents',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<KeycloakAdminService>(KeycloakAdminService);
  });

  it('should cache admin tokens', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'admin_token', expires_in: 300 },
    });

    const token1 = await service.getAdminToken();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    const token2 = await service.getAdminToken();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still 1!
    expect(token1).toBe(token2);
  });

  it('should find user by email', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'token', expires_in: 300 },
    });

    mockedAxios.get.mockResolvedValue({
      data: [
        {
          id: 'user-123',
          username: 'john_worker',
          email: 'john@test.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      ],
    });

    const user = await service.findUserByEmail('john@test.com');
    expect(user).not.toBeNull();
    expect(user?.email).toBe('john@test.com');
  });

  it('should create user and return ID', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: { access_token: 'token', expires_in: 300 },
      })
      .mockResolvedValueOnce({
        headers: {
          location: 'http://localhost:8080/admin/realms/test/users/new-user-123',
        },
      });

    const userId = await service.createUser(
      {
        username: 'testuser',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        enabled: true,
        emailVerified: true,
      },
      'TempPass123!'
    );

    expect(userId).toBe('new-user-123');
  });

  it('should generate secure passwords', () => {
    const password = service.generateTemporaryPassword();
    expect(password).toHaveLength(16);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
  });
});
```

### 10.2 Integration Test

Test against a real Keycloak instance:

```bash
# Start Keycloak in Docker
docker run -d -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

Then run integration tests:

```typescript
describe('KeycloakAdminService (Integration)', () => {
  let service: KeycloakAdminService;

  beforeAll(async () => {
    // Real config pointing to Docker Keycloak
    const module = await Test.createTestingModule({
      providers: [
        KeycloakAdminService,
        ConfigService,
      ],
    }).compile();

    service = module.get<KeycloakAdminService>(KeycloakAdminService);
  });

  it('should authenticate and create user', async () => {
    const userId = await service.createUser(
      {
        username: 'integration_test_user',
        email: 'test@integration.com',
        firstName: 'Integration',
        lastName: 'Test',
        enabled: true,
        emailVerified: false,
      },
      'TempPassword123!'
    );

    expect(userId).toBeTruthy();

    // Cleanup
    // (In real tests, you'd delete the user here)
  }, 10000); // 10 second timeout for network calls
});
```

### 10.3 Manual Testing with Keycloak Admin Console

1. **Login to Keycloak**:
   ```
   http://localhost:8080
   Username: admin
   Password: admin
   ```

2. **Create a Realm**: `sawdust-scents`

3. **Create Roles**:
   - Go to "Realm Roles"
   - Create `worker` role
   - Create `admin` role

4. **Test Your Service**:
   ```typescript
   const userId = await keycloakAdminService.createUser({
     username: 'test_worker',
     email: 'worker@test.com',
     firstName: 'Test',
     lastName: 'Worker',
     enabled: true,
     emailVerified: true,
   }, 'TempPass123!');

   await keycloakAdminService.assignRole(userId, 'worker');
   ```

5. **Verify in Admin Console**:
   - Go to "Users"
   - Find `test_worker`
   - Check "Role Mappings" tab
   - Should see `worker` role assigned

---

## 11. Complete Service Code

Here's the full `KeycloakAdminService` implementation:

**File: `apps/api/src/modules/management/keycloak-admin.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface KeycloakUser {
  id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  emailVerified: boolean;
  attributes?: Record<string, string[]>;
}

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private cachedAdminToken: string | null = null;
  private adminTokenExpiration: Date | null = null;

  constructor(private config: ConfigService) {}

  async getAdminToken(): Promise<string> {
    if (
      this.cachedAdminToken &&
      this.adminTokenExpiration &&
      new Date() < this.adminTokenExpiration
    ) {
      this.logger.debug('Using cached Keycloak admin token');
      return this.cachedAdminToken;
    }

    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = 'master';
    const adminUser = this.config.get<string>('KEYCLOAK_ADMIN');
    const adminPassword = this.config.get<string>('KEYCLOAK_ADMIN_PASSWORD');

    if (!adminUser || !adminPassword) {
      throw new Error('Keycloak admin credentials not configured');
    }

    try {
      this.logger.log('Requesting Keycloak admin token');

      const response = await axios.post(
        `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: adminUser,
          password: adminPassword,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.cachedAdminToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 300;
      this.adminTokenExpiration = new Date(
        Date.now() + (expiresIn - 60) * 1000
      );

      this.logger.log('Keycloak admin token obtained');
      return this.cachedAdminToken as string;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to obtain Keycloak admin token', error);
      throw new Error(`Keycloak admin authentication failed: ${errorMessage}`);
    }
  }

  async findUserByEmail(email: string): Promise<KeycloakUser | null> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');

    try {
      this.logger.debug(`Searching for user by email: ${email}`);
      const response = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        {
          params: { email, exact: true },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find user by email: ${email}`, error);
      throw new Error(`Failed to search for user: ${errorMessage}`);
    }
  }

  async createUser(
    userData: Partial<KeycloakUser>,
    temporaryPassword: string
  ): Promise<string> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');

    const newUserData = {
      ...userData,
      credentials: [
        {
          type: 'password',
          value: temporaryPassword,
          temporary: true,
        },
      ],
    };

    try {
      this.logger.log(`Creating Keycloak user: ${userData.email}`);
      const response = await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        newUserData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const locationHeader = response.headers.location;
      const userId = locationHeader?.split('/').pop();

      if (!userId) {
        throw new Error('Failed to extract user ID from response');
      }

      this.logger.log(
        `User created successfully: ${userData.email} (ID: ${userId})`
      );
      return userId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create user: ${userData.email}`, error);
      throw new Error(`Failed to create Keycloak user: ${errorMessage}`);
    }
  }

  async updateUser(
    userId: string,
    userData: Partial<KeycloakUser>
  ): Promise<void> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');

    try {
      this.logger.debug(`Updating Keycloak user: ${userId}`);

      await axios.put(
        `${keycloakUrl}/admin/realms/${realm}/users/${userId}`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`User updated successfully: ${userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update user: ${userId}`, error);
      throw new Error(`Failed to update Keycloak user: ${errorMessage}`);
    }
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');

    try {
      const rolesResponse = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/roles`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const role = rolesResponse.data.find((r: any) => r.name === roleName);

      if (!role) {
        throw new Error(`Role '${roleName}' not found in realm`);
      }

      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
        [role],
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Role '${roleName}' assigned to user: ${userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to assign role '${roleName}' to user: ${userId}`,
        error
      );
      throw new Error(`Failed to assign role: ${errorMessage}`);
    }
  }

  generateTemporaryPassword(length: number = 16): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
```

---

## 12. Key Takeaways

### What You Learned

1. **Keycloak Admin API**: Programmatic user management
2. **Master vs Application Realms**: When to use each
3. **Password Grant Type**: Different from client credentials
4. **Role Assignment**: Two-step process (find role, assign role)
5. **Temporary Passwords**: Security best practice

### Best Practices Applied

- ✅ Token caching for performance
- ✅ Temporary passwords for security
- ✅ Comprehensive error handling
- ✅ Proper TypeScript typing
- ✅ Debug vs info logging
- ✅ Extraction of user ID from headers

---

## 13. Next Steps

Now that the Keycloak Admin Service is complete, proceed to:

➡️ **Step 13c: HR Service and Missing Methods**

This will cover:
- Orchestrating ADP and Keycloak services
- Implementing the employee sync logic
- Adding missing methods to InventoryService and OrdersService

---

## 14. Troubleshooting

### Issue: "Keycloak admin authentication failed"

**Solution:**
1. Verify Keycloak is running: `http://localhost:8080`
2. Check credentials in `.env.local`
3. Ensure you're using `master` realm for authentication

### Issue: "Role 'worker' not found in realm"

**Solution:**
1. Login to Keycloak admin console
2. Select your realm (`sawdust-scents`)
3. Go to "Realm Roles"
4. Create the missing role

### Issue: "Failed to extract user ID from response"

**Solution:**
1. Check if Keycloak is returning `Location` header
2. Verify API version compatibility
3. Log the full response to debug

---

**Congratulations!** You've built a robust Keycloak Admin Service. Continue to Step 13c →


