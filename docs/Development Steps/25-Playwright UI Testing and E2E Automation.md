# Step 22: Playwright UI Testing and E2E Automation

## 1. The "Why" Behind This Step: The Quality Guardian

You've built components in isolation with Storybook (Step 21). Now you need to test the **entire user journey**—from landing on the homepage to completing a purchase. **Playwright** is your automated QA tester that runs these tests in real browsers.

**The Strategy**: We integrate **Playwright** for end-to-end (E2E) testing.
- **The Analogy**: Storybook tests individual Lego bricks. Playwright tests the entire castle after you've built it.
- **The Benefit**: Catch integration bugs, test critical user flows, and ensure cross-browser compatibility automatically.

---

## 2. Core Concepts & Definitions

### 2.1 End-to-End (E2E) Testing

- **Definition**: Testing the complete application flow from the user's perspective, including frontend, backend, and database interactions.
- **The Logic**: Instead of testing a button in isolation, you test: "Can a user log in, add a product to cart, and complete checkout?"

### 2.2 Browser Automation

- **Definition**: Programmatically controlling a real browser (Chrome, Firefox, Safari) to simulate user actions.
- **The Logic**: Playwright opens a browser, clicks buttons, fills forms, and verifies results—just like a human tester would.

### 2.3 Test Fixtures

- **Definition**: Reusable setup code that runs before tests (e.g., logging in, seeding data).
- **The Logic**: Instead of writing login code in every test, create a fixture that provides an authenticated browser context.

### 2.4 Page Object Model (POM)

- **Definition**: A design pattern where each page/component is represented by a class that encapsulates its elements and actions.
- **The Logic**: Instead of `page.click('#submit-button')` scattered everywhere, you write `checkoutPage.submitOrder()`.

### 2.5 Visual Regression Testing

- **Definition**: Taking screenshots and comparing them to baseline images to detect unintended visual changes.
- **The Logic**: Ensures your CSS changes don't accidentally break layouts.

---

## 3. Prerequisites

Before proceeding with this step, ensure you have completed:

- ✅ Step 19 - React Frontend Foundation
- ✅ Step 20 - Keycloak Frontend Integration
- ✅ Step 21 - Storybook Integration (optional but recommended)
- ✅ API running at `http://localhost:3000`
- ✅ Web app running at `http://localhost:4200`
- ✅ Keycloak running at `http://localhost:8080`

---

## 4. Step-by-Step Implementation

### Step 4.1: Install Playwright in the E2E Project

We already have an `e2e` project in our Nx workspace. Let's configure Playwright for it.

```bash
# Install Playwright and browsers
npm install --save-dev @playwright/test

# Install browser binaries (Chromium, Firefox, WebKit)
npx playwright install
```

### Step 4.2: Configure Playwright

Update `apps/e2e/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Sawdust & Scents E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './src/playwright/tests',
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: '../../dist/playwright-report' }],
    ['json', { outputFile: '../../dist/playwright-results.json' }],
    ['junit', { outputFile: '../../dist/playwright-junit.xml' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:4200',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Emulate viewport
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Test against mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: [
    {
      command: 'npx nx serve api',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'npx nx serve web',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
```

### Step 4.3: Create Page Objects

Create the Page Object Model structure for maintainable tests.

**Base Page**: `apps/e2e/src/playwright/page-objects/BasePage.ts`

```typescript
import { Page, Locator } from '@playwright/test';

/**
 * Base page class with common functionality
 * All page objects extend this class
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '') {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }
}
```

**Home Page**: `apps/e2e/src/playwright/page-objects/HomePage.ts`

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Home/Landing page
 */
export class HomePage extends BasePage {
  // Locators
  readonly logo: Locator;
  readonly loginButton: Locator;
  readonly searchInput: Locator;
  readonly cartIcon: Locator;
  readonly featuredProducts: Locator;

  constructor(page: Page) {
    super(page);
    this.logo = page.locator('[data-testid="logo"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.cartIcon = page.locator('[data-testid="cart-icon"]');
    this.featuredProducts = page.locator('[data-testid="featured-products"]');
  }

  /**
   * Navigate to home page
   */
  async navigate() {
    await this.goto('/');
    await this.waitForLoad();
  }

  /**
   * Click login button
   */
  async clickLogin() {
    await this.loginButton.click();
  }

  /**
   * Search for products
   */
  async searchProducts(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  /**
   * Get cart item count
   */
  async getCartCount(): Promise<string> {
    return await this.cartIcon.getAttribute('data-count') || '0';
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    return !(await this.loginButton.isVisible());
  }
}
```

**Products Page**: `apps/e2e/src/playwright/page-objects/ProductsPage.ts`

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Products Catalog page
 */
export class ProductsPage extends BasePage {
  readonly productCards: Locator;
  readonly filterByCategory: Locator;
  readonly sortDropdown: Locator;
  readonly priceRangeSlider: Locator;

  constructor(page: Page) {
    super(page);
    this.productCards = page.locator('[data-testid="product-card"]');
    this.filterByCategory = page.locator('[data-testid="category-filter"]');
    this.sortDropdown = page.locator('[data-testid="sort-dropdown"]');
    this.priceRangeSlider = page.locator('[data-testid="price-range"]');
  }

  async navigate() {
    await this.goto('/products');
    await this.waitForLoad();
  }

  /**
   * Get all product cards
   */
  async getProducts() {
    return await this.productCards.all();
  }

  /**
   * Get product count
   */
  async getProductCount(): Promise<number> {
    return await this.productCards.count();
  }

  /**
   * Click on a product by name
   */
  async clickProduct(productName: string) {
    await this.page.locator(`[data-testid="product-card"]:has-text("${productName}")`).click();
  }

  /**
   * Add product to cart by name
   */
  async addToCart(productName: string) {
    const product = this.page.locator(`[data-testid="product-card"]:has-text("${productName}")`);
    await product.locator('[data-testid="add-to-cart-button"]').click();
  }

  /**
   * Filter by category
   */
  async filterCategory(category: 'candle' | 'sign' | 'decor') {
    await this.filterByCategory.selectOption(category);
    await this.waitForLoad();
  }

  /**
   * Sort products
   */
  async sortBy(option: 'price-asc' | 'price-desc' | 'name' | 'newest') {
    await this.sortDropdown.selectOption(option);
    await this.waitForLoad();
  }
}
```

**Cart Page**: `apps/e2e/src/playwright/page-objects/CartPage.ts`

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Shopping Cart page
 */
export class CartPage extends BasePage {
  readonly cartItems: Locator;
  readonly subtotalAmount: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;
  readonly emptyCartMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.cartItems = page.locator('[data-testid="cart-item"]');
    this.subtotalAmount = page.locator('[data-testid="subtotal"]');
    this.checkoutButton = page.locator('[data-testid="checkout-button"]');
    this.continueShoppingButton = page.locator('[data-testid="continue-shopping"]');
    this.emptyCartMessage = page.locator('[data-testid="empty-cart-message"]');
  }

  async navigate() {
    await this.goto('/cart');
    await this.waitForLoad();
  }

  /**
   * Get cart item count
   */
  async getItemCount(): Promise<number> {
    return await this.cartItems.count();
  }

  /**
   * Get subtotal amount
   */
  async getSubtotal(): Promise<string> {
    return await this.subtotalAmount.textContent() || '$0.00';
  }

  /**
   * Remove item from cart
   */
  async removeItem(productName: string) {
    const item = this.page.locator(`[data-testid="cart-item"]:has-text("${productName}")`);
    await item.locator('[data-testid="remove-button"]').click();
  }

  /**
   * Update item quantity
   */
  async updateQuantity(productName: string, quantity: number) {
    const item = this.page.locator(`[data-testid="cart-item"]:has-text("${productName}")`);
    const quantityInput = item.locator('[data-testid="quantity-input"]');
    await quantityInput.fill(quantity.toString());
  }

  /**
   * Proceed to checkout
   */
  async proceedToCheckout() {
    await this.checkoutButton.click();
  }

  /**
   * Check if cart is empty
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyCartMessage.isVisible();
  }
}
```

**Login Page**: `apps/e2e/src/playwright/page-objects/LoginPage.ts`

```typescript
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for Keycloak Login page
 */
export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    // Keycloak login form selectors
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('#kc-login');
    this.errorMessage = page.locator('.alert-error');
  }

  /**
   * Perform login
   */
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('**/'); // Wait for redirect to home
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }
}
```

### Step 4.4: Create Test Fixtures

Create reusable fixtures for common test scenarios.

**Auth Fixture**: `apps/e2e/src/playwright/fixtures/auth.fixture.ts`

```typescript
import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';

type AuthFixtures = {
  authenticatedPage: Page;
};

/**
 * Fixture that provides an authenticated browser context
 * Usage: test('my test', async ({ authenticatedPage }) => { ... })
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to home page (will redirect to Keycloak)
    await page.goto('/');

    // Check if we're on Keycloak login page
    if (page.url().includes('keycloak')) {
      const loginPage = new LoginPage(page);
      await loginPage.login(
        process.env.TEST_USER_EMAIL || 'test@example.com',
        process.env.TEST_USER_PASSWORD || 'password123'
      );
    }

    // Wait for redirect back to app
    await page.waitForURL('**/');

    // Use the authenticated page in the test
    await use(page);

    // Cleanup: logout after test
    // await page.goto('/logout');
  },
});

export { expect } from '@playwright/test';
```

**Test Data Fixture**: `apps/e2e/src/playwright/fixtures/test-data.fixture.ts`

```typescript
import { test as base } from '@playwright/test';

type TestData = {
  testUser: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };
  testProduct: {
    name: string;
    price: number;
    category: string;
  };
};

/**
 * Fixture that provides test data
 */
export const test = base.extend<TestData>({
  testUser: async ({}, use) => {
    await use({
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'password123',
      firstName: 'Test',
      lastName: 'User',
    });
  },

  testProduct: async ({}, use) => {
    await use({
      name: 'Lavender Dream Candle',
      price: 24.99,
      category: 'candle',
    });
  },
});

export { expect } from '@playwright/test';
```

### Step 4.5: Write Your First E2E Tests

**Home Page Test**: `apps/e2e/src/playwright/tests/home.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';

test.describe('Home Page', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate();
  });

  test('should display the home page', async () => {
    await expect(homePage.logo).toBeVisible();
    await expect(homePage.page).toHaveTitle(/Sawdust.*Scents/);
  });

  test('should show login button when not authenticated', async () => {
    await expect(homePage.loginButton).toBeVisible();
  });

  test('should have search functionality', async () => {
    await expect(homePage.searchInput).toBeVisible();
    await homePage.searchProducts('candle');
    await expect(homePage.page).toHaveURL(/.*search=candle.*/);
  });

  test('should display featured products', async () => {
    await expect(homePage.featuredProducts).toBeVisible();
  });

  test('should navigate to products page', async ({ page }) => {
    await page.click('text=Shop Now');
    await expect(page).toHaveURL(/.*\/products.*/);
  });
});
```

**Products Page Test**: `apps/e2e/src/playwright/tests/products.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { ProductsPage } from '../page-objects/ProductsPage';

test.describe('Products Catalog', () => {
  let productsPage: ProductsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
    await productsPage.navigate();
  });

  test('should display products', async () => {
    const productCount = await productsPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);
  });

  test('should filter products by category', async () => {
    await productsPage.filterCategory('candle');
    const products = await productsPage.getProducts();
    
    // Verify all products are candles
    for (const product of products) {
      const category = await product.getAttribute('data-category');
      expect(category).toBe('candle');
    }
  });

  test('should sort products by price', async () => {
    await productsPage.sortBy('price-asc');
    
    // Get all product prices
    const prices = await productsPage.page
      .locator('[data-testid="product-price"]')
      .allTextContents();
    
    // Convert to numbers and verify ascending order
    const numericPrices = prices.map(p => parseFloat(p.replace('$', '')));
    const sorted = [...numericPrices].sort((a, b) => a - b);
    expect(numericPrices).toEqual(sorted);
  });

  test('should navigate to product detail page', async ({ page }) => {
    await productsPage.clickProduct('Lavender Dream Candle');
    await expect(page).toHaveURL(/.*\/products\/.*$/);
  });
});
```

**Shopping Cart Test**: `apps/e2e/src/playwright/tests/cart.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { ProductsPage } from '../page-objects/ProductsPage';
import { CartPage } from '../page-objects/CartPage';
import { HomePage } from '../page-objects/HomePage';

test.describe('Shopping Cart', () => {
  test('should add product to cart', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const homePage = new HomePage(page);

    await productsPage.navigate();
    await productsPage.addToCart('Lavender Dream Candle');

    // Verify cart count increased
    const cartCount = await homePage.getCartCount();
    expect(parseInt(cartCount)).toBeGreaterThan(0);
  });

  test('should display cart items', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Add item to cart
    await productsPage.navigate();
    await productsPage.addToCart('Lavender Dream Candle');

    // Navigate to cart
    await cartPage.navigate();

    // Verify item is in cart
    const itemCount = await cartPage.getItemCount();
    expect(itemCount).toBe(1);
  });

  test('should update item quantity', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Add item and navigate to cart
    await productsPage.navigate();
    await productsPage.addToCart('Lavender Dream Candle');
    await cartPage.navigate();

    // Update quantity
    await cartPage.updateQuantity('Lavender Dream Candle', 3);

    // Verify subtotal updated
    const subtotal = await cartPage.getSubtotal();
    expect(subtotal).toContain('74.97'); // 24.99 * 3
  });

  test('should remove item from cart', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Add item and navigate to cart
    await productsPage.navigate();
    await productsPage.addToCart('Lavender Dream Candle');
    await cartPage.navigate();

    // Remove item
    await cartPage.removeItem('Lavender Dream Candle');

    // Verify cart is empty
    const isEmpty = await cartPage.isEmpty();
    expect(isEmpty).toBe(true);
  });
});
```

**Authentication Test**: `apps/e2e/src/playwright/tests/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { LoginPage } from '../page-objects/LoginPage';

test.describe('Authentication', () => {
  test('should redirect to Keycloak login', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigate();
    await homePage.clickLogin();

    // Should redirect to Keycloak
    await expect(page).toHaveURL(/.*keycloak.*/);
  });

  test('should login successfully', async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    await homePage.navigate();
    await homePage.clickLogin();

    // Login with test credentials
    await loginPage.login(
      process.env.TEST_USER_EMAIL || 'test@example.com',
      process.env.TEST_USER_PASSWORD || 'password123'
    );

    // Should redirect back to home
    await expect(page).toHaveURL(/.*localhost:4200.*/);

    // Should be logged in
    const isLoggedIn = await homePage.isLoggedIn();
    expect(isLoggedIn).toBe(true);
  });

  test('should show error on invalid credentials', async ({ page }) => {
    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);

    await homePage.navigate();
    await homePage.clickLogin();

    // Login with invalid credentials
    await loginPage.login('invalid@example.com', 'wrongpassword');

    // Should show error
    const hasError = await loginPage.hasError();
    expect(hasError).toBe(true);
  });
});
```

**Complete Checkout Flow Test**: `apps/e2e/src/playwright/tests/checkout-flow.spec.ts`

```typescript
import { test, expect } from '../fixtures/auth.fixture';
import { ProductsPage } from '../page-objects/ProductsPage';
import { CartPage } from '../page-objects/CartPage';

test.describe('Checkout Flow', () => {
  test('should complete full purchase journey', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    // Step 1: Browse products
    await productsPage.navigate();
    await expect(productsPage.productCards.first()).toBeVisible();

    // Step 2: Add product to cart
    await productsPage.addToCart('Lavender Dream Candle');
    await page.waitForTimeout(1000); // Wait for cart update

    // Step 3: View cart
    await cartPage.navigate();
    const itemCount = await cartPage.getItemCount();
    expect(itemCount).toBe(1);

    // Step 4: Proceed to checkout
    await cartPage.proceedToCheckout();
    await expect(page).toHaveURL(/.*\/checkout.*/);

    // Step 5: Fill shipping information
    await page.fill('[data-testid="shipping-address"]', '123 Main St');
    await page.fill('[data-testid="shipping-city"]', 'Portland');
    await page.selectOption('[data-testid="shipping-state"]', 'OR');
    await page.fill('[data-testid="shipping-zip"]', '97201');

    // Step 6: Fill payment information (test mode)
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');

    // Step 7: Submit order
    await page.click('[data-testid="submit-order-button"]');

    // Step 8: Verify order confirmation
    await expect(page).toHaveURL(/.*\/order-confirmation.*/);
    await expect(page.locator('text=Thank you for your order')).toBeVisible();
  });
});
```

### Step 4.6: Visual Regression Testing

**Visual Test**: `apps/e2e/src/playwright/tests/visual.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { ProductsPage } from '../page-objects/ProductsPage';

test.describe('Visual Regression', () => {
  test('home page should match snapshot', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigate();

    // Take screenshot and compare to baseline
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow minor differences
    });
  });

  test('products page should match snapshot', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.navigate();

    await expect(page).toHaveScreenshot('products-page.png', {
      fullPage: true,
    });
  });

  test('product card should match snapshot', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    await productsPage.navigate();

    const firstProduct = productsPage.productCards.first();
    await expect(firstProduct).toHaveScreenshot('product-card.png');
  });
});
```

---

## 5. Running Playwright Tests

### Step 5.1: Run Tests

```bash
# Run all Playwright tests
npx nx playwright e2e

# Run specific test file
npx nx playwright e2e --grep "home.spec"

# Run tests in headed mode (see browser)
npx nx playwright e2e --headed

# Run tests in debug mode
npx nx playwright e2e --debug

# Run tests in specific browser
npx nx playwright e2e --project=chromium
npx nx playwright e2e --project=firefox
npx nx playwright e2e --project=webkit

# Run tests in parallel
npx nx playwright e2e --workers=4
```

### Step 5.2: View Test Reports

```bash
# Generate and open HTML report
npx playwright show-report ../../dist/playwright-report
```

### Step 5.3: Update Visual Snapshots

```bash
# Update all snapshots
npx nx playwright e2e --update-snapshots

# Update specific test snapshots
npx nx playwright e2e visual.spec.ts --update-snapshots
```

---

## 6. Advanced Features

### 6.1 API Mocking

Mock API responses for faster, more reliable tests:

```typescript
test('should handle out of stock products', async ({ page }) => {
  // Mock API response
  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1',
          name: 'Lavender Candle',
          price: 24.99,
          inStock: false, // Force out of stock
        },
      ]),
    });
  });

  const productsPage = new ProductsPage(page);
  await productsPage.navigate();

  // Verify "Add to Cart" button is disabled
  const addButton = page.locator('[data-testid="add-to-cart-button"]').first();
  await expect(addButton).toBeDisabled();
});
```

### 6.2 Network Monitoring

Monitor network requests during tests:

```typescript
test('should load products efficiently', async ({ page }) => {
  const requests: string[] = [];

  // Listen to all requests
  page.on('request', (request) => {
    requests.push(request.url());
  });

  const productsPage = new ProductsPage(page);
  await productsPage.navigate();

  // Verify API was called
  expect(requests.some((url) => url.includes('/api/products'))).toBe(true);

  // Verify no excessive requests
  const apiCalls = requests.filter((url) => url.includes('/api/products'));
  expect(apiCalls.length).toBeLessThan(3);
});
```

### 6.3 Performance Testing

Measure page load performance:

```typescript
import { test, expect } from '@playwright/test';

test('home page should load quickly', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  
  // Assert page loads in under 3 seconds
  expect(loadTime).toBeLessThan(3000);
});
```

### 6.4 Accessibility Testing

Integrate with axe-core for a11y testing:

```bash
npm install --save-dev @axe-core/playwright
```

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page should have no accessibility violations', async ({ page }) => {
  await page.goto('/');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

## 7. CI/CD Integration

### Step 7.1: Update GitHub Actions

Add Playwright to your CI pipeline in `.github/workflows/ci.yml`:

```yaml
  e2e_tests:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Start services
        run: |
          docker-compose up -d postgres mongodb keycloak
          sleep 30
      
      - name: Run Playwright tests
        run: npx nx playwright e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: dist/playwright-report/
          retention-days: 30
      
      - name: Upload test videos
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-videos
          path: dist/playwright-videos/
          retention-days: 7
```

---

## 8. Best Practices

### 8.1 Use data-testid Attributes

Always use `data-testid` for test selectors:

```tsx
// Good
<button data-testid="add-to-cart-button">Add to Cart</button>

// Avoid
<button className="btn-primary">Add to Cart</button>
```

### 8.2 Keep Tests Independent

Each test should be able to run in isolation:

```typescript
// Good
test.beforeEach(async ({ page }) => {
  await page.goto('/products');
  // Reset state
});

// Bad - tests depend on each other
test('add to cart', async () => { /* ... */ });
test('checkout', async () => { /* assumes cart has items */ });
```

### 8.3 Use Page Objects

Don't scatter selectors throughout tests:

```typescript
// Good
await productsPage.addToCart('Lavender Candle');

// Bad
await page.click('[data-testid="product-card"]:has-text("Lavender") button');
```

### 8.4 Handle Async Operations

Always wait for operations to complete:

```typescript
// Good
await page.click('button');
await page.waitForResponse('**/api/cart');

// Bad
await page.click('button');
// Immediately check result without waiting
```

---

## 9. Verification & Learning Check

### 9.1 The "Full Journey" Test

1. **Start Services**: Ensure API, web, and Keycloak are running
2. **Run Tests**: `npx nx playwright e2e`
3. **Check Report**: Open HTML report and verify all tests passed
4. **The Lesson**: If tests run end-to-end successfully, you've mastered E2E testing!

### 9.2 The "Visual Regression" Test

1. **Run Visual Tests**: `npx nx playwright e2e visual.spec.ts`
2. **Make CSS Change**: Modify a component style
3. **Run Again**: Tests should fail showing visual diff
4. **The Lesson**: Visual regression catches unintended UI changes

---

## 10. Checklist for Success

- [ ] **Playwright Installed**: Can run `npx playwright --version`
- [ ] **Config Complete**: `playwright.config.ts` properly configured
- [ ] **Page Objects Created**: Base page and at least 3 page objects
- [ ] **Tests Written**: Home, products, cart, and auth tests
- [ ] **Tests Pass**: All tests run successfully
- [ ] **Visual Tests**: Baseline screenshots captured
- [ ] **CI Integration**: Tests run in GitHub Actions
- [ ] **Reports Generated**: HTML report viewable
- [ ] **Cross-Browser**: Tests pass in Chrome, Firefox, Safari
- [ ] **Mobile Tests**: Tests pass on mobile viewports

---

## 11. Vocabulary Breakdown

- **E2E Testing**: Testing complete user workflows from start to finish
- **Page Object Model**: Design pattern for organizing test code
- **Fixture**: Reusable test setup code
- **Locator**: Playwright's way of finding elements on the page
- **Visual Regression**: Detecting unintended visual changes via screenshots
- **Headed Mode**: Running tests with visible browser window
- **Headless Mode**: Running tests without visible browser (faster)
- **Test Reporter**: Tool that generates test result reports
- **Trace**: Recording of test execution for debugging

---

## 12. Troubleshooting

### Issue: Tests timeout

```typescript
// Increase timeout for slow operations
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

### Issue: Flaky tests

```typescript
// Use proper waits instead of fixed timeouts
await page.waitForSelector('[data-testid="product"]');
// NOT: await page.waitForTimeout(5000);
```

### Issue: Can't find element

```typescript
// Debug by taking screenshots
await page.screenshot({ path: 'debug.png' });

// Or use Playwright Inspector
// Run with: npx playwright test --debug
```

---

## 13. Next Steps

Now that you have comprehensive E2E testing:

1. **Expand Test Coverage**: Add tests for admin dashboard, checkout, etc.
2. **Add Performance Tests**: Monitor page load times
3. **Integrate with Monitoring**: Send test results to DataDog/New Relic
4. **Add Visual Regression CI**: Use Percy or Chromatic
5. **Move to Step 23**: Build the actual frontend components!

**Congratulations!** You now have automated E2E testing that catches bugs before they reach production. Your QA process is professional-grade! 🎭

---

**Remember**: Good tests are your safety net. They let you refactor with confidence and deploy without fear!
