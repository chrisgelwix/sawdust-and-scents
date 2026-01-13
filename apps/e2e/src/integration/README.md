# Integration Tests

## Overview

Integration tests verify that multiple components, services, and external systems work correctly together.

## Purpose

- **Service Integration**: Test interactions between internal services
- **Third-Party APIs**: Validate external API integrations
- **Database Operations**: Test data persistence and retrieval across layers
- **Message Flow**: Verify data flow through the system
- **End-to-End Scenarios**: Test complete business workflows

## Scope

Integration tests sit between unit tests (single component) and E2E tests (full system):

```
Unit Tests         → Test individual functions/classes
Integration Tests  → Test component interactions (YOU ARE HERE)
E2E Tests         → Test full user workflows
```

## Structure

```
integration/
├── services/           # Service-to-service integration
│   ├── auth/          # Auth service integration
│   ├── orders/        # Order processing integration
│   └── payments/      # Payment processing integration
├── external-apis/     # Third-party API integration
│   ├── adp/          # ADP HR system
│   ├── shippo/       # Shippo shipping
│   └── stripe/       # Payment processing
├── database/          # Database integration tests
└── workflows/         # Business workflow tests
```

## Running Tests

```bash
# Run all integration tests
nx e2e --testPathPattern=integration

# Run service integration tests
nx e2e --testPathPattern=integration/services

# Run external API tests
nx e2e --testPathPattern=integration/external-apis

# Run with real APIs (requires credentials)
TEST_ENV=real nx e2e --testPathPattern=integration
```

## Example Test

```typescript
describe('Order to Shipment Integration', () => {
  let orderService: OrdersService;
  let shippingService: ShippingService;
  let order: Order;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [OrdersModule, ShippingModule],
    }).compile();

    orderService = module.get<OrdersService>(OrdersService);
    shippingService = module.get<ShippingService>(ShippingService);
  });

  it('should create shipment when order is placed', async () => {
    // Create order
    order = await orderService.create({
      userId: 'test-user',
      items: [{ productId: 'candle-1', quantity: 2 }],
      shippingAddress: {
        street: '123 Main St',
        city: 'Portland',
        state: 'OR',
        zip: '97201',
      },
    });

    expect(order.status).toBe('pending');

    // Process payment (mocked)
    await orderService.processPayment(order.id, 'tok_visa');

    // Verify shipment was created
    const shipment = await shippingService.findByOrderId(order.id);
    expect(shipment).toBeDefined();
    expect(shipment.status).toBe('ready_to_ship');
    expect(shipment.trackingNumber).toBeTruthy();
  });
});
```

## Mock vs Real APIs

### Mock Mode (Default)
- Uses in-memory test doubles
- Fast and reliable
- No external dependencies
- Safe for CI/CD

### Real Mode (Optional)
- Uses actual external APIs
- Requires valid credentials
- Tests real integration behavior
- Use sparingly due to cost/rate limits

## Best Practices

- ✅ Use test database for data operations
- ✅ Mock external APIs by default
- ✅ Test error scenarios and edge cases
- ✅ Clean up test data after each test
- ✅ Use factories for test data creation
- ❌ Don't test implementation details
- ❌ Don't depend on test execution order
- ❌ Don't leave test data in production systems

## Third-Party Integration Testing

### ADP (HR System)
- Employee sync workflows
- Payroll data retrieval
- User provisioning

### Shippo (Shipping)
- Rate calculation
- Label generation
- Tracking updates

### Stripe (Payments) - Future
- Payment processing
- Webhook handling
- Refund operations

## Future Enhancements

- [ ] Contract testing with Pact
- [ ] API versioning compatibility tests
- [ ] Performance benchmarking
- [ ] Chaos engineering tests
- [ ] Service mesh integration
