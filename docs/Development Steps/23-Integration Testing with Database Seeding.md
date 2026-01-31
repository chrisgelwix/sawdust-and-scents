# Step 23: Integration Testing with Database Seeding

## 1. The "Why" Behind This Step: Testing Real Connections

You've built a complex API with two databases (PostgreSQL and MongoDB), external services (ADP, Shippo), and Keycloak authentication. **Unit tests** can't verify that everything works together. You need **Integration Tests** that prove your API actually connects to real databases and returns correct data.

**The Strategy**: Create integration tests with database seeders.
- **The Analogy**: Unit tests verify individual gears work. Integration tests verify the entire watch tells time correctly.
- **The Benefit**: Catch issues like incorrect SQL queries, MongoDB schema mismatches, or connection problems before production.

---

## 2. Core Concepts & Definitions

### 2.1 Unit Tests vs Integration Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| **Scope** | Single function/class | Multiple components |
| **Database** | Mocked/In-memory | Real test database |
| **Speed** | Fast (milliseconds) | Slower (seconds) |
| **Location** | Co-located with code | `apps/e2e/` |
| **Purpose** | Verify logic | Verify connections |

### 2.2 Test Database Strategy

**Never test against development or production databases!**

```
Development:  sawdust_scents
Test:         sawdust_scents_test
Production:   sawdust_scents_prod
```

### 2.3 Database Seeding

- **Definition**: Pre-populating test databases with known data before tests run.
- **The Logic**: Instead of manually creating products/orders in each test, seeders provide consistent test data.

### 2.4 Test Isolation

- **Definition**: Each test should be independent and not affect others.
- **Strategy**: Clear database before each test or use transactions that rollback.

---

## 3. Prerequisites

Before proceeding, ensure you have:

- ✅ Steps 1-13 completed (Backend foundation)
- ✅ PostgreSQL and MongoDB running locally
- ✅ Test databases created
- ✅ `@nestjs/testing` and `supertest` installed

---

## 4. Step-by-Step Implementation Guide

### Step 4.1: Create Test Database Configuration

**File**: `apps/e2e/src/support/test-database.config.ts`

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const testPostgresConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'sawdust_scents_test',
  entities: ['apps/api/src/**/*.entity.{ts,js}'],
  synchronize: true,  // Auto-create schema
  dropSchema: true,   // Fresh schema each run
  logging: false,
};

export const testMongoConfig: MongooseModuleOptions = {
  uri: 'mongodb://admin:admin@localhost:27017/sawdust_scents_test?authSource=admin',
};
```

**Key Points:**
- `synchronize: true` - TypeORM creates tables automatically
- `dropSchema: true` - Fresh database for each test run
- Separate database names with `_test` suffix

### Step 4.2: Create Database Seeders

#### Product Seeder (MongoDB)

**File**: `apps/e2e/src/support/seeders/product.seeder.ts`

```typescript
import { Model } from 'mongoose';

export class ProductSeeder {
  constructor(private productModel: Model<any>) {}

  async seedProducts() {
    return await this.productModel.insertMany([
      {
        name: 'Lavender Dream Candle',
        price: 24.99,
        category: 'candle',
        sku: 'LAV-001',
        attributes: {
          stock: 50,
          lowStockThreshold: 10,
        },
      },
      {
        name: 'Welcome Home Sign',
        price: 39.99,
        category: 'sign',
        sku: 'SIGN-001',
        attributes: {
          stock: 25,
          lowStockThreshold: 5,
        },
      },
    ]);
  }

  async clearProducts() {
    await this.productModel.deleteMany({});
  }
}
```

#### User Seeder (PostgreSQL)

**File**: `apps/e2e/src/support/seeders/user.seeder.ts`

```typescript
import { Repository } from 'typeorm';
import { User } from '../../../../api/src/modules/users/entities/user.entity';

export class UserSeeder {
  constructor(private userRepository: Repository<User>) {}

  async createTestUser() {
    return await this.userRepository.save({
      email: 'test@example.com',
      keycloakId: 'test-kc-id',
      firstName: 'Test',
      lastName: 'User',
      roles: ['customer'],
    });
  }

  async createAdminUser() {
    return await this.userRepository.save({
      email: 'admin@sawdust-scents.com',
      keycloakId: 'admin-kc-id',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin'],
    });
  }

  async clearUsers() {
    await this.userRepository.delete({});
  }
}
```

#### Order Seeder (PostgreSQL)

**File**: `apps/e2e/src/support/seeders/order.seeder.ts`

```typescript
import { Repository } from 'typeorm';
import { Order } from '../../../../api/src/modules/orders/entities/order.entity';
import { User } from '../../../../api/src/modules/users/entities/user.entity';

export class OrderSeeder {
  constructor(
    private orderRepository: Repository<Order>,
    private userRepository: Repository<User>
  ) {}

  async seedOrders(user: User) {
    return await this.orderRepository.save([
      {
        user,
        status: 'pending',
        total: 74.97,
        shippingAddress: {
          street: '123 Main St',
          city: 'Portland',
          state: 'OR',
          zip: '97201',
        },
      },
      {
        user,
        status: 'delivered',
        total: 119.97,
        shippingAddress: {
          street: '789 Pine Rd',
          city: 'Eugene',
          state: 'OR',
          zip: '97401',
        },
      },
    ]);
  }

  async clearOrders() {
    await this.orderRepository.delete({});
  }
}
```

### Step 4.3: Create Test Helpers

**File**: `apps/e2e/src/support/test-helpers.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

export class TestHelper {
  private app: INestApplication;
  
  async initializeTestApp(AppModule: any) {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = module.createNestApplication();
    await this.app.init();
    return this.app;
  }

  async close() {
    await this.app.close();
  }
}

// Mock Keycloak for testing
export function mockKeycloakAuth(role: string = 'admin') {
  return {
    canActivate: jest.fn(() => true),
  };
}
```

### Step 4.4: Write Integration Tests

**File**: `apps/e2e/src/integration/management-api.integration.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ManagementModule } from '../../../api/src/modules/management/management.module';
import { testPostgresConfig, testMongoConfig } from '../support/test-database.config';

describe('Management API Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testPostgresConfig),
        MongooseModule.forRoot(testMongoConfig.uri),
        ManagementModule,
      ],
    })
      .overrideGuard('KeycloakGuard')
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /management/dashboard/overview', () => {
    it('should return dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/management/dashboard/overview')
        .expect(200);

      expect(response.body).toHaveProperty('inventory');
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /management/orders', () => {
    it('should return all orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/management/orders')
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
    });
  });
});
```

---

## 5. Running Integration Tests

### Step 5.1: Setup Test Databases

```bash
# Create PostgreSQL test database
psql -U postgres -c "CREATE DATABASE sawdust_scents_test;"

# MongoDB test database is created automatically on first connection
```

### Step 5.2: Configure Test Environment

Create `.env.test`:

```bash
# PostgreSQL Test
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB_TEST=sawdust_scents_test

# MongoDB Test
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_USER=admin
MONGO_PASSWORD=admin
MONGO_DB_TEST=sawdust_scents_test

# Test Configuration
NODE_ENV=test
```

### Step 5.3: Run Tests

```bash
# Run all integration tests
nx e2e --testPathPattern=integration

# Run specific test file
nx e2e --testFile=integration/management-api.integration.spec.ts

# Run with coverage
nx e2e --testPathPattern=integration --coverage

# Watch mode
nx e2e --testPathPattern=integration --watch
```

---

## 6. Best Practices

### 6.1 Database Isolation

```typescript
// Good: Clear database before each test
beforeEach(async () => {
  await seeder.clearAll();
});

// Bad: Tests depend on previous test data
test('test 1', () => { /* creates user */ });
test('test 2', () => { /* assumes user exists */ });
```

### 6.2 Realistic Test Data

```typescript
// Good: Realistic data
const product = {
  name: 'Lavender Candle',
  price: 24.99,
  sku: 'LAV-001',
};

// Bad: Lazy data
const product = {
  name: 'Test',
  price: 1,
  sku: 'TEST',
};
```

### 6.3 Test What Matters

```typescript
// Good: Test actual behavior
expect(response.body.orders.length).toBeGreaterThan(0);
expect(response.body.orders[0]).toHaveProperty('status');

// Bad: Test implementation details
expect(mockFunction).toHaveBeenCalledWith(...);
```

### 6.4 Use Factories for Complex Data

```typescript
class OrderFactory {
  static create(overrides?: Partial<Order>): Order {
    return {
      id: uuid(),
      status: 'pending',
      total: 0,
      items: [],
      ...overrides,
    };
  }
}

// Usage
const order = OrderFactory.create({ status: 'delivered', total: 99.99 });
```

---

## 7. Testing Strategy Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Testing Pyramid                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│           E2E Tests (Playwright)         ← Few          │
│                  /\                                     │
│                 /  \                                    │
│          Integration Tests              ← Some         │
│               /      \                                  │
│              /        \                                 │
│         Unit Tests                      ← Many         │
│                                                         │
└─────────────────────────────────────────────────────────┘

Unit Tests:           Fast, isolated, many
Integration Tests:    Moderate, real DB, some  ← YOU ARE HERE
E2E Tests:            Slow, full system, few
```

---

## 8. Common Patterns

### 8.1 Test Lifecycle

```typescript
describe('Feature Tests', () => {
  // Run once before all tests
  beforeAll(async () => {
    app = await createTestApp();
  });

  // Run once after all tests
  afterAll(async () => {
    await app.close();
  });

  // Run before each test
  beforeEach(async () => {
    await clearDatabase();
    await seedTestData();
  });

  // Run after each test
  afterEach(async () => {
    // Cleanup if needed
  });
});
```

### 8.2 Testing Async Operations

```typescript
it('should create order asynchronously', async () => {
  const response = await request(app.getHttpServer())
    .post('/orders')
    .send(orderData)
    .expect(201);

  // Wait for async processing
  await new Promise(resolve => setTimeout(resolve, 100));

  const order = await orderRepository.findOne(response.body.id);
  expect(order.status).toBe('pending');
});
```

### 8.3 Testing Error Scenarios

```typescript
it('should handle database connection errors', async () => {
  // Temporarily break the connection
  await app.close();

  const response = await request(app.getHttpServer())
    .get('/management/orders')
    .expect(500);

  expect(response.body.message).toContain('database');
});
```

---

## 9. Advanced Topics

### 9.1 Parallel Test Execution

```typescript
// Use unique database per worker
export function getTestDbName(workerId: number) {
  return `sawdust_scents_test_${workerId}`;
}
```

### 9.2 Transaction Rollback Strategy

```typescript
// Faster than clearing: rollback after each test
beforeEach(async () => {
  await queryRunner.startTransaction();
});

afterEach(async () => {
  await queryRunner.rollbackTransaction();
});
```

### 9.3 Mock External Services

```typescript
// Mock ADP service in integration tests
const mockADPService = {
  getActiveEmployees: jest.fn().mockResolvedValue([]),
  getEmployeePayroll: jest.fn().mockResolvedValue(null),
};

// Override in test module
.overrideProvider(ADPService)
.useValue(mockADPService)
```

---

## 10. Troubleshooting

### Issue: Tests timeout

```typescript
// Increase timeout
jest.setTimeout(30000); // 30 seconds
```

### Issue: Database connection errors

```bash
# Ensure databases are running
docker-compose up -d postgres mongodb

# Check connections
psql -U postgres -l
mongo --eval "db.adminCommand('listDatabases')"
```

### Issue: Port already in use

```typescript
// Use random port for tests
const port = Math.floor(Math.random() * 10000) + 10000;
await app.listen(port);
```

### Issue: Flaky tests

```typescript
// Add proper waits
await waitForCondition(async () => {
  const result = await checkSomething();
  return result === expectedValue;
}, 5000);
```

---

## 11. CI/CD Integration

### Step 11.1: Update GitHub Actions

```yaml
# .github/workflows/ci.yml
  integration_tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      mongodb:
        image: mongo:6
        env:
          MONGO_INITDB_ROOT_USERNAME: admin
          MONGO_INITDB_ROOT_PASSWORD: admin

    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        run: npx nx e2e --testPathPattern=integration
        env:
          POSTGRES_HOST: postgres
          MONGO_HOST: mongodb
```

---

## 12. Verification Checklist

- [ ] **Test databases created**: PostgreSQL and MongoDB test databases exist
- [ ] **Seeders implemented**: Product, User, and Order seeders work
- [ ] **Tests pass**: All integration tests run successfully
- [ ] **Database isolation**: Tests don't interfere with each other
- [ ] **Mocked auth**: Keycloak authentication bypassed in tests
- [ ] **Realistic data**: Test data resembles production data
- [ ] **Error handling**: Tests verify error scenarios
- [ ] **CI integration**: Tests run automatically in GitHub Actions
- [ ] **Documentation**: Tests are self-documenting with clear descriptions

---

## 13. Key Takeaways

✅ **Integration tests verify connections** - They prove your API works with real databases  
✅ **Seeders provide consistent data** - No manual setup needed  
✅ **Test isolation is critical** - Each test should be independent  
✅ **Mock external services** - ADP, Shippo, Keycloak in tests  
✅ **Separate test databases** - Never test on development/production  
✅ **Fast enough to run often** - Integration tests should take seconds, not minutes  

---

## 14. Next Steps

1. **Implement the seeders** following the patterns above
2. **Write integration tests** for each controller
3. **Add to CI/CD** to run automatically
4. **Monitor coverage** - aim for critical paths covered
5. **Move to Step 24** - Build frontend components

**Congratulations!** You now understand how to test your API with real database connections! 🧪

---

## 15. Example Implementation Order

When you're ready to implement:

1. ✅ Create `test-database.config.ts`
2. ✅ Create `product.seeder.ts`
3. ✅ Create `user.seeder.ts`
4. ✅ Create `order.seeder.ts`
5. ✅ Create `test-helpers.ts`
6. ✅ Write first integration test
7. ✅ Run and verify tests pass
8. ✅ Add more test cases
9. ✅ Integrate into CI/CD

**Remember**: Integration tests are your safety net. They catch bugs that unit tests miss!
