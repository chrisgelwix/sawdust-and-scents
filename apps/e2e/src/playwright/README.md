# Playwright Tests

## Overview

End-to-end browser automation tests using Playwright for UI and user journey testing.

## Purpose

- **UI Testing**: Validate user interface functionality
- **User Flows**: Test complete user journeys across the application
- **Cross-Browser**: Test compatibility across Chrome, Firefox, and Safari
- **Visual Regression**: Screenshot comparison for visual changes

## Structure

```
playwright/
├── tests/          # Test files (*.spec.ts)
├── fixtures/       # Test fixtures and helpers
├── page-objects/   # Page Object Model classes
└── utils/          # Utility functions
```

## Running Tests

```bash
# Run all Playwright tests
nx playwright e2e

# Run in headed mode (watch browser)
npx playwright test --headed

# Run specific test file
npx playwright test checkout.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

## Configuration

Playwright configuration is in `playwright.config.ts` (to be created).

### Environment Variables

```bash
BASE_URL=http://localhost:4200  # Frontend URL
API_URL=http://localhost:3000   # API URL
```

## Writing Tests

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Product Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('should display products', async ({ page }) => {
    await expect(page.locator('.product-card')).toHaveCount(10);
  });

  test('should add product to cart', async ({ page }) => {
    await page.click('[data-testid="add-to-cart-1"]');
    await expect(page.locator('.cart-badge')).toHaveText('1');
  });
});
```

## Best Practices

- ✅ Use data-testid attributes for stable selectors
- ✅ Use Page Object Model for reusability
- ✅ Keep tests independent and isolated
- ✅ Use fixtures for test data
- ✅ Test critical user paths first
- ❌ Don't rely on hardcoded waits (use auto-waiting)
- ❌ Don't test implementation details

## Future Enhancements

- [ ] Visual regression testing with Percy or similar
- [ ] Accessibility testing with axe-core
- [ ] Performance metrics collection
- [ ] Mobile/responsive testing
- [ ] API mocking for offline testing
