# Step 38: Service Layer Separation — Public vs Internal APIs

## 1. The "Why" Behind This Step: Clean Architecture Boundaries

As our application has grown, a pattern has emerged: **services have more methods than their controllers expose**. This isn't a bug — some methods are genuinely internal, consumed only by other services. But the lack of explicit boundaries creates confusion:

- Looking at `OrdersService`, how do you know which methods are HTTP endpoints and which are internal helpers?
- When `ManagementController` directly injects `OrdersService` and `ProductsService`, is it reaching into another module's internals?
- If you refactor an internal method, will it break an API contract you didn't know existed?

This tutorial addresses the problem by **separating each module's public API from its internal API** using a clean, consistent pattern.

---

## 2. Current State Audit

Let's look at every module and identify which service methods have controller endpoints and which don't.

### 2.1 Orders Module

| Service Method | Exposed via Controller? | Consumed Internally By |
|---|---|---|
| `findAll()` | ✅ `GET /orders` | ManagementService, ManagementController |
| `findOne(id)` | ❌ | OrdersController (used inside `getRates`, `purchaseLabel`) |
| `findByUser(userId)` | ❌ | ChatbotService |
| `findByContactInfo(contactInfo)` | ❌ | ChatbotService |
| `findByStatus(status)` | ❌ | ManagementController |
| `create(orderData)` | ❌ | CheckoutService |
| `update(id, data)` | ❌ | OrdersController (used inside `purchaseLabel`) |
| `getPendingOrdersCount()` | ❌ | ManagementController |
| `getCompletedOrdersCount()` | ❌ | (not yet consumed) |

**Missing controller endpoints**: `findOne`, `findByUser` (for a user's own orders), `findByStatus`, `update` (admin status change)

### 2.2 Products Module

| Service Method | Exposed via Controller? | Consumed Internally By |
|---|---|---|
| `findAll()` | ✅ `GET /products` | ManagementService, ManagementController, CheckoutService |
| `findOne(id)` | ✅ `GET /products/:id` | CheckoutService |
| `create(data)` | ✅ `POST /products` | — |
| `update(id, data)` | ✅ `PUT /products/:id` | — |
| `findByAttribute(key, value)` | ❌ | ChatbotService |
| `findByScent(scent)` | ❌ | (not yet consumed directly) |
| `getDistinctScents()` | ❌ | (not yet consumed) |

**Missing controller endpoints**: `findByScent` and `getDistinctScents` would be useful public endpoints for browsing

### 2.3 Inventory Service (under Products Module)

| Service Method | Exposed via Controller? | Consumed Internally By |
|---|---|---|
| `updateStock(productId, qty)` | ❌ | (not yet consumed — future checkout/fulfillment) |
| `getLowStockItems()` | ❌ | ManagementController |

**No controller at all** — entirely internal, consumed by Management

### 2.4 Users Module

| Service Method | Exposed via Controller? | Consumed Internally By |
|---|---|---|
| `findById(id)` | ❌ | (not yet consumed) |
| `findByKeycloakId(keycloakId)` | ✅ `GET /users/me` | — |
| `updateProfile(keycloakId, data)` | ✅ `PUT /users/profile` | — |

**Mostly clean** — `findById` is a helper for internal lookups

### 2.5 Cart Module

| Service Method | Exposed via Controller? | Consumed Internally By |
|---|---|---|
| `getCart(userId)` | ✅ `GET /cart` | CheckoutService |
| `addToCart(userId, item)` | ✅ `POST /cart/items` | — |
| `clearCart(userId)` | ✅ `DELETE /cart` | CheckoutService |

**Clean** — all methods exposed, some also used internally by CheckoutService

### 2.6 Chatbot Module

| Service Method | Exposed via Controller? | Consumed Internally By |
|---|---|---|
| `processMessage(text, userId)` | ✅ `POST /chatbot/message` | — |
| `getHistory(userId)` | ✅ `GET /chatbot/history` | — |

**Clean** — everything is exposed

### 2.7 Management Module

| Service Method | Exposed via Controller? | Consumed Internally By |
|---|---|---|
| `getOverview()` | ✅ `GET /management/dashboard/overview` | — |
| `getLowStockAlerts()` | ✅ `GET /management/inventory/alerts` | — |

**Clean** — but the controller also directly calls `OrdersService`, `ProductsService`, `InventoryService`, and `HRService`, reaching into other modules' internals

---

## 3. The Pattern: Public Service vs Internal Service

### 3.1 File Structure

For any module that has methods consumed by other modules, split into two files:

```
orders/
├── orders.controller.ts              ← HTTP routes (only uses OrdersService)
├── orders.service.ts                 ← Public API methods (used by controller)
├── orders-internal.service.ts        ← Internal API methods (used by other modules)
├── orders.module.ts                  ← Exports only what other modules need
├── entities/
│   ├── order.entity.ts
│   └── order-item.entity.ts
└── shipping.service.ts
```

### 3.2 The Rule

> **The Controller only injects the Public Service.  
> Other modules only inject the Internal Service.  
> The Internal Service can use the Public Service, but never the reverse.**

```
                          ┌──────────────────┐
                          │  HTTP Requests    │
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │   Controller      │
                          │ (routes only)     │
                          └────────┬─────────┘
                                   │ injects
                          ┌────────▼─────────┐
                          │  OrdersService    │  ← Public API
                          │  (findAll,        │     (what users can do)
                          │   findOne,        │
                          │   findByUser,     │
                          │   update)         │
                          └────────┬─────────┘
                                   │ extends / delegates
       ┌───────────────────────────┤
       │                           │
┌──────▼──────────────┐    ┌───────▼──────────────┐
│ ChatbotService      │    │ OrdersInternalService │ ← Internal API
│ ManagementService   │    │ (create,              │    (what other services
│ CheckoutService     │───►│  getPendingCount,     │     can do)
│ (other modules)     │    │  getCompletedCount,   │
└─────────────────────┘    │  findByContactInfo)   │
                           └──────────────────────┘
```

---

## 4. Step-by-Step: Refactoring the Orders Module

### 4.1 Create `orders-internal.service.ts`

File: `apps/api/src/modules/orders/orders-internal.service.ts`

Move the methods that **only other services call** into this file:

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { User } from '../users/entities/user.entity';
import { ErrorHandlerService } from '../common/errors/error-handler.service';

@Injectable()
export class OrdersInternalService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private errorService: ErrorHandlerService
  ) {}

  // ─── Used by CheckoutService ───

  async create(orderData: Partial<Order>): Promise<Order> {
    const newOrder = this.ordersRepository.create(orderData);
    return this.ordersRepository.save(newOrder);
  }

  // ─── Used by ManagementController / ManagementService ───

  async getPendingOrdersCount(): Promise<number> {
    try {
      return await this.ordersRepository.count({
        where: [{ status: 'pending' }, { status: 'processing' }],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get pending orders count: ${errorMessage}`);
    }
  }

  async getCompletedOrdersCount(): Promise<number> {
    try {
      return await this.ordersRepository.count({
        where: { status: 'delivered' },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to get completed orders count: ${errorMessage}`
      );
    }
  }

  // ─── Used by ChatbotService ───

  async findByContactInfo(contactInfo: string): Promise<Order[]> {
    try {
      const user = await this.usersRepository.findOne({
        where: [{ email: contactInfo }, { phoneNumber: contactInfo }],
      });

      if (!user) return [];

      if (user.keycloakId) {
        throw new ForbiddenException(
          'This email or phone number is associated with an existing account. Please sign in to view your orders.'
        );
      }

      return this.findByUser(user.id);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.errorService.handleError(
        error,
        'OrdersInternalService.findByContactInfo'
      );
    }
  }

  // Shared helper — used by findByContactInfo and could be used
  // by the public service too
  async findByUser(userId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
```

### 4.2 Refactor `orders.service.ts` (Public)

File: `apps/api/src/modules/orders/orders.service.ts`

This file now only contains methods the **controller needs**:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>
  ) {}

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['items', 'user'],
    });
  }

  async findOne(id: string): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { status },
      relations: ['items', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateData: Partial<Order>): Promise<Order> {
    await this.ordersRepository.update(id, updateData);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException(`Order "${id}" not found`);
    }
    return updated;
  }
}
```

### 4.3 Wire Up the Controller with Missing Endpoints

File: `apps/api/src/modules/orders/orders.controller.ts`

Now that the service is clean, expose the endpoints that were missing:

```typescript
import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ShippingService } from './shipping.service';
import { Roles } from 'nest-keycloak-connect';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shippingService: ShippingService
  ) {}

  // ─── Public Endpoints ───

  @Get()
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Get all orders (admin/worker)' })
  @ApiResponse({ status: 200, description: 'List of all orders' })
  async findAll() {
    return this.ordersService.findAll();
  }

  // ─── User Endpoints ───

  @Get('me')
  @ApiOperation({ summary: 'Get my orders' })
  @ApiResponse({ status: 200, description: 'List of orders for the current user' })
  async getMyOrders(@AuthenticatedUser() user: any) {
    return this.ordersService.findByUser(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiResponse({ status: 200, description: 'The order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }
    return order;
  }

  // ─── Admin/Worker Endpoints ───

  @Get('status/:status')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Get orders by status (admin/worker)' })
  @ApiResponse({ status: 200, description: 'Orders filtered by status' })
  async findByStatus(@Param('status') status: string) {
    return this.ordersService.findByStatus(status);
  }

  @Put(':id')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Update an order (admin/worker)' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  async update(@Param('id') id: string, @Body() updateData: any) {
    return this.ordersService.update(id, updateData);
  }

  // ─── Shipping Endpoints ───

  @Get(':id/rates')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Get shipping rates for an order' })
  async getRates(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }
    return this.shippingService.createShipment(order);
  }

  @Post(':id/label')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Purchase a shipping label for an order' })
  async purchaseLabel(
    @Param('id') id: string,
    @Body('rateId') rateId: string
  ) {
    const transaction = await this.shippingService.purchaseLabel(rateId);

    await this.ordersService.update(id, {
      trackingNumber: transaction.tracking_number,
      shippingLabelUrl: transaction.label_url,
      status: 'shipped',
    });

    return transaction;
  }
}
```

### 4.4 Update the Module

File: `apps/api/src/modules/orders/orders.module.ts`

The key change: **export only `OrdersInternalService`** to other modules. The controller gets `OrdersService` automatically because it's in the same module.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { OrdersService } from './orders.service';
import { OrdersInternalService } from './orders-internal.service';
import { ShippingService } from './shipping.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, User])],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersInternalService, ShippingService],
  exports: [OrdersInternalService], // Only internal service leaves the module
})
export class OrdersModule {}
```

### 4.5 Update Consuming Modules

Now update every service that was importing `OrdersService` from outside the module to use `OrdersInternalService` instead.

**`apps/api/src/modules/cart/checkout.service.ts`**:
```typescript
// Before:
import { OrdersService } from '../orders/orders.service';

// After:
import { OrdersInternalService } from '../orders/orders-internal.service';

@Injectable()
export class CheckoutService {
  constructor(
    private cartService: CartService,
    private productsService: ProductsService,
    private ordersService: OrdersInternalService  // Changed
  ) {}

  // ... rest unchanged — .create() lives on OrdersInternalService now
}
```

**`apps/api/src/modules/chatbot/chatbot.service.ts`**:
```typescript
// Before:
import { OrdersService } from '../orders/orders.service';

// After:
import { OrdersInternalService } from '../orders/orders-internal.service';

@Injectable()
export class ChatbotService {
  constructor(
    private productsService: ProductsService,
    private ordersService: OrdersInternalService  // Changed
  ) {}

  // ... rest unchanged — .findByContactInfo() and .findByUser()
  // live on OrdersInternalService now
}
```

**`apps/api/src/modules/management/management.service.ts`**:
```typescript
// Before:
import { OrdersService } from '../orders/orders.service';

// After:
import { OrdersInternalService } from '../orders/orders-internal.service';

@Injectable()
export class ManagementService {
  constructor(
    private ordersService: OrdersInternalService,  // Changed
    private productsService: ProductsService,
    private hrService: HRService
  ) {}
  // ... .findAll() would need to be on internal service too,
  // or management uses its own query
}
```

**`apps/api/src/modules/management/management.controller.ts`**:
```typescript
// Update the injection to use OrdersInternalService
import { OrdersInternalService } from '../orders/orders-internal.service';

constructor(
  private hrService: HRService,
  private inventoryService: InventoryService,
  private managementService: ManagementService,
  private ordersService: OrdersInternalService,  // Changed
  private productsService: ProductsService
) {}
```

---

## 5. Apply the Same Pattern to Products

### 5.1 Create `products-internal.service.ts`

File: `apps/api/src/modules/products/products-internal.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';

@Injectable()
export class ProductsInternalService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>
  ) {}

  // ─── Used by ChatbotService ───

  async findByAttribute(key: string, value: any): Promise<Product[]> {
    const query = { [`attributes.${key}`]: value };
    return this.productModel.find(query).exec();
  }

  async findByScent(scent: string): Promise<Product[]> {
    const query = { 'attributes.scent': scent };
    return this.productModel.find(query).exec();
  }

  async getDistinctScents(): Promise<string[]> {
    return this.productModel.distinct('attributes.scent').exec() as Promise<
      string[]
    >;
  }

  // ─── Used by ManagementService ───

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productModel.findById(id).exec();
  }
}
```

### 5.2 Refactor `products.service.ts` (Public)

The public service keeps only what the controller exposes:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productModel.findById(id).exec();
  }

  async create(productData: Partial<Product>): Promise<Product> {
    const newProduct = new this.productModel(productData);
    return newProduct.save();
  }

  async update(
    id: string,
    updateData: Partial<Product>
  ): Promise<Product | null> {
    return this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }
}
```

### 5.3 Update the Products Module

```typescript
@Module({
  imports: [MongooseModule.forFeature([...])],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsInternalService, InventoryService],
  exports: [ProductsInternalService, InventoryService],
})
export class ProductsModule {}
```

---

## 6. Modules That Don't Need Splitting

Not every module needs this treatment. Here's the decision framework:

| Module | Needs Split? | Why |
|---|---|---|
| **Orders** | ✅ Yes | 4+ methods consumed by 3 other modules |
| **Products** | ✅ Yes | 3 methods consumed by Chatbot + Management |
| **Cart** | ❌ No | Only CheckoutService (same module) uses internal methods |
| **Users** | ❌ No | `findById` is the only internal method — too small to justify a second file |
| **Auth** | ❌ No | No internal consumers |
| **Chatbot** | ❌ No | No internal consumers |
| **Payments** | ❌ No | No internal consumers (webhook is public) |
| **Management** | ❌ No | Consumes other modules but isn't consumed itself |

**Rule of thumb**: Split when a module has **3+ methods used by 2+ external modules**. Below that threshold, comments or a well-organized single service are fine.

---

## 7. Management Controller: Stop Reaching Into Other Modules

The management controller currently injects `OrdersService`, `ProductsService`, and `InventoryService` directly. After the refactor, it should inject the **internal** services instead. Better yet, move as much aggregation as possible into `ManagementService` so the controller stays thin:

### Before (Controller does too much):
```typescript
@Controller('management')
export class ManagementController {
  constructor(
    private hrService: HRService,
    private inventoryService: InventoryService,
    private managementService: ManagementService,
    private ordersService: OrdersService,      // Reaching in
    private productsService: ProductsService   // Reaching in
  ) {}
}
```

### After (Controller delegates to ManagementService):
```typescript
@Controller('management')
export class ManagementController {
  constructor(
    private managementService: ManagementService,
    private hrService: HRService
  ) {}

  @Get('dashboard/overview')
  async getOverview() {
    return this.managementService.getOverview();
  }

  @Get('orders')
  async getOrders() {
    return this.managementService.getAllOrders();
  }

  @Get('orders/status/:status')
  async getOrdersByStatus(@Param('status') status: string) {
    return this.managementService.getOrdersByStatus(status);
  }

  // ... etc
}
```

Then `ManagementService` uses `OrdersInternalService` and `ProductsInternalService`:

```typescript
@Injectable()
export class ManagementService {
  constructor(
    private ordersInternal: OrdersInternalService,
    private productsInternal: ProductsInternalService,
    private inventoryService: InventoryService,
    private hrService: HRService
  ) {}

  async getOverview() { ... }
  async getAllOrders() { ... }
  async getOrdersByStatus(status: string) { ... }
  async getInventoryReport() { ... }
}
```

---

## 8. Quick Reference: Import Rules

After this refactor, the import rules become simple:

| If you're in... | You import... | Never import... |
|---|---|---|
| `OrdersController` | `OrdersService` | `OrdersInternalService` |
| `CheckoutService` (Cart module) | `OrdersInternalService` | `OrdersService` |
| `ChatbotService` | `OrdersInternalService` | `OrdersService` |
| `ManagementService` | `OrdersInternalService` | `OrdersService` |
| `ProductsController` | `ProductsService` | `ProductsInternalService` |
| `ChatbotService` | `ProductsInternalService` | `ProductsService` |

---

## 9. Implementation Checklist

### Orders Module
- [ ] Create `orders-internal.service.ts` with `create`, `findByContactInfo`, `findByUser`, `getPendingOrdersCount`, `getCompletedOrdersCount`
- [ ] Refactor `orders.service.ts` to keep only public methods: `findAll`, `findOne`, `findByUser`, `findByStatus`, `update`
- [ ] Add missing endpoints to `orders.controller.ts`: `GET /me`, `GET /:id`, `GET /status/:status`, `PUT /:id`
- [ ] Update `orders.module.ts` to provide both services, export only `OrdersInternalService`
- [ ] Update `CheckoutService` to inject `OrdersInternalService`
- [ ] Update `ChatbotService` to inject `OrdersInternalService`
- [ ] Update `ManagementService` to inject `OrdersInternalService`
- [ ] Update `ManagementController` to stop directly injecting `OrdersService`

### Products Module
- [ ] Create `products-internal.service.ts` with `findByAttribute`, `findByScent`, `getDistinctScents`, `findAll`, `findOne`
- [ ] Refactor `products.service.ts` to keep only public methods
- [ ] Update `products.module.ts` to export only `ProductsInternalService`
- [ ] Update `ChatbotService` to inject `ProductsInternalService`
- [ ] Update `ManagementService` to inject `ProductsInternalService`
- [ ] Update `ManagementController` to stop directly injecting `ProductsService`

### Management Module
- [ ] Move all cross-module aggregation from `ManagementController` into `ManagementService`
- [ ] Reduce controller to thin routing layer

### Tests
- [ ] Add Playwright API tests for new Orders endpoints (`GET /me`, `GET /:id`, `GET /status/:status`, `PUT /:id`)
- [ ] Update existing tests if import paths changed
- [ ] Verify all existing tests still pass

---

## 10. When to Revisit This Pattern

This pattern scales well, but watch for these signals that you've outgrown it:

- **A module has 3+ internal service files** → Consider a shared library (`libs/`) instead
- **Circular dependencies** → Module A's internal service needs Module B, and vice versa. Extract the shared logic into a new module
- **Internal service gets consumed by 5+ modules** → It's not really "internal" anymore — promote it to its own module with a proper controller

The goal isn't architectural purity for its own sake — it's making it **obvious** where every method is called from and who depends on what.
