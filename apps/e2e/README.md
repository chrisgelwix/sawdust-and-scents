# E2E Testing Suite

## Overview

The `e2e` project contains all automated testing for the Sawdust and Scents application, including API tests, integration tests, Playwright UI tests, and NIST security compliance tests.

**Note:** Unit tests for individual components remain co-located with their source files using Jest.

## Purpose

- **Comprehensive Testing**: Validate the entire application stack
- **Quality Assurance**: Catch bugs before they reach production
- **Security Compliance**: Ensure NIST security standards are met
- **Regression Prevention**: Automated tests prevent breaking changes
- **Documentation**: Tests serve as living documentation

## Testing Strategy

```
┌─────────────────────────────────────────────────────┐
│                   Testing Pyramid                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│        E2E Tests (Playwright)         ← Few         │
│              /\                                     │
│             /  \                                    │
│            /    \                                   │
│           /      \                                  │
│    Integration Tests                ← Some         │
│         /          \                                │
│        /            \                               │
│       /              \                              │
│    API Tests    NIST Tests          ← More         │
│      /                  \                           │
│     /                    \                          │
│  Unit Tests (Co-located)             ← Most         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Test Types

### 1. API Tests (`src/api-tests/`)
**Purpose:** Test REST API endpoints

- Authentication & authorization
- CRUD operations
- Request/response validation
- Error handling

**Run:** `nx e2e --testPathPattern=api-tests`

See [API Tests README](./src/api-tests/README.md)

---

### 2. Integration Tests (`src/integration/`)
**Purpose:** Test component interactions

- Service-to-service communication
- Third-party API integration (ADP, Shippo)
- Database operations
- Business workflows

**Run:** `nx e2e --testPathPattern=integration`

See [Integration Tests README](./src/integration/README.md)

---

### 3. Playwright Tests (`src/playwright/`)
**Purpose:** End-to-end UI testing

- User journeys
- Cross-browser compatibility
- Visual regression
- Accessibility

**Run:** `nx playwright e2e`

See [Playwright Tests README](./src/playwright/README.md)

---

### 4. NIST Compliance Tests (`src/nist/`)
**Purpose:** Security compliance validation

- NIST 800-53 controls
- Access control verification
- Cryptography validation
- Audit logging

**Run:** `nx e2e --testPathPattern=nist`

See [NIST Tests README](./src/nist/README.md)

---

## Project Structure

```
e2e/
├── src/
│   ├── api-tests/          # API endpoint tests
│   │   ├── auth/
│   │   ├── products/
│   │   ├── cart/
│   │   ├── orders/
│   │   └── management/
│   │
│   ├── integration/        # Integration tests
│   │   ├── services/
│   │   ├── external-apis/
│   │   ├── database/
│   │   └── workflows/
│   │
│   ├── playwright/         # Playwright E2E tests
│   │   ├── tests/
│   │   ├── fixtures/
│   │   └── page-objects/
│   │
│   ├── nist/              # NIST compliance tests
│   │   ├── access-control/
│   │   ├── authentication/
│   │   ├── cryptography/
│   │   └── audit/
│   │
│   └── support/           # Shared test utilities
│       ├── global-setup.ts
│       ├── global-teardown.ts
│       └── test-setup.ts
│
├── jest.config.cts        # Jest configuration
├── playwright.config.ts   # Playwright configuration (TBD)
├── project.json           # Nx project configuration
└── README.md              # This file
```

## Running Tests

### Run All Tests

```bash
# Run all E2E tests
nx e2e

# Run with coverage
nx e2e --coverage

# Run affected tests only (based on git changes)
nx affected -t e2e
```

### Run Specific Test Types

```bash
# API tests only
nx e2e --testPathPattern=api-tests

# Integration tests only
nx e2e --testPathPattern=integration

# NIST compliance tests only
nx e2e --testPathPattern=nist

# Playwright tests
nx playwright e2e
```

### Run Specific Test Files

```bash
# Run single test file
nx e2e --testFile=api-tests/products/products.spec.ts

# Run tests matching pattern
nx e2e --testNamePattern="should create order"
```

### Watch Mode (Development)

```bash
# Watch for changes and re-run tests
nx e2e --watch

# Watch specific pattern
nx e2e --watch --testPathPattern=api-tests
```

## Configuration

### Environment Variables

Create `.env.test` in the root directory:

```bash
# API Configuration
API_URL=http://localhost:3000
API_PORT=3000

# Frontend Configuration
WEB_URL=http://localhost:4200

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sawdust_test

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=sawdust-and-scents
KEYCLOAK_CLIENT_ID=sawdust-api
KEYCLOAK_CLIENT_SECRET=test-secret

# Third-Party Services (use test/sandbox credentials)
ADP_CLIENT_ID=test_client_id
ADP_CLIENT_SECRET=test_client_secret
SHIPPO_API_KEY=test_api_key

# Test Configuration
TEST_TIMEOUT=30000
HEADLESS=true
```

### Jest Configuration

See `jest.config.cts` for Jest-specific settings.

### Playwright Configuration

See `playwright.config.ts` for Playwright-specific settings (to be created).

## CI/CD Integration

### GitHub Actions

Tests run automatically on every push and pull request:

```yaml
# .github/workflows/ci.yml
- name: Test
  run: npx nx affected -t test

- name: E2E Tests
  run: npx nx affected -t e2e
```

### Pre-commit Hooks

Tests run automatically before commits using Husky:

```bash
# Affected tests only
npm test
```

## Best Practices

### General
- ✅ Keep tests independent and isolated
- ✅ Use descriptive test names
- ✅ Test happy path and edge cases
- ✅ Clean up test data after tests
- ✅ Use factories for test data
- ❌ Don't test implementation details
- ❌ Don't depend on test execution order
- ❌ Don't use hardcoded waits

### API Tests
- ✅ Test authentication and authorization
- ✅ Validate response schemas
- ✅ Test error responses
- ✅ Use test database

### Integration Tests
- ✅ Mock external APIs by default
- ✅ Test service interactions
- ✅ Test data flow
- ✅ Test error handling

### Playwright Tests
- ✅ Use Page Object Model
- ✅ Use data-testid selectors
- ✅ Test critical user paths
- ✅ Test mobile responsiveness

### NIST Tests
- ✅ Map to specific NIST controls
- ✅ Document compliance coverage
- ✅ Test security requirements
- ✅ Generate compliance reports

## Test Data Management

### Fixtures
Store reusable test data in `src/support/fixtures/`:

```typescript
// fixtures/products.fixture.ts
export const testProducts = [
  {
    name: 'Lavender Candle',
    price: 24.99,
    sku: 'LAV-001',
    inStock: true,
  },
  // ... more products
];
```

### Factories
Create test data builders in `src/support/factories/`:

```typescript
// factories/order.factory.ts
export class OrderFactory {
  static create(overrides?: Partial<Order>): Order {
    return {
      id: uuid(),
      userId: 'test-user',
      items: [],
      status: 'pending',
      createdAt: new Date(),
      ...overrides,
    };
  }
}
```

## Debugging

### Jest Tests

```bash
# Run with debugging
node --inspect-brk ../../node_modules/.bin/jest --runInBand

# Use VS Code debugger
# Add breakpoint and press F5
```

### Playwright Tests

```bash
# Debug mode
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui

# Show browser
npx playwright test --headed
```

## Troubleshooting

### Tests Timeout
- Increase timeout in `jest.config.cts` or `playwright.config.ts`
- Check if services are running
- Verify database connectivity

### Database Connection Errors
- Ensure test database is created
- Check `DATABASE_URL` in `.env.test`
- Run migrations: `npm run migration:run`

### Keycloak Authentication Fails
- Verify Keycloak is running
- Check realm and client configuration
- Validate credentials in `.env.test`

### Third-Party API Tests Fail
- Use mock mode by default
- Check API credentials for real mode
- Verify rate limits aren't exceeded

## Coverage Reports

Generate coverage reports:

```bash
# Generate coverage
nx e2e --coverage

# View HTML report
open coverage/e2e/index.html  # macOS
start coverage\e2e\index.html  # Windows
```

### Coverage Goals
- **Unit Tests**: 80%+ coverage (co-located with source)
- **Integration Tests**: Key workflows covered
- **API Tests**: All endpoints tested
- **E2E Tests**: Critical user journeys
- **NIST Tests**: Required controls validated

## Dependencies

### Testing Libraries
- `@nx/jest` - Jest executor for Nx
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `@nestjs/testing` - NestJS testing utilities
- `supertest` - HTTP assertions
- `@playwright/test` - Browser automation (to be added)

### Development Dependencies
See root `package.json` for complete list.## Future Enhancements- [ ] Add Playwright configuration and initial tests
- [ ] Implement visual regression testing
- [ ] Add performance benchmarking
- [ ] Create contract tests with Pact
- [ ] Implement chaos engineering tests
- [ ] Add load testing with k6
- [ ] Generate automated compliance reports
- [ ] Add accessibility testing with axe-core
- [ ] Implement API versioning tests
- [ ] Add security scanning integration## Related Documentation- [API README](../api/README.md)
- [Web README](../web/README.md)
- [Development Steps](../../docs/Development%20Steps/)
- [GitHub Actions README](../../.github/README.md)## ContributingWhen adding new tests:1. Choose the appropriate test type (API, integration, Playwright, NIST)
2. Follow existing patterns and conventions
3. Update relevant README files
4. Ensure tests pass locally before committing
5. Add tests to appropriate CI/CD workflows## SupportFor questions or issues with testing:
- Check troubleshooting section above
- Review test examples in each category
- Consult development documentation
- Ask team lead or senior developers---**Remember:** Tests are living documentation. Keep them clean, clear, and up-to-date!
