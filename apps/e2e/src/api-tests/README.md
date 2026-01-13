# API Tests

## Overview

Automated API endpoint testing using Jest and Supertest for RESTful API validation.

## Purpose

- **Endpoint Testing**: Validate API endpoints return correct responses
- **Input Validation**: Test request validation and error handling
- **Authentication**: Verify JWT token and Keycloak integration
- **Authorization**: Test role-based access control (RBAC)
- **Data Validation**: Ensure response schemas match specifications

## Structure

```
api-tests/
├── auth/           # Authentication endpoints
├── products/       # Product catalog endpoints
├── cart/           # Shopping cart endpoints
├── orders/         # Order management endpoints
├── management/     # Admin dashboard endpoints
└── api.spec.ts     # Main API test suite
```

## Running Tests

```bash
# Run all API tests
nx e2e

# Run specific test file
nx e2e --testFile=api-tests/products

# Run with coverage
nx e2e --coverage
```

## Example Test

```typescript
describe('GET /api/products', () => {
  it('should return list of products', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/products')
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('should require authentication for admin endpoints', async () => {
    await request(app.getHttpServer())
      .get('/api/management/dashboard')
      .expect(401);
  });

  it('should validate product creation', async () => {
    const invalidProduct = { name: 'Test' }; // Missing required fields

    const response = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidProduct)
      .expect(400);

    expect(response.body.message).toContain('validation');
  });
});
```

## Test Categories

### Functional Tests
- Endpoint responses
- CRUD operations
- Business logic

### Security Tests
- Authentication
- Authorization
- Input sanitization

### Validation Tests
- Request validation
- Response schemas
- Error handling

## Best Practices

- ✅ Test happy path and error cases
- ✅ Use test database with seed data
- ✅ Clean up test data after tests
- ✅ Test authentication and authorization
- ✅ Validate response schemas
- ❌ Don't test third-party libraries
- ❌ Don't rely on external services in tests

## Related Documentation

- See `../../docs/Development Steps/` for API implementation details
- See Swagger docs at `/api/docs` when API is running
