# Step 20: Points & Rewards System — "Ember Rewards"

## 1. The "Why" Behind This Step: Customer Loyalty

Acquiring a new customer costs **5–7x more** than retaining an existing one. A points-based rewards program gives customers a reason to keep coming back: every dollar they spend earns points, and those points translate to discounts on future orders. Combined with the subscription service from Step 19, this creates a powerful loyalty loop — subscribers earn points passively each month, which they can redeem on one-off purchases.

In this step we'll build:
- A **ledger-based** points system (every earn/spend is a transaction — never just a raw balance)
- Configurable earning rules (per-dollar, subscription bonuses, sign-up bonuses)
- Redemption at checkout (convert points to a discount)
- Points history and balance API
- Admin visibility into total points liability

---

## 2. Shared Types

### 2.1 Add Rewards Types
File: `libs/shared/types/src/lib/models.ts`

**Tutorial Action**: Add the rewards interfaces and enums alongside the existing types.

```typescript
// ─── Rewards Types ───

export enum PointsTransactionType {
  PURCHASE_EARN = 'purchase_earn',       // Earned from placing an order
  SUBSCRIPTION_EARN = 'subscription_earn', // Monthly bonus for subscribers
  SIGNUP_BONUS = 'signup_bonus',          // One-time bonus for new accounts
  REFERRAL_BONUS = 'referral_bonus',      // Earned from referring a friend
  REDEMPTION = 'redemption',              // Spent on an order discount
  REFUND_ADJUSTMENT = 'refund_adjustment', // Points returned after order refund
  EXPIRATION = 'expiration',              // Points expired due to inactivity
  ADMIN_ADJUSTMENT = 'admin_adjustment',  // Manual adjustment by admin
}

export interface PointsTransaction {
  id: string;
  userId: string;
  type: PointsTransactionType;
  points: number;         // Positive for earning, negative for spending
  description: string;    // Human-readable reason
  referenceId?: string;   // Order ID, subscription ID, etc.
  createdAt: Date;
}

export interface RewardsAccount {
  userId: string;
  currentBalance: number;  // Derived from transaction ledger
  lifetimeEarned: number;
  lifetimeRedeemed: number;
}
```

---

## 3. Database Entities

### 3.1 Points Transaction Entity (The Ledger)
File: `apps/api/src/modules/rewards/entities/points-transaction.entity.ts`

**Tutorial Action**: This is the core of the system. Every single points change — earning, spending, adjustments — is an immutable row in this table. The balance is always calculated by summing the ledger.

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('points_transactions')
@Index(['user', 'createdAt']) // Fast lookups for user's transaction history
export class PointsTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: false })
  user!: User;

  @Column()
  type!: string;
  // purchase_earn, subscription_earn, signup_bonus,
  // referral_bonus, redemption, refund_adjustment,
  // expiration, admin_adjustment

  @Column({ type: 'integer' })
  points!: number; // Positive = earn, Negative = spend

  @Column()
  description!: string;

  @Column({ nullable: true })
  referenceId?: string; // Links to orderId, subscriptionId, etc.

  @CreateDateColumn()
  createdAt!: Date;
}
```

**Why a ledger instead of a balance column?** Three critical reasons:
1. **Auditability** — You can trace exactly where every point came from and went
2. **Reconciliation** — If there's ever a dispute, the math is provable
3. **Reversibility** — Refund adjustments are just new rows, not edits to existing data

### 3.2 Update User Entity
File: `apps/api/src/modules/users/entities/user.entity.ts`

**Tutorial Action**: Add the relationship from User → PointsTransactions.

```typescript
import { PointsTransaction } from '../../rewards/entities/points-transaction.entity';

// Inside the User class, add:
@OneToMany(() => PointsTransaction, (pt) => pt.user)
pointsTransactions!: PointsTransaction[];
```

---

## 4. Rewards Configuration

### 4.1 Create the Rewards Config
File: `apps/api/src/modules/rewards/rewards.config.ts`

**Tutorial Action**: Centralize all the earning and redemption rules in one place. This makes it easy for the business to tweak values without hunting through service code.

```typescript
/**
 * Ember Rewards Configuration
 *
 * All rewards rules in one place. In the future, these could
 * come from a database table or admin UI for dynamic configuration.
 */
export const REWARDS_CONFIG = {
  // ─── Earning Rules ───
  earning: {
    /** Points earned per $1 spent on orders */
    pointsPerDollar: 10,

    /** Multiplier for subscribers (e.g., 2x = subscribers earn double) */
    subscriberMultiplier: 2,

    /** One-time bonus when a new user creates an account */
    signupBonus: 500,

    /** Bonus for referring a new customer who places an order */
    referralBonus: 1000,
  },

  // ─── Redemption Rules ───
  redemption: {
    /** How many points equal $1 in discount */
    pointsPerDollar: 100,

    /** Minimum points that can be redeemed at once */
    minimumRedemption: 500,

    /** Maximum discount percentage allowed per order (e.g., 50%) */
    maxDiscountPercent: 50,
  },

  // ─── Expiration Rules ───
  expiration: {
    /** Points expire after this many months of account inactivity */
    inactivityMonths: 12,
  },
};
```

---

## 5. Rewards Service

### 5.1 Create the Rewards Service
File: `apps/api/src/modules/rewards/rewards.service.ts`

**Tutorial Action**: This service handles all points operations. Note that **every method that changes points creates a ledger entry** — there is no "set balance" shortcut.

```typescript
import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointsTransaction } from './entities/points-transaction.entity';
import { REWARDS_CONFIG } from './rewards.config';
import { ErrorHandlerService } from '../common/errors/error-handler.service';

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    @InjectRepository(PointsTransaction)
    private transactionRepository: Repository<PointsTransaction>,
    private errorService: ErrorHandlerService
  ) {}

  // ═══════════════════════════════════════
  //  BALANCE & HISTORY
  // ═══════════════════════════════════════

  /**
   * Get the current points balance for a user.
   * Calculated by summing all ledger entries.
   */
  async getBalance(userId: string): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('pt')
      .select('SUM(pt.points)', 'balance')
      .where('pt.userId = :userId', { userId })
      .getRawOne();

    return parseInt(result?.balance || '0', 10);
  }

  /**
   * Get a full rewards account summary for a user.
   */
  async getAccount(userId: string): Promise<{
    currentBalance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
  }> {
    const [balance, earned, redeemed] = await Promise.all([
      this.getBalance(userId),
      this.getLifetimeEarned(userId),
      this.getLifetimeRedeemed(userId),
    ]);

    return {
      currentBalance: balance,
      lifetimeEarned: earned,
      lifetimeRedeemed: redeemed,
    };
  }

  /**
   * Get paginated transaction history for a user.
   */
  async getHistory(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ transactions: PointsTransaction[]; total: number }> {
    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where: { user: { id: userId } },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      }
    );

    return { transactions, total };
  }

  // ═══════════════════════════════════════
  //  EARNING POINTS
  // ═══════════════════════════════════════

  /**
   * Award points for a completed purchase.
   * Called when an order status changes to 'delivered'.
   *
   * @param userId - The user who placed the order
   * @param orderTotal - The total dollar amount of the order
   * @param orderId - Reference to the order
   * @param isSubscriber - Whether user has an active subscription (earns bonus)
   */
  async earnFromPurchase(
    userId: string,
    orderTotal: number,
    orderId: string,
    isSubscriber = false
  ): Promise<PointsTransaction> {
    const { pointsPerDollar, subscriberMultiplier } =
      REWARDS_CONFIG.earning;

    let points = Math.floor(orderTotal * pointsPerDollar);
    let description = `Earned ${points} points from order`;

    if (isSubscriber) {
      points = Math.floor(points * subscriberMultiplier);
      description += ` (${subscriberMultiplier}x subscriber bonus!)`;
    }

    return this.createTransaction(
      userId,
      'purchase_earn',
      points,
      description,
      orderId
    );
  }

  /**
   * Award the one-time sign-up bonus.
   */
  async awardSignupBonus(userId: string): Promise<PointsTransaction> {
    // Check if bonus was already awarded
    const existing = await this.transactionRepository.findOne({
      where: { user: { id: userId }, type: 'signup_bonus' },
    });

    if (existing) {
      this.logger.warn(`Signup bonus already awarded for user ${userId}`);
      return existing;
    }

    return this.createTransaction(
      userId,
      'signup_bonus',
      REWARDS_CONFIG.earning.signupBonus,
      'Welcome to Ember Rewards! Here\'s your signup bonus.'
    );
  }

  /**
   * Award bonus for a monthly subscription renewal.
   */
  async earnFromSubscription(
    userId: string,
    subscriptionId: string,
    planPrice: number
  ): Promise<PointsTransaction> {
    const points = Math.floor(
      planPrice *
        REWARDS_CONFIG.earning.pointsPerDollar *
        REWARDS_CONFIG.earning.subscriberMultiplier
    );

    return this.createTransaction(
      userId,
      'subscription_earn',
      points,
      `Monthly subscription points (${REWARDS_CONFIG.earning.subscriberMultiplier}x bonus)`,
      subscriptionId
    );
  }

  // ═══════════════════════════════════════
  //  REDEEMING POINTS
  // ═══════════════════════════════════════

  /**
   * Redeem points for a discount on an order.
   * Returns the dollar discount amount.
   *
   * @param userId - Who is redeeming
   * @param pointsToRedeem - How many points to spend
   * @param orderTotal - The order total (to enforce max discount %)
   * @param orderId - Reference to the order
   * @returns The dollar discount to apply
   */
  async redeem(
    userId: string,
    pointsToRedeem: number,
    orderTotal: number,
    orderId: string
  ): Promise<{ discount: number; transaction: PointsTransaction }> {
    const { pointsPerDollar, minimumRedemption, maxDiscountPercent } =
      REWARDS_CONFIG.redemption;

    // Validate minimum redemption
    if (pointsToRedeem < minimumRedemption) {
      throw new BadRequestException(
        `Minimum redemption is ${minimumRedemption} points`
      );
    }

    // Validate balance
    const balance = await this.getBalance(userId);
    if (balance < pointsToRedeem) {
      throw new BadRequestException(
        `Insufficient points. You have ${balance} points but tried to redeem ${pointsToRedeem}.`
      );
    }

    // Calculate the discount
    let discount = pointsToRedeem / pointsPerDollar;

    // Enforce max discount percentage
    const maxDiscount = orderTotal * (maxDiscountPercent / 100);
    if (discount > maxDiscount) {
      discount = maxDiscount;
      // Recalculate points actually needed
      pointsToRedeem = Math.ceil(discount * pointsPerDollar);
    }

    // Create the redemption transaction (negative points)
    const transaction = await this.createTransaction(
      userId,
      'redemption',
      -pointsToRedeem, // Negative = spending
      `Redeemed ${pointsToRedeem} points for $${discount.toFixed(2)} discount`,
      orderId
    );

    return { discount: Math.round(discount * 100) / 100, transaction };
  }

  /**
   * Reverse a redemption (e.g., if the order is cancelled/refunded).
   */
  async refundPoints(
    userId: string,
    pointsToRefund: number,
    orderId: string
  ): Promise<PointsTransaction> {
    return this.createTransaction(
      userId,
      'refund_adjustment',
      pointsToRefund, // Positive = giving back
      `Points restored from order refund`,
      orderId
    );
  }

  // ═══════════════════════════════════════
  //  ADMIN
  // ═══════════════════════════════════════

  /**
   * Admin: manually adjust a user's points (with reason).
   */
  async adminAdjust(
    userId: string,
    points: number,
    reason: string,
    adminId: string
  ): Promise<PointsTransaction> {
    return this.createTransaction(
      userId,
      'admin_adjustment',
      points,
      `Admin adjustment by ${adminId}: ${reason}`
    );
  }

  /**
   * Admin: get total outstanding points liability across all users.
   */
  async getTotalLiability(): Promise<{
    totalOutstanding: number;
    dollarValue: number;
  }> {
    const result = await this.transactionRepository
      .createQueryBuilder('pt')
      .select('SUM(pt.points)', 'total')
      .getRawOne();

    const totalOutstanding = parseInt(result?.total || '0', 10);
    const dollarValue =
      totalOutstanding / REWARDS_CONFIG.redemption.pointsPerDollar;

    return {
      totalOutstanding,
      dollarValue: Math.round(dollarValue * 100) / 100,
    };
  }

  // ═══════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════

  private async createTransaction(
    userId: string,
    type: string,
    points: number,
    description: string,
    referenceId?: string
  ): Promise<PointsTransaction> {
    try {
      const transaction = this.transactionRepository.create({
        user: { id: userId } as any,
        type,
        points,
        description,
        referenceId,
      });

      const saved = await this.transactionRepository.save(transaction);
      this.logger.log(
        `[${type}] ${points > 0 ? '+' : ''}${points} points for user ${userId}`
      );
      return saved;
    } catch (error) {
      this.errorService.handleError(error, 'RewardsService.createTransaction');
    }
  }

  private async getLifetimeEarned(userId: string): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('pt')
      .select('SUM(pt.points)', 'total')
      .where('pt.userId = :userId AND pt.points > 0', { userId })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  private async getLifetimeRedeemed(userId: string): Promise<number> {
    const result = await this.transactionRepository
      .createQueryBuilder('pt')
      .select('SUM(ABS(pt.points))', 'total')
      .where('pt.userId = :userId AND pt.type = :type', {
        userId,
        type: 'redemption',
      })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }
}
```

---

## 6. Rewards Controller

### 6.1 Create the Controller
File: `apps/api/src/modules/rewards/rewards.controller.ts`

**Tutorial Action**: Expose the rewards API. Users can view their balance/history and redeem points. Admins can view liability and make manual adjustments.

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { Roles } from 'nest-keycloak-connect';

@ApiTags('rewards')
@ApiBearerAuth()
@Controller('rewards')
export class RewardsController {
  constructor(private rewardsService: RewardsService) {}

  // ─── User: My Rewards ───

  @Get('me')
  @ApiOperation({ summary: 'Get my rewards account summary' })
  @ApiResponse({ status: 200, description: 'Balance, lifetime earned/redeemed' })
  async getMyAccount(@AuthenticatedUser() user: any) {
    return this.rewardsService.getAccount(user.sub);
  }

  @Get('me/balance')
  @ApiOperation({ summary: 'Get my current points balance' })
  async getMyBalance(@AuthenticatedUser() user: any) {
    const balance = await this.rewardsService.getBalance(user.sub);
    return { balance };
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get my points transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyHistory(
    @AuthenticatedUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.rewardsService.getHistory(
      user.sub,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10)
    );
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem points for a discount on an order' })
  @ApiResponse({ status: 201, description: 'Discount amount and transaction' })
  async redeem(
    @AuthenticatedUser() user: any,
    @Body()
    body: {
      pointsToRedeem: number;
      orderTotal: number;
      orderId: string;
    }
  ) {
    return this.rewardsService.redeem(
      user.sub,
      body.pointsToRedeem,
      body.orderTotal,
      body.orderId
    );
  }

  // ─── Admin: System Management ───

  @Get('admin/liability')
  @Roles({ roles: ['realm:admin'] })
  @ApiOperation({ summary: 'Get total points liability (Admin)' })
  async getLiability() {
    return this.rewardsService.getTotalLiability();
  }

  @Post('admin/adjust')
  @Roles({ roles: ['realm:admin'] })
  @ApiOperation({ summary: 'Manually adjust a user\'s points (Admin)' })
  async adminAdjust(
    @AuthenticatedUser() admin: any,
    @Body()
    body: {
      userId: string;
      points: number;
      reason: string;
    }
  ) {
    return this.rewardsService.adminAdjust(
      body.userId,
      body.points,
      body.reason,
      admin.sub
    );
  }
}
```

---

## 7. Rewards Module

### 7.1 Create the Module
File: `apps/api/src/modules/rewards/rewards.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsTransaction } from './entities/points-transaction.entity';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PointsTransaction])],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
```

### 7.2 Register in AppModule
File: `apps/api/src/app/app.module.ts`

**Tutorial Action**: Add `RewardsModule` to the imports.

```typescript
import { RewardsModule } from '../modules/rewards/rewards.module';

@Module({
  imports: [
    // ... existing modules ...
    RewardsModule,
  ],
})
export class AppModule {}
```

---

## 8. Checkout Integration

### 8.1 Update Checkout Service
File: `apps/api/src/modules/cart/checkout.service.ts`

**Tutorial Action**: Integrate points redemption into the checkout flow. The user optionally specifies how many points to redeem, and the discount is subtracted from the order total.

```typescript
import { RewardsService } from '../rewards/rewards.service';

@Injectable()
export class CheckoutService {
  constructor(
    private cartService: CartService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private rewardsService: RewardsService  // Add this
  ) {}

  async checkout(
    userId: string,
    pointsToRedeem?: number  // Optional — user can apply points
  ): Promise<Order> {
    // ... existing cart validation and item calculation ...

    let totalAmount = validatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Apply points discount if requested
    let pointsDiscount = 0;
    if (pointsToRedeem && pointsToRedeem > 0) {
      const redemption = await this.rewardsService.redeem(
        userId,
        pointsToRedeem,
        totalAmount,
        'pending-order' // Will be updated with real order ID
      );
      pointsDiscount = redemption.discount;
      totalAmount -= pointsDiscount;
    }

    const order = await this.ordersService.create({
      user: { id: userId } as any,
      items: validatedItems as any,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    await this.cartService.clearCart(userId);
    return order as any as Order;
  }
}
```

### 8.2 Award Points on Delivery
File: `apps/api/src/modules/orders/orders.service.ts`

**Tutorial Action**: When an order status changes to `delivered`, award the purchase points. Add this to your `update` method or create a dedicated status-change handler.

```typescript
async updateStatus(id: string, newStatus: string): Promise<Order> {
  const order = await this.findOne(id);
  if (!order) throw new NotFoundException('Order not found');

  const previousStatus = order.status;
  order.status = newStatus;
  await this.ordersRepository.save(order);

  // Award points when order is delivered
  if (newStatus === 'delivered' && previousStatus !== 'delivered') {
    // This would be called via an event or directly:
    // await this.rewardsService.earnFromPurchase(
    //   order.user.id,
    //   order.totalAmount,
    //   order.id,
    //   isSubscriber
    // );
  }

  return order;
}
```

**Design Note**: In a production system, you'd use an event-driven approach (NestJS `EventEmitter2` or a message queue) so the Orders module doesn't directly depend on Rewards. For now, a direct call works.

---

## 9. How Points Earn and Flow

Here's the complete lifecycle:

```
User signs up
  └─→ +500 pts (signup_bonus)

User places $50 order → order delivered
  └─→ +500 pts (purchase_earn: $50 × 10 pts/$1)

Subscriber places $50 order → delivered
  └─→ +1000 pts (purchase_earn: $50 × 10 × 2x subscriber bonus)

Monthly subscription renews ($29.99)
  └─→ +600 pts (subscription_earn: $29.99 × 10 × 2x)

User redeems 1000 points at checkout
  └─→ -1000 pts (redemption) → $10.00 discount applied

User cancels an order that had points applied
  └─→ +1000 pts (refund_adjustment) → points restored
```

---

## 10. Implementation Checklist

- [ ] **Shared Types**: Add `PointsTransactionType`, `PointsTransaction`, `RewardsAccount`
- [ ] **Entity**: Create `PointsTransaction` entity with index
- [ ] **Entity**: Update `User` entity with pointsTransactions relationship
- [ ] **Config**: Create `rewards.config.ts` with earning/redemption rules
- [ ] **Service**: Create `RewardsService` with balance, earn, redeem, refund, admin methods
- [ ] **Controller**: Create `RewardsController` with user and admin endpoints
- [ ] **Module**: Create `RewardsModule`
- [ ] **Module**: Register `RewardsModule` in `AppModule`
- [ ] **Checkout**: Integrate points redemption into `CheckoutService`
- [ ] **Orders**: Award points on order delivery
- [ ] **Subscriptions**: Award bonus points on subscription renewal (ties to Step 19)
- [ ] **Tests**: Create Playwright API tests for rewards endpoints
