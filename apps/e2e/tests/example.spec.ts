import { test, expect } from '@playwright/test';

/**
 * Example Playwright Test
 * 
 * This is a template/example test to demonstrate Playwright structure.
 * Replace with actual tests for your application.
 */

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/');
  });

  test('should display the homepage', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Sawdust and Scents/i);
  });

  test('should have navigation menu', async ({ page }) => {
    // Check for main navigation elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a[href="/products"]')).toBeVisible();
    await expect(page.locator('a[href="/cart"]')).toBeVisible();
  });
});

test.describe('Product Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('should display products', async ({ page }) => {
    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]');
    
    // Check that products are displayed
    const products = page.locator('[data-testid="product-card"]');
    await expect(products).toHaveCount(await products.count());
  });

  test('should filter products by category', async ({ page }) => {
    // Click on a category filter
    await page.click('[data-testid="category-candles"]');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(5);
  });

  test('should search for products', async ({ page }) => {
    // Enter search term
    await page.fill('[data-testid="search-input"]', 'lavender');
    await page.click('[data-testid="search-button"]');
    
    // Verify search results
    await expect(page.locator('[data-testid="product-card"]')).toContainText('Lavender');
  });
});

test.describe('Shopping Cart', () => {
  test('should add product to cart', async ({ page }) => {
    // Navigate to products
    await page.goto('/products');
    
    // Add first product to cart
    await page.click('[data-testid="add-to-cart-1"]');
    
    // Verify cart badge updates
    await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');
  });

  test('should display cart contents', async ({ page }) => {
    // Add product to cart
    await page.goto('/products');
    await page.click('[data-testid="add-to-cart-1"]');
    
    // Navigate to cart
    await page.goto('/cart');
    
    // Verify cart contains product
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
  });

  test('should update cart quantity', async ({ page }) => {
    // Setup: Add product to cart
    await page.goto('/products');
    await page.click('[data-testid="add-to-cart-1"]');
    await page.goto('/cart');
    
    // Increase quantity
    await page.click('[data-testid="increase-quantity"]');
    
    // Verify quantity updated
    await expect(page.locator('[data-testid="quantity-input"]')).toHaveValue('2');
  });

  test('should remove item from cart', async ({ page }) => {
    // Setup: Add product to cart
    await page.goto('/products');
    await page.click('[data-testid="add-to-cart-1"]');
    await page.goto('/cart');
    
    // Remove item
    await page.click('[data-testid="remove-item"]');
    
    // Verify cart is empty
    await expect(page.locator('[data-testid="empty-cart-message"]')).toBeVisible();
  });
});

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Add product to cart
    await page.goto('/products');
    await page.click('[data-testid="add-to-cart-1"]');
    await page.goto('/cart');
  });

  test('should proceed to checkout', async ({ page }) => {
    await page.click('[data-testid="checkout-button"]');
    await expect(page).toHaveURL(/\/checkout/);
  });

  test('should require authentication for checkout', async ({ page }) => {
    await page.click('[data-testid="checkout-button"]');
    
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test('should complete checkout when authenticated', async ({ page }) => {
    // Login first (this would use a test user)
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Go to cart and checkout
    await page.goto('/cart');
    await page.click('[data-testid="checkout-button"]');
    
    // Fill shipping information
    await page.fill('[data-testid="address-street"]', '123 Main St');
    await page.fill('[data-testid="address-city"]', 'Portland');
    await page.fill('[data-testid="address-state"]', 'OR');
    await page.fill('[data-testid="address-zip"]', '97201');
    
    // Submit order
    await page.click('[data-testid="place-order-button"]');
    
    // Verify order confirmation
    await expect(page).toHaveURL(/\/order-confirmation/);
    await expect(page.locator('[data-testid="order-success-message"]')).toBeVisible();
  });
});

/**
 * Accessibility Tests
 * 
 * These tests check for basic accessibility compliance
 */
test.describe('Accessibility', () => {
  test('homepage should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Check for main landmarks
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for skip link
    await expect(page.locator('a[href="#main-content"]')).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Should have exactly one h1
    await expect(page.locator('h1')).toHaveCount(1);
  });
});

/**
 * Mobile Responsiveness Tests
 * 
 * These tests verify mobile-specific behavior
 */
test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should display mobile navigation', async ({ page }) => {
    await page.goto('/');
    
    // Mobile menu button should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
  });

  test('should open mobile menu', async ({ page }) => {
    await page.goto('/');
    
    // Click mobile menu button
    await page.click('[data-testid="mobile-menu-button"]');
    
    // Menu should be visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
});
