# Step 19: Subscription Service — "Candle of the Month"

## 1. The "Why" Behind This Step: Recurring Revenue

One-time purchases are great, but **subscriptions are the lifeblood** of a product-based business. A monthly candle subscription creates predictable recurring revenue, reduces customer acquisition cost (you only sell once), and keeps your brand top-of-mind when a beautifully curated box arrives at someone's door every month.

To lower the barrier to entry, every subscription starts with a **1-month free trial** — the customer gets their first box at no cost. In exchange, they commit to a **3-month minimum** (the trial month + 2 paid months). This gives customers a risk-free way to experience the product while giving us a predictable revenue floor once they convert.

In this step we'll build:

- Subscription plan definitions (stored in MongoDB alongside products)
- User subscription management (stored in PostgreSQL alongside users/orders)
- **1-month free trial** with Stripe `trial_period_days` and a **3-month minimum commitment** enforced on cancellation
- Stripe-powered recurring billing via webhooks
- Auto-fulfillment: when Stripe charges succeed, an order is automatically created and queued for shipping

---

## 2. Shared Types

### 2.1 Add Subscription Types

File: `libs/shared/types/src/lib/subscription.types.ts`

**Tutorial Action**: Create a new domain-specific types file for subscriptions. Our shared types library is organized by domain — each file contains the enums and interfaces for a single feature area (see `user.types.ts`, `product.types.ts`, `order.types.ts`, `cart.types.ts`). This keeps related types co-located and makes the library easy to navigate.

```typescript
export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
}

export enum BillingInterval {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export interface SubscriptionPlan {
  id: string;
  name: string; // e.g., "Ember Box", "Blaze Box"
  description: string;
  price: number; // Monthly price
  candleCount: number; // How many candles per shipment
  billingInterval: BillingInterval;
  stripePriceId: string; // Stripe Price ID for recurring billing
  trialDays: number; // Free trial length in days (default: 30 → 1 month)
  minimumCommitmentMonths: number; // Minimum total months including trial (default: 3)
  isActive: boolean;
  features: string[]; // e.g., ["Free shipping", "Exclusive scents", "1-month free trial"]
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date; // When the free trial began
  trialEnd?: Date; // When the free trial ends (≈ 30 days after start)
  minimumCommitmentEnd?: Date; // Earliest date the user can cancel (≈ 3 months after start)
  scentPreferences?: string[]; // User's preferred scent families
  createdAt: Date;
  cancelledAt?: Date;
}
```

---

## 3. Subscription Plan Schema (MongoDB)

### 3.1 Create the Plan Schema

File: `apps/api/src/modules/subscriptions/schemas/subscription-plan.schema.ts`

**Tutorial Action**: Plans live in MongoDB alongside products because they're catalog data — they describe _what_ you can buy, not _who_ bought it.

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SubscriptionPlan extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  candleCount!: number;

  @Prop({ required: true, enum: ['monthly', 'quarterly'], default: 'monthly' })
  billingInterval!: string;

  @Prop({ required: true })
  stripePriceId!: string;

  @Prop({ default: 30 })
  trialDays!: number; // Free trial length in days (default: 30 → 1 month)

  @Prop({ default: 3 })
  minimumCommitmentMonths!: number; // Minimum months including trial (default: 3)

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: [String], default: [] })
  features!: string[];

  @Prop({ type: [String], default: [] })
  includedCategories!: string[]; // Which product categories to pull from
}

export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);
```

**Why MongoDB?** Plan definitions are catalog-like — they're read-heavy, rarely change, and benefit from flexible schema (you might add seasonal attributes, limited editions, etc.). This matches how our products already live in Mongo.

---

## 4. User Subscription Entity (PostgreSQL)

### 4.1 Create the Subscription Entity

File: `apps/api/src/modules/subscriptions/entities/subscription.entity.ts`

**Tutorial Action**: The actual subscription record ties a user to a plan. This lives in PostgreSQL because it has strong relationships with Users and Orders.

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @Column()
  planId!: string; // References MongoDB SubscriptionPlan._id

  @Column({ default: 'trialing' })
  status!: string; // active, paused, cancelled, past_due, trialing

  @Column({ nullable: true })
  stripeSubscriptionId?: string;

  @Column({ nullable: true })
  stripeCustomerId?: string;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodEnd?: Date;

  @Column({ type: 'timestamp', nullable: true })
  trialStart?: Date; // When the free trial began

  @Column({ type: 'timestamp', nullable: true })
  trialEnd?: Date; // When the free trial ends (≈ 30 days after start)

  @Column({ type: 'timestamp', nullable: true })
  minimumCommitmentEnd?: Date; // Earliest the user can cancel without penalty (≈ 3 months after start)

  @Column({ type: 'simple-array', nullable: true })
  scentPreferences?: string[]; // e.g., ['woody', 'vanilla', 'fresh']

  @Column({ nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  pausedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
```

### 4.2 Update User Entity

File: `apps/api/src/modules/users/entities/user.entity.ts`

**Tutorial Action**: Add the relationship from User → Subscriptions.

```typescript
import { Subscription } from '../../subscriptions/entities/subscription.entity';

// Inside the User class, add:
@OneToMany(() => Subscription, (sub) => sub.user)
subscriptions!: Subscription[];
```

---

## 5. Subscription Plans Service

### 5.1 Create the Plans Service

File: `apps/api/src/modules/subscriptions/subscription-plans.service.ts`

**Tutorial Action**: This service manages the plan catalog (CRUD for admins, read for customers).

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan } from './schemas/subscription-plan.schema';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectModel(SubscriptionPlan.name)
    private planModel: Model<SubscriptionPlan>
  ) {}

  async findAll(): Promise<SubscriptionPlan[]> {
    return this.planModel.find({ isActive: true }).exec();
  }

  async findById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) {
      throw new NotFoundException(`Subscription plan "${id}" not found`);
    }
    return plan;
  }

  async create(planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const plan = new this.planModel(planData);
    return plan.save();
  }

  async update(
    id: string,
    updateData: Partial<SubscriptionPlan>
  ): Promise<SubscriptionPlan> {
    const plan = await this.planModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!plan) {
      throw new NotFoundException(`Subscription plan "${id}" not found`);
    }
    return plan;
  }

  async deactivate(id: string): Promise<SubscriptionPlan> {
    return this.update(id, { isActive: false });
  }
}
```

---

## 6. Subscription Service (Core Business Logic)

### 6.1 Create the Subscription Service

File: `apps/api/src/modules/subscriptions/subscriptions.service.ts`

**Tutorial Action**: This is the core service that handles subscribing, pausing, cancelling, and the auto-fulfillment loop. New subscriptions start in a **`trialing`** state with a 1-month free trial and a 3-month minimum commitment. Stripe handles the trial natively — no charges occur until the trial ends.

```typescript
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlansService } from './subscription-plans.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { ErrorHandlerService } from '../common/errors/error-handler.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private plansService: SubscriptionPlansService,
    private ordersService: OrdersService,
    private productsService: ProductsService,
    private errorService: ErrorHandlerService
  ) {}

  /**
   * Subscribe a user to a plan.
   *
   * Every new subscription starts in the `trialing` status with a 1-month
   * free trial. The customer is not charged until the trial ends.
   * A 3-month minimum commitment is enforced — the user cannot cancel
   * until 3 months after the subscription start date (trial month + 2
   * paid months).
   *
   * In a real implementation, this would create a Stripe Subscription
   * with `trial_period_days` and store the stripeSubscriptionId.
   */
  async subscribe(
    userId: string,
    planId: string,
    scentPreferences?: string[]
  ): Promise<Subscription> {
    try {
      // Verify the plan exists and is active
      const plan = await this.plansService.findById(planId);
      if (!plan.isActive) {
        throw new BadRequestException('This plan is no longer available');
      }

      // Check if user already has an active or trialing subscription
      const existing = await this.subscriptionRepository.findOne({
        where: [
          { user: { id: userId }, status: 'active' },
          { user: { id: userId }, status: 'trialing' },
        ],
      });
      if (existing) {
        throw new BadRequestException(
          'You already have an active subscription. Please cancel or change your current plan first.'
        );
      }

      // TODO: Create Stripe Subscription with trial here
      // const stripeSubscription = await stripe.subscriptions.create({
      //   customer: stripeCustomerId,
      //   items: [{ price: plan.stripePriceId }],
      //   trial_period_days: plan.trialDays,  // 30 days free trial
      // });

      const now = new Date();

      // Trial period: 1 month (≈ 30 days, controlled by plan.trialDays)
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + (plan.trialDays || 30));

      // First billing period starts when trial ends
      const periodEnd = new Date(trialEnd);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Minimum commitment: 3 months from subscription start (trial + 2 paid months)
      const minimumCommitmentEnd = new Date(now);
      minimumCommitmentEnd.setMonth(
        minimumCommitmentEnd.getMonth() + (plan.minimumCommitmentMonths || 3)
      );

      const subscription = this.subscriptionRepository.create({
        user: { id: userId } as any,
        planId,
        status: 'trialing',
        // stripeSubscriptionId: stripeSubscription.id,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialStart: now,
        trialEnd,
        minimumCommitmentEnd,
        scentPreferences: scentPreferences || [],
      });

      this.logger.log(
        `Subscription created for user ${userId} — trialing until ${trialEnd.toISOString()}, ` +
          `minimum commitment until ${minimumCommitmentEnd.toISOString()}`
      );

      return this.subscriptionRepository.save(subscription);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.errorService.handleError(error, 'SubscriptionsService.subscribe');
    }
  }

  /**
   * Activate a trialing subscription.
   * Called by the Stripe webhook when the trial ends and the first
   * payment succeeds (`customer.subscription.updated` with status
   * changing from `trialing` → `active`).
   */
  async activateAfterTrial(stripeSubscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId, status: 'trialing' },
    });

    if (!subscription) {
      this.logger.warn(
        `No trialing subscription found for Stripe ID ${stripeSubscriptionId}`
      );
      return;
    }

    subscription.status = 'active';
    const now = new Date();
    subscription.currentPeriodStart = now;
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    subscription.currentPeriodEnd = periodEnd;

    await this.subscriptionRepository.save(subscription);
    this.logger.log(
      `Subscription ${subscription.id} activated after trial — first payment collected`
    );
  }

  /**
   * Pause a subscription (user can resume later).
   * Only active (post-trial) subscriptions can be paused.
   */
  async pause(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.findOneForUser(subscriptionId, userId);

    if (subscription.status !== 'active') {
      throw new BadRequestException('Only active subscriptions can be paused');
    }

    // TODO: Pause the Stripe subscription
    // await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    //   pause_collection: { behavior: 'void' },
    // });

    subscription.status = 'paused';
    subscription.pausedAt = new Date();
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Resume a paused subscription
   */
  async resume(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.findOneForUser(subscriptionId, userId);

    if (subscription.status !== 'paused') {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    // TODO: Resume in Stripe
    subscription.status = 'active';
    subscription.pausedAt = undefined;
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Cancel a subscription.
   *
   * Enforces the 3-month minimum commitment:
   * - During the trial month: cancellation is blocked (you agreed to 3 months).
   * - During months 2–3 (the first two paid months): cancellation is blocked.
   * - After month 3: cancellation schedules at end of current billing period.
   *
   * The `minimumCommitmentEnd` date on the subscription record is the
   * source of truth for when early-cancellation restrictions lift.
   */
  async cancel(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.findOneForUser(subscriptionId, userId);

    if (subscription.status === 'cancelled') {
      throw new BadRequestException('Subscription is already cancelled');
    }

    // Enforce minimum commitment (3 months)
    if (subscription.minimumCommitmentEnd) {
      const now = new Date();
      if (now < subscription.minimumCommitmentEnd) {
        const remaining = Math.ceil(
          (subscription.minimumCommitmentEnd.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        throw new BadRequestException(
          `This subscription has a 3-month minimum commitment. ` +
            `You can cancel after ${subscription.minimumCommitmentEnd.toLocaleDateString()} ` +
            `(${remaining} day(s) remaining).`
        );
      }
    }

    // TODO: Cancel in Stripe (at period end so user gets remaining time)
    // await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    //   cancel_at_period_end: true,
    // });

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Update scent preferences for a subscription
   */
  async updatePreferences(
    subscriptionId: string,
    userId: string,
    scentPreferences: string[]
  ): Promise<Subscription> {
    const subscription = await this.findOneForUser(subscriptionId, userId);
    subscription.scentPreferences = scentPreferences;
    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Get all subscriptions for a user
   */
  async findByUser(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get active subscription for a user (there should only be one).
   * Returns both `active` and `trialing` subscriptions — from the
   * user's perspective, a trial IS their active subscription.
   */
  async findActiveByUser(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: [
        { user: { id: userId }, status: 'active' },
        { user: { id: userId }, status: 'trialing' },
      ],
    });
  }

  /**
   * Auto-fulfillment: Called when Stripe webhook confirms payment.
   * Selects candles based on the plan and user preferences,
   * then creates an order automatically.
   */
  async fulfillSubscription(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['user'],
    });

    if (!subscription) {
      this.logger.error(
        `Cannot fulfill — subscription ${subscriptionId} not found`
      );
      return;
    }

    const plan = await this.plansService.findById(subscription.planId);

    // Select candles based on preferences
    const selectedProducts = await this.selectCandles(
      plan.candleCount,
      subscription.scentPreferences || []
    );

    if (selectedProducts.length === 0) {
      this.logger.error(
        `No products available for subscription ${subscriptionId}`
      );
      return;
    }

    // Create an order for this subscription fulfillment
    const items = selectedProducts.map((product) => ({
      productId: product._id.toString(),
      productName: product.name,
      price: product.price,
      quantity: 1,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

    await this.ordersService.create({
      user: subscription.user,
      items: items as any,
      totalAmount,
      status: 'pending',
    });

    this.logger.log(
      `Subscription ${subscriptionId} fulfilled — ${items.length} candle(s) ordered`
    );
  }

  /**
   * Select candles for a subscription box.
   * Prioritizes user's scent preferences, falls back to random selection.
   */
  private async selectCandles(
    count: number,
    preferences: string[]
  ): Promise<any[]> {
    let candidates: any[] = [];

    // Try to match preferences first
    if (preferences.length > 0) {
      for (const scent of preferences) {
        const products = await this.productsService.findByScent(scent);
        candidates.push(...products);
      }
    }

    // If not enough preference matches, fill with any active candles
    if (candidates.length < count) {
      const allProducts = await this.productsService.findAll();
      const activeCandles = allProducts.filter(
        (p) =>
          p.isActive &&
          p.category === 'candle' &&
          !candidates.some((c) => c._id.toString() === p._id.toString())
      );
      candidates.push(...activeCandles);
    }

    // Shuffle and take the required count
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Helper: Find a subscription and verify it belongs to the given user
   */
  private async findOneForUser(
    subscriptionId: string,
    userId: string
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, user: { id: userId } },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }
}
```

---

## 7. Subscription Controller

### 7.1 Create the Controller

File: `apps/api/src/modules/subscriptions/subscriptions.controller.ts`

**Tutorial Action**: Expose the subscription API. Note that all endpoints require authentication — only account holders can subscribe (not guests).

```typescript
import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from 'nest-keycloak-connect';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private plansService: SubscriptionPlansService
  ) {}

  // ─── Public: Browse Plans ───

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of active plans' })
  async getPlans() {
    return this.plansService.findAll();
  }

  @Public()
  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a specific subscription plan' })
  async getPlan(@Param('id') id: string) {
    return this.plansService.findById(id);
  }

  // ─── Authenticated: Manage My Subscription ───

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  async subscribe(
    @AuthenticatedUser() user: any,
    @Body() body: { planId: string; scentPreferences?: string[] }
  ) {
    return this.subscriptionsService.subscribe(
      user.sub,
      body.planId,
      body.scentPreferences
    );
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my subscriptions' })
  async getMySubscriptions(@AuthenticatedUser() user: any) {
    return this.subscriptionsService.findByUser(user.sub);
  }

  @Get('me/active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my active subscription' })
  async getMyActiveSubscription(@AuthenticatedUser() user: any) {
    return this.subscriptionsService.findActiveByUser(user.sub);
  }

  @Put(':id/pause')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause my subscription' })
  async pause(@Param('id') id: string, @AuthenticatedUser() user: any) {
    return this.subscriptionsService.pause(id, user.sub);
  }

  @Put(':id/resume')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume my paused subscription' })
  async resume(@Param('id') id: string, @AuthenticatedUser() user: any) {
    return this.subscriptionsService.resume(id, user.sub);
  }

  @Put(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel my subscription' })
  async cancel(@Param('id') id: string, @AuthenticatedUser() user: any) {
    return this.subscriptionsService.cancel(id, user.sub);
  }

  @Put(':id/preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update scent preferences for my subscription' })
  async updatePreferences(
    @Param('id') id: string,
    @AuthenticatedUser() user: any,
    @Body() body: { scentPreferences: string[] }
  ) {
    return this.subscriptionsService.updatePreferences(
      id,
      user.sub,
      body.scentPreferences
    );
  }

  // ─── Admin: Manage Plans ───

  @Post('plans')
  @ApiBearerAuth()
  @Roles({ roles: ['realm:admin'] })
  @ApiOperation({ summary: 'Create a new subscription plan (Admin)' })
  async createPlan(@Body() planData: any) {
    return this.plansService.create(planData);
  }

  @Put('plans/:id')
  @ApiBearerAuth()
  @Roles({ roles: ['realm:admin'] })
  @ApiOperation({ summary: 'Update a subscription plan (Admin)' })
  async updatePlan(@Param('id') id: string, @Body() updateData: any) {
    return this.plansService.update(id, updateData);
  }
}
```

---

## 8. Subscription Module

### 8.1 Create the Module

File: `apps/api/src/modules/subscriptions/subscriptions.module.ts`

**Tutorial Action**: Wire everything together. Note the cross-module imports — subscriptions depend on Orders and Products for fulfillment.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscription } from './entities/subscription.entity';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from './schemas/subscription-plan.schema';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionsController } from './subscriptions.controller';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription]),
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
    OrdersModule,
    ProductsModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionPlansService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
```

### 8.2 Register in AppModule

File: `apps/api/src/app/app.module.ts`

**Tutorial Action**: Add `SubscriptionsModule` to the imports array.

```typescript
import { SubscriptionsModule } from '../modules/subscriptions/subscriptions.module';

@Module({
  imports: [
    // ... existing modules ...
    SubscriptionsModule,
  ],
})
export class AppModule {}
```

---

## 9. Stripe Webhook Integration

### 9.1 Handling Subscription Webhooks

File: `apps/api/src/modules/payments/payments.controller.ts`

**Tutorial Action**: Extend the existing webhook handler to process subscription-related events from Stripe.

```typescript
@Public()
@Post('webhook')
@ApiOperation({ summary: 'Handle payment webhook (called by Stripe)' })
async handleWebhook(@Body() payload: any) {
  const event = payload;

  switch (event.type) {
    case 'customer.subscription.updated': {
      // Trial ended → first charge succeeded → activate subscription
      const stripeSubscription = event.data.object;
      const previousStatus = event.data.previous_attributes?.status;

      if (
        previousStatus === 'trialing' &&
        stripeSubscription.status === 'active'
      ) {
        await this.subscriptionsService.activateAfterTrial(
          stripeSubscription.id
        );
      }
      break;
    }

    case 'customer.subscription.trial_will_end': {
      // Stripe fires this 3 days before trial ends.
      // Use it to notify the customer that billing is about to start.
      const stripeSubscription = event.data.object;
      this.logger.log(
        `Trial ending soon for Stripe subscription ${stripeSubscription.id}`
      );
      // TODO: Send "your trial is ending" email to the customer
      break;
    }

    case 'invoice.payment_succeeded': {
      // A subscription payment went through — fulfill the order
      const subscriptionId = event.data.object.subscription;
      if (subscriptionId) {
        await this.subscriptionsService.fulfillSubscription(subscriptionId);
      }
      break;
    }

    case 'invoice.payment_failed': {
      // Payment failed — mark subscription as past_due
      // This can happen when the trial ends and the first charge fails,
      // or on any subsequent billing cycle.
      // TODO: Update subscription status to 'past_due'
      break;
    }

    case 'customer.subscription.deleted': {
      // Subscription fully cancelled in Stripe
      // TODO: Update local subscription record
      break;
    }
  }

  return { received: true };
}
```

**Note**: In production, you would verify the webhook signature using `stripe.webhooks.constructEvent()` with your webhook secret. Never trust raw payloads without signature verification.

**Trial Lifecycle Flow**:

1. **User subscribes** → Stripe subscription created with `trial_period_days: 30` → local status: `trialing`
2. **Day 27** → Stripe fires `customer.subscription.trial_will_end` → send reminder email
3. **Day 30 (trial ends)** → Stripe charges the card → fires `customer.subscription.updated` (trialing → active) → local status: `active`
4. **If first charge fails** → Stripe fires `invoice.payment_failed` → local status: `past_due`
5. **Months 1–3** → user cannot cancel (minimum commitment enforced)
6. **Month 4+** → user can cancel freely

---

## 10. Environment Variables

Add to `.env.local`:

```
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
```

---

## 11. Implementation Checklist

- [ ] **Shared Types**: Add `SubscriptionStatus`, `BillingInterval`, `SubscriptionPlan`, `Subscription` interfaces (including `trialDays`, `minimumCommitmentMonths`, `trialStart`, `trialEnd`, `minimumCommitmentEnd`)
- [ ] **Schema**: Create `SubscriptionPlan` Mongoose schema with `trialDays` (default: 30) and `minimumCommitmentMonths` (default: 3)
- [ ] **Entity**: Create `Subscription` TypeORM entity with `trialStart`, `trialEnd`, `minimumCommitmentEnd` columns (default status: `trialing`)
- [ ] **Entity**: Update `User` entity with subscriptions relationship
- [ ] **Service**: Create `SubscriptionPlansService` (plan CRUD)
- [ ] **Service**: Create `SubscriptionsService` with trial-aware logic:
  - [ ] `subscribe()` — starts in `trialing` status, calculates trial end (30 days) and minimum commitment end (3 months)
  - [ ] `activateAfterTrial()` — transitions `trialing` → `active` when Stripe confirms first payment
  - [ ] `cancel()` — enforces 3-month minimum commitment before allowing cancellation
  - [ ] `pause()` / `resume()` / `fulfillSubscription()` — unchanged but only apply to `active` subscriptions
- [ ] **Controller**: Create `SubscriptionsController` with public + auth + admin endpoints
- [ ] **Module**: Create `SubscriptionsModule` with Mongoose + TypeORM imports
- [ ] **Module**: Register `SubscriptionsModule` in `AppModule`
- [ ] **Webhook**: Extend payments webhook for subscription events:
  - [ ] `customer.subscription.updated` — handle trial → active transition
  - [ ] `customer.subscription.trial_will_end` — send reminder email 3 days before trial ends
  - [ ] `invoice.payment_succeeded` — fulfill subscription order
  - [ ] `invoice.payment_failed` — mark as `past_due`
- [ ] **Config**: Add Stripe environment variables
- [ ] **Tests**: Create Playwright API tests for subscription endpoints (including trial flow and minimum commitment enforcement)
