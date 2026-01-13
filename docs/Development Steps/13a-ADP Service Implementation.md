# Step 13a: ADP Service Implementation

## Overview

The ADP Service is responsible for all communication with the ADP API, including OAuth authentication, fetching employee data, and retrieving payroll information. This service handles token caching to minimize unnecessary authentication requests.

---

## Table of Contents

1. [Understanding the ADP Service Responsibilities](#1-understanding-the-adp-service-responsibilities)
2. [OAuth 2.0 Client Credentials Flow](#2-oauth-20-client-credentials-flow)
3. [Token Caching Strategy](#3-token-caching-strategy)
4. [Creating the ADP Interface](#4-creating-the-adp-interface)
5. [Implementing getAccessToken()](#5-implementing-getaccesstoken)
6. [Implementing getActiveEmployees()](#6-implementing-getactiveemployees)
7. [Implementing Payroll Methods](#7-implementing-payroll-methods)
8. [Error Handling and Logging](#8-error-handling-and-logging)
9. [Testing the ADP Service](#9-testing-the-adp-service)

---

## 1. Understanding the ADP Service Responsibilities

The ADP Service has **one clear responsibility**: talk to ADP's API.

### Single Responsibility Principle

```
❌ BAD: HR Service does everything
┌────────────────────────┐
│     HRService          │
│ - Get ADP token        │
│ - Fetch employees      │
│ - Create Keycloak users│
│ - Assign roles         │
│ - Sync logic           │
└────────────────────────┘
Too many responsibilities!

✅ GOOD: Separated services
┌──────────────┐  ┌───────────────────┐  ┌─────────────┐
│  ADPService  │  │ KeycloakAdminSvc  │  │  HRService  │
│ - OAuth      │  │ - Create users    │  │ - Sync      │
│ - Get data   │  │ - Assign roles    │  │ - Orchestrate
└──────────────┘  └───────────────────┘  └─────────────┘
Each service has ONE job!
```

### What the ADP Service Does

1. **Authentication**: Get and cache OAuth 2.0 access tokens
2. **Employee Data**: Fetch active employees with their details
3. **Payroll Data**: Retrieve payroll information for dashboard

### What the ADP Service Does NOT Do

- ❌ Create Keycloak users (that's `KeycloakAdminService`)
- ❌ Sync logic (that's `HRService`)
- ❌ Business rules (that's the controller/service using it)

---

## 2. OAuth 2.0 Client Credentials Flow

### What is OAuth 2.0?

OAuth 2.0 is a security protocol that lets two servers talk to each other securely without sharing passwords.

### The Analogy: Hotel Key Cards

Imagine ADP is a hotel and you're a guest:

1. **Check-in** (Authentication): You show your ID at the front desk
2. **Get Key Card** (Access Token): They give you a key card
3. **Access Room** (API Calls): You use the key card to open doors
4. **Key Expires** (Token Expiration): Key card stops working at checkout time
5. **Re-issue Key** (Token Refresh): If you extend your stay, get a new card

### Client Credentials Flow Diagram

```
┌─────────────┐                           ┌─────────────┐
│  Our API    │                           │  ADP Server │
│  Server     │                           │             │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │  1. POST /auth/oauth/v2/token          │
       │     { client_id, client_secret }       │
       │────────────────────────────────────────>│
       │                                         │
       │  2. { access_token, expires_in }       │
       │<────────────────────────────────────────│
       │                                         │
       │  3. GET /hr/v2/workers                 │
       │     Authorization: Bearer <token>      │
       │────────────────────────────────────────>│
       │                                         │
       │  4. { workers: [...] }                 │
       │<────────────────────────────────────────│
       │                                         │
```

**Key Points:**

- **Step 1-2**: We exchange `client_id` and `client_secret` for an `access_token`
- **Step 3-4**: We use the `access_token` to make API requests
- **Token Lifespan**: Tokens typically last 1-2 hours before expiring

---

## 3. Token Caching Strategy

### The Problem: Too Many Token Requests

**Without Caching:**

```typescript
// ❌ BAD - Requests new token every time
async getEmployees() {
  const token = await this.getAccessToken(); // Calls ADP
  return this.fetchData(token);
}

async getPayroll() {
  const token = await this.getAccessToken(); // Calls ADP AGAIN
  return this.fetchPayroll(token);
}

// Result: 100 API calls = 100 token requests to ADP 😫
```

**With Caching:**

```typescript
// ✅ GOOD - Caches token in memory
private cachedToken: string | null = null;
private tokenExpiration: Date | null = null;

async getAccessToken() {
  // If we have a valid cached token, use it
  if (this.cachedToken && new Date() < this.tokenExpiration) {
    return this.cachedToken;
  }
  
  // Otherwise, get a new token
  this.cachedToken = await this.fetchNewToken();
  return this.cachedToken;
}

// Result: 100 API calls = 1 token request to ADP ⚡
```

### Expiration Buffer

We refresh tokens **before** they expire to avoid edge cases:

```typescript
const expiresIn = 3600; // Token lasts 1 hour (3600 seconds)
const buffer = 300;     // Refresh 5 minutes early (300 seconds)

this.tokenExpiration = new Date(Date.now() + (expiresIn - buffer) * 1000);
```

**Why a Buffer?**
- Prevents race conditions (token expiring mid-request)
- Accounts for clock skew between servers
- Gives time for network delays

---

## 4. Creating the ADP Interface

First, create the TypeScript interface that represents an ADP employee.

### File: `apps/api/src/modules/management/adp.service.ts`

Add this at the top of the file:

```typescript
export interface ADPEmployee {
  workerId: { idValue: string };
  person: {
    legalName: {
      givenName: string;
      familyName1: string;
    };
    communication: {
      emails: Array<{ emailUri: string }>;
    };
    workAssignment?: Array<{ jobTitle?: string }>;
  };
}
```

### Understanding the Interface

This mirrors ADP's actual API response structure:

```json
{
  "workers": [
    {
      "workerId": { "idValue": "ADP123" },
      "person": {
        "legalName": {
          "givenName": "Sarah",
          "familyName1": "Johnson"
        },
        "communication": {
          "emails": [
            { "emailUri": "sarah@sawdustandscents.com" }
          ]
        },
        "workAssignment": [
          { "jobTitle": "Production Manager" }
        ]
      }
    }
  ]
}
```

**Why These Specific Fields?**

- `workerId.idValue`: Unique identifier in ADP (we'll store this reference)
- `person.legalName`: Employee's legal name for Keycloak
- `person.communication.emails[0].emailUri`: Primary email (used to find/create Keycloak user)
- `person.workAssignment[0].jobTitle`: Job title for our records

---

## 5. Implementing getAccessToken()

### Complete Implementation

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ADPService {
  private readonly logger = new Logger(ADPService.name);
  private cachedToken: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor(private config: ConfigService) {}

  /**
   * Get OAuth2 Access Token from ADP
   * 
   * Implements token caching to minimize authentication requests.
   * Tokens are refreshed automatically before expiration.
   * 
   * @returns {Promise<string>} Valid ADP access token
   */
  async getAccessToken(): Promise<string> {
    // If we have a cached token that hasn't expired, use it
    if (
      this.cachedToken &&
      this.tokenExpiration &&
      new Date() < this.tokenExpiration
    ) {
      this.logger.debug('Using cached ADP access token');
      return this.cachedToken;
    }

    const clientId = this.config.get<string>('ADP_CLIENT_ID');
    const clientSecret = this.config.get<string>('ADP_CLIENT_SECRET');
    const adpTokenUrl =
      this.config.get<string>('ADP_TOKEN_URL') ||
      'https://accounts.adp.com/auth/oauth/v2/token';

    if (!clientId || !clientSecret) {
      throw new Error(
        'ADP credentials not configured. Set ADP_CLIENT_ID and ADP_CLIENT_SECRET in .env.local'
      );
    }

    try {
      this.logger.log('Requesting new access token from ADP');

      const response = await axios.post(
        adpTokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.cachedToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600; // Default to 1 hour

      // Calculate when the token will expire (with 5-minute buffer)
      this.tokenExpiration = new Date(Date.now() + (expiresIn - 300) * 1000);

      this.logger.log(
        `ADP access token obtained, expires at ${this.tokenExpiration.toISOString()}`
      );
      return this.cachedToken as string;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to obtain ADP access token', error);
      throw new Error(`ADP authentication failed: ${errorMessage}`);
    }
  }
}
```

### Code Walkthrough

**1. Token Cache Check:**

```typescript
if (
  this.cachedToken &&
  this.tokenExpiration &&
  new Date() < this.tokenExpiration
) {
  return this.cachedToken; // Return cached token
}
```

- First checks if we have a cached token
- Then checks if it's still valid (not expired)
- If both true, returns immediately (no API call!)

**2. Configuration Validation:**

```typescript
if (!clientId || !clientSecret) {
  throw new Error('ADP credentials not configured...');
}
```

- Fail fast if credentials are missing
- Provides helpful error message

**3. OAuth Token Request:**

```typescript
const response = await axios.post(
  adpTokenUrl,
  new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }),
  {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }
);
```

- `grant_type: 'client_credentials'`: We're a server (not a user)
- `URLSearchParams`: Formats data as `key1=value1&key2=value2`
- `Content-Type: application/x-www-form-urlencoded`: Required by OAuth spec

**4. Expiration Calculation:**

```typescript
const expiresIn = response.data.expires_in || 3600;
this.tokenExpiration = new Date(Date.now() + (expiresIn - 300) * 1000);
```

- `expiresIn`: Seconds until token expires (typically 3600 = 1 hour)
- `expiresIn - 300`: Subtract 300 seconds (5 minutes) for safety buffer
- `* 1000`: Convert seconds to milliseconds for JavaScript Date

---

## 6. Implementing getActiveEmployees()

### Complete Implementation

Add this method to the `ADPService` class:

```typescript
/**
 * Get all active employees from ADP
 * 
 * Fetches workers with 'Active' status and selects only the fields we need.
 * Uses OData query syntax for filtering and field selection.
 * 
 * @returns {Promise<ADPEmployee[]>} Array of active employees
 */
async getActiveEmployees(): Promise<ADPEmployee[]> {
  const token = await this.getAccessToken();
  const adpApiUrl =
    this.config.get<string>('ADP_API_URL') || 'https://api.adp.com/hr/v2';

  try {
    const response = await axios.get(`${adpApiUrl}/workers`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      params: {
        $filter:
          "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'",
        $select:
          'workerId,person/legalName,person/communication/emails,person/workAssignment',
      },
    });

    return response.data.workers || [];
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.error('Failed to fetch employees from ADP', error);
    throw new Error(`Failed to fetch ADP employees: ${errorMessage}`);
  }
}
```

### Understanding OData Query Parameters

#### The $filter Parameter

```typescript
$filter: "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'"
```

**What it does**: Only return workers whose status is "Active"

**SQL Equivalent**:
```sql
WHERE workAssignment.assignmentStatus.statusCode.codeValue = 'Active'
```

**Why we need this**: ADP stores ALL workers (active, terminated, on leave). We only want active employees.

#### The $select Parameter

```typescript
$select: 'workerId,person/legalName,person/communication/emails,person/workAssignment'
```

**What it does**: Only return these specific fields

**SQL Equivalent**:
```sql
SELECT workerId, person.legalName, person.communication.emails, person.workAssignment
FROM workers
```

**Why we need this**: 
- Reduces bandwidth (don't send unnecessary data)
- Faster response times
- Less memory usage

For a deep dive into OData syntax, see **Step 13e: ADP Query Syntax Tutorial**.

---

## 7. Implementing Payroll Methods

### 7.1 Get Employee Payroll

Add this method for retrieving an individual employee's payroll data:

```typescript
/**
 * Get payroll data for a specific employee
 *
 * @param {string} employeeId - ADP employee ID
 * @returns {Promise<any>} Employee payroll data
 */
async getEmployeePayroll(employeeId: string): Promise<any> {
  const token = await this.getAccessToken();
  const adpApiUrl =
    this.config.get<string>('ADP_API_URL') || 'https://api.adp.com/hr/v2';

  try {
    const response = await axios.get(
      `${adpApiUrl}/workers/${employeeId}/pay-statements`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(
      `Failed to fetch payroll for employee ${employeeId}`,
      error
    );
    throw new Error(`Failed to fetch employee payroll: ${errorMessage}`);
  }
}
```

### 7.2 Get Payroll Summary for Dashboard

Add this method for dashboard overview:

```typescript
/**
 * Get a summary of payroll status (for dashboard)
 *
 * @returns {Promise<any>} Payroll summary with processing runs
 */
async getPayrollSummary(): Promise<any> {
  const token = await this.getAccessToken();
  const adpApiUrl =
    this.config.get<string>('ADP_API_URL') || 'https://api.adp.com/hr/v2';

  try {
    const response = await axios.get(`${adpApiUrl}/payroll/v1/pay-runs`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        $filter: "payRunStatus/statusCode/codeValue eq 'Processing'",
        $top: 10,
      },
    });

    return {
      processingPayRuns: response.data.payRuns?.length || 0,
      lastPayRunDate: response.data.payRuns?.[0]?.payDate || null,
    };
  } catch (error) {
    this.logger.error('Failed to fetch payroll summary', error);
    // Return default values instead of throwing (graceful degradation)
    return { processingPayRuns: 0, lastPayRunDate: null };
  }
}
```

**Note on Error Handling:**

- `getEmployeePayroll()`: Throws errors (dashboard needs specific employee data)
- `getPayrollSummary()`: Returns defaults (dashboard can work without payroll status)

This is called **graceful degradation** - the system continues working even if one part fails.

---

## 8. Error Handling and Logging

### Logging Best Practices

```typescript
// ✅ GOOD: Log at appropriate levels
this.logger.log('Requesting new access token from ADP');        // Info
this.logger.debug('Using cached ADP access token');            // Debug
this.logger.error('Failed to obtain ADP access token', error); // Error
```

### Error Message Construction

```typescript
const errorMessage =
  error instanceof Error ? error.message : 'Unknown error';
this.logger.error('Failed to fetch employees from ADP', error);
throw new Error(`Failed to fetch ADP employees: ${errorMessage}`);
```

**Why this pattern?**

1. **Type Safety**: `error` might not be an Error object
2. **Logging**: Log the full error object (includes stack trace)
3. **Throwing**: Throw a descriptive message for the caller

### Never Log Sensitive Data

```typescript
// ❌ BAD
this.logger.log(`Got token: ${this.cachedToken}`);
this.logger.log(`Using credentials: ${clientId}/${clientSecret}`);

// ✅ GOOD
this.logger.log('ADP access token obtained');
this.logger.debug('Using cached ADP access token');
```

---

## 9. Testing the ADP Service

### 9.1 Unit Test: Token Caching

Create `apps/api/src/modules/management/adp.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ADPService } from './adp.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ADPService', () => {
  let service: ADPService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ADPService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                ADP_CLIENT_ID: 'test_client',
                ADP_CLIENT_SECRET: 'test_secret',
                ADP_TOKEN_URL: 'https://test.adp.com/token',
                ADP_API_URL: 'https://test.adp.com/api',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ADPService>(ADPService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should cache access tokens', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        access_token: 'test_token_123',
        expires_in: 3600,
      },
    });

    // First call - should make HTTP request
    const token1 = await service.getAccessToken();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(token1).toBe('test_token_123');

    // Second call - should use cached token
    const token2 = await service.getAccessToken();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still 1!
    expect(token2).toBe('test_token_123');
  });

  it('should fetch active employees', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { access_token: 'token', expires_in: 3600 },
    });

    mockedAxios.get.mockResolvedValue({
      data: {
        workers: [
          {
            workerId: { idValue: 'ADP123' },
            person: {
              legalName: { givenName: 'John', familyName1: 'Doe' },
              communication: { emails: [{ emailUri: 'john@test.com' }] },
              workAssignment: [{ jobTitle: 'Manager' }],
            },
          },
        ],
      },
    });

    const employees = await service.getActiveEmployees();
    expect(employees).toHaveLength(1);
    expect(employees[0].workerId.idValue).toBe('ADP123');
  });
});
```

### 9.2 Manual Testing with Curl

Test the token endpoint directly:

```bash
curl -X POST "https://test.adp.com/auth/oauth/v2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_ID&client_secret=YOUR_SECRET"
```

Expected response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## 10. Complete Service Code

Here's the full `ADPService` implementation:

**File: `apps/api/src/modules/management/adp.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ADPEmployee {
  workerId: { idValue: string };
  person: {
    legalName: {
      givenName: string;
      familyName1: string;
    };
    communication: {
      emails: Array<{ emailUri: string }>;
    };
    workAssignment?: Array<{ jobTitle?: string }>;
  };
}

@Injectable()
export class ADPService {
  private readonly logger = new Logger(ADPService.name);
  private cachedToken: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor(private config: ConfigService) {}

  async getAccessToken(): Promise<string> {
    // If we have a cached token that hasn't expired, use it
    if (
      this.cachedToken &&
      this.tokenExpiration &&
      new Date() < this.tokenExpiration
    ) {
      this.logger.debug('Using cached ADP access token');
      return this.cachedToken;
    }

    const clientId = this.config.get<string>('ADP_CLIENT_ID');
    const clientSecret = this.config.get<string>('ADP_CLIENT_SECRET');
    const adpTokenUrl =
      this.config.get<string>('ADP_TOKEN_URL') ||
      'https://accounts.adp.com/auth/oauth/v2/token';

    if (!clientId || !clientSecret) {
      throw new Error(
        'ADP credentials not configured. Set ADP_CLIENT_ID and ADP_CLIENT_SECRET in .env.local'
      );
    }

    try {
      this.logger.log('Requesting new access token from ADP');

      const response = await axios.post(
        adpTokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.cachedToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiration = new Date(Date.now() + (expiresIn - 300) * 1000);

      this.logger.log(
        `ADP access token obtained, expires at ${this.tokenExpiration.toISOString()}`
      );
      return this.cachedToken as string;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to obtain ADP access token', error);
      throw new Error(`ADP authentication failed: ${errorMessage}`);
    }
  }

  async getActiveEmployees(): Promise<ADPEmployee[]> {
    const token = await this.getAccessToken();
    const adpApiUrl =
      this.config.get<string>('ADP_API_URL') || 'https://api.adp.com/hr/v2';

    try {
      const response = await axios.get(`${adpApiUrl}/workers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          $filter:
            "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'",
          $select:
            'workerId,person/legalName,person/communication/emails,person/workAssignment',
        },
      });

      return response.data.workers || [];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch employees from ADP', error);
      throw new Error(`Failed to fetch ADP employees: ${errorMessage}`);
    }
  }

  async getEmployeePayroll(employeeId: string): Promise<any> {
    const token = await this.getAccessToken();
    const adpApiUrl =
      this.config.get<string>('ADP_API_URL') || 'https://api.adp.com/hr/v2';

    try {
      const response = await axios.get(
        `${adpApiUrl}/workers/${employeeId}/pay-statements`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch payroll for employee ${employeeId}`,
        error
      );
      throw new Error(`Failed to fetch employee payroll: ${errorMessage}`);
    }
  }

  async getPayrollSummary(): Promise<any> {
    const token = await this.getAccessToken();
    const adpApiUrl =
      this.config.get<string>('ADP_API_URL') || 'https://api.adp.com/hr/v2';

    try {
      const response = await axios.get(`${adpApiUrl}/payroll/v1/pay-runs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          $filter: "payRunStatus/statusCode/codeValue eq 'Processing'",
          $top: 10,
        },
      });

      return {
        processingPayRuns: response.data.payRuns?.length || 0,
        lastPayRunDate: response.data.payRuns?.[0]?.payDate || null,
      };
    } catch (error) {
      this.logger.error('Failed to fetch payroll summary', error);
      return { processingPayRuns: 0, lastPayRunDate: null };
    }
  }
}
```

---

## 11. Key Takeaways

### What You Learned

1. **OAuth 2.0 Client Credentials Flow**: Server-to-server authentication
2. **Token Caching**: Optimize performance by caching access tokens
3. **Separation of Concerns**: ADPService only talks to ADP, nothing else
4. **Error Handling**: Proper logging and error propagation
5. **Graceful Degradation**: Some failures return defaults, others throw

### Best Practices Applied

- ✅ Single Responsibility Principle (SRP)
- ✅ DRY (Don't Repeat Yourself) - token method reused
- ✅ Configuration Management - no hardcoded values
- ✅ Proper TypeScript typing with interfaces
- ✅ Comprehensive logging for debugging
- ✅ Security-conscious (never log tokens/secrets)

---

## 12. Next Steps

Now that the ADP Service is complete, proceed to:

➡️ **Step 13b: Keycloak Admin Service Implementation**

This will handle:
- Programmatically creating Keycloak users
- Assigning roles to users
- Searching for existing users
- Updating user information

---

## 13. Troubleshooting

### Issue: "ADP authentication failed"

**Solution:**
1. Verify `ADP_CLIENT_ID` and `ADP_CLIENT_SECRET` in `.env.local`
2. Check ADP Developer Portal for application status
3. Ensure you have the correct permissions/scopes

### Issue: "Failed to fetch employees - 404"

**Solution:**
1. Verify `ADP_API_URL` is correct
2. Check your ADP subscription includes HR API access
3. Confirm your application has permission to access `/workers` endpoint

### Issue: Token not being cached

**Solution:**
1. Check logs for "Using cached" message
2. Verify `tokenExpiration` is being set
3. Ensure service is singleton (NestJS default)

---

**Congratulations!** You've built a robust ADP service with OAuth authentication and token caching. Continue to Step 13b →


