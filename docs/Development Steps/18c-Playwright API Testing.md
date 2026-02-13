# Step 18c: Playwright API Testing (Tutorial)

## 1. The "Why" Behind This Step: Verification Before Visualization
We have built a complex backend with multiple modules (Products, Orders, Management, Chatbot). Before we start building the React frontend, we need to ensure our "Contract" (the API) is solid. **Playwright** isn't just for browsers; it has a powerful built-in **APIRequestContext** that allows us to run lightning-fast tests against our endpoints.

**The Goal**: Create a suite of automated tests that verify our core business logic—from searching for candles to checking order status.

---

## 2. Step-by-Step Implementation

### Step 2.1: Organize the Test Folder
While Playwright is often used for UI testing, we should keep our API tests separate for clarity.

**Tutorial Action**:
1. Navigate to `apps/e2e/src/`.
2. Ensure you have a directory named `api-tests`.
3. Create a new test file: `products.spec.ts`.

---

### Step 2.2: Writing your first API Test
Playwright provides a `request` object in every test that is optimized for JSON APIs.

**Tutorial Action**:
Open `apps/e2e/src/api-tests/products.spec.ts` and implement a test for the "Public" product listing.

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000/api';

test.describe('Products API', () => {
  test('should fetch all products (Public)', async ({ request }) => {
    // 1. Make the request
    const response = await request.get(`${BASE_URL}/products`);

    // 2. Verify the response status
    expect(response.ok()).toBeTruthy();
    
    // 3. Verify the data structure
    const products = await response.json();
    expect(Array.isArray(products)).toBeTruthy();
    
    if (products.length > 0) {
      expect(products[0]).toHaveProperty('name');
      expect(products[0]).toHaveProperty('price');
    }
  });
});
```

---

### Step 2.3: Testing Protected Endpoints (Auth)
Testing the **Management** or **Chatbot** (order status) endpoints requires a Bearer token.

**Tutorial Action**: 
In a real test suite, you should create a helper to fetch a token from Keycloak before running protected tests.

```typescript
test.describe('Protected Endpoints', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    // Logic to exchange credentials for a token (see Step 6b/14)
    // For now, you can manually paste a token or implement the login call here
  });

  test('should get management dashboard overview', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/management/dashboard/overview`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('sales');
  });
});
```

---

## 3. Advanced Technique: Verifying Business Logic

### 3.1 Chatbot Scenario Testing
You can simulate a user talking to Rowan and verify the response logic you just built.

**Tutorial Action**:
Create a test that sends a "scent" query and verifies the response contains the word "found" or a specific candle name.

```typescript
test('Rowan should find sandalwood candles', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/chatbot/message`, {
    data: {
      text: "Do you have any sandalwood candles?"
    }
  });

  const result = await response.json();
  expect(result.reply).toContain('sandalwood');
});
```

---

## 4. How to Run the Tests

**Tutorial Action**:
Use the Nx CLI to run your e2e project.

```bash
# Run all tests in the e2e project
nx e2e e2e

# Run only the API tests
npx playwright test src/api-tests --config=apps/e2e/playwright.config.ts
```

---

## 5. Security & Cleanup Note
*   **Database Seeding**: In a professional setup, you should "seed" your database with known test data before running these tests so the results are predictable.
*   **Cleanup**: If your tests create data (like creating a product), ensure you delete that product at the end of the test to keep your database clean.

---

## 6. Implementation Checklist

- [ ] **Setup**: Identify the `apps/e2e/src/api-tests` directory.
- [ ] **Tests**: Create `products.spec.ts` and `chatbot.spec.ts`.
- [ ] **Auth**: Implement a token retrieval helper for protected routes.
- [ ] **Validation**: Run the tests and ensure all "Happy Paths" pass.
- [ ] **CI/CD**: (Optional) Ensure these tests run in your GitHub Actions pipeline on every push.

---

**Summary**: By building this API test layer, you have created a "Safety Net." If you ever change the backend code later while working on the frontend, these tests will immediately tell you if you broke the contract!
