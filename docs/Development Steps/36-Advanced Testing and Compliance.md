# Step 33: Advanced Testing and Compliance

While unit and E2E tests cover functionality, professional applications require specialized testing for security compliance, API reliability, and human usability. This step introduces NIST-aligned testing, automated API verification, and manual testing strategies.

## 1. Core Concepts & Definitions

### NIST Testing (National Institute of Standards and Technology)
NIST provides a framework (specifically SP 800-53 or the Cybersecurity Framework) for securing information systems. "NIST Testing" in this context refers to verifying that your application adheres to security best practices for access control, audit logging, and data encryption.

### API Testing (Integration/Contract Testing)
API testing focuses on the communication between services. It ensures that the API returns the correct data formats (contracts), handles errors gracefully, and remains performant under load.
*   **Tools**: **Supertest** (Node.js), **Postman**, or **Bruno**.

### Manual Testing
Despite automation, human eyes are essential for catching UX friction, layout issues on specific devices, and complex edge cases that are difficult to script.

---

## 2. NIST-Aligned Security Hardening

To align with NIST standards, we implement "Hardening" steps:

### 2.1 Access Control (NIST AC-2)
Ensure that every endpoint is protected by either `@Unprotected()` (explicitly public) or a Role Guard.
*   **Verification**: Run a script to scan all NestJS controllers and list any that lack an `@UseGuards` or `@Roles` decorator.

### 2.2 Audit Logging (NIST AU-2)
Every administrative action (creating a product, changing an order status) must be logged with:
1.  **Who** did it (User ID).
2.  **What** was changed (Old vs New value).
3.  **When** it happened (Timestamp).
4.  **Where** it originated (IP Address/User Agent).

### 2.3 Data at Rest (NIST SC-28)
Ensure that sensitive data in PostgreSQL and MongoDB is encrypted.
*   **Implementation**: Use AWS RDS encryption or MongoDB Atlas encryption-at-rest features.

---

## 3. Automated API Testing with Supertest

We use `supertest` to run high-speed integration tests against our API endpoints without needing a full browser.

### Step 3.1: Install Supertest
```bash
npm install --save-dev supertest @types/supertest
```

### Step 3.2: Create an API Test
Example: `apps/api/test/products.e2e-spec.ts`

```typescript
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';

describe('Products API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
```

---

## 4. The Manual Testing Plan

A professional manual test plan is recorded in a spreadsheet or testing tool.

### 4.1 Visual Regression & UX
*   **Check**: Does the "Wood & Wax" theme look consistent on iPhone 13, iPad, and Desktop 4K?
*   **Check**: Is the "Add to Cart" button reachable on small screens?

### 4.2 Edge Case Scenarios
*   **Negative Inventory**: Try to add more items to the cart than are in stock via direct API call.
*   **Session Expiry**: Stay on the checkout page until the Keycloak token expires, then try to submit.
*   **Network Interruption**: Disable Wi-Fi during a payment processing simulation.

---

## 5. Vocabulary Breakdown

*   **Hardening**: The process of securing a system by reducing its surface of vulnerability (turning off unnecessary features, closing ports).
*   **Contract Testing**: A technique where you test the "contract" (JSON structure) of an API to ensure frontend and backend don't break each other.
*   **Compliance**: Meeting the requirements of a specific standard (like NIST, GDPR, or PCI-DSS).
*   **Supertest**: A library for testing Node.js HTTP servers using a fluent API.



