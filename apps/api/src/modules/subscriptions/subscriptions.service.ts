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
import { SubscriptionStatus, OrderStatus } from '@sdas/shared-types';

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

  // ─── Subscription Lifecycle ───

  async subscribe(
    userId: string,
    planId: string,
    scentPreferences?: string[]
  ): Promise<Subscription> {
    try {
      const plan = await this.plansService.findById(planId);
      if (!plan.isActive) {
        throw new BadRequestException('This plan is no longer available');
      }

      const existing = await this.findActiveByUser(userId);
      if (existing) {
        throw new BadRequestException(
          'You already have an active subscription. Please cancel or change your current plan first.'
        );
      }

      // TODO: Create Stripe Subscription with trial here
      // const stripeSubscription = await stripe.subscriptions.create({
      //     customer: stripeCustomerId,
      //     items: [{ price: plan.stripePriceId }],
      //     trial_period_days: plan.trialDays,  // 30 days free trial
      // });

      const now = new Date();

      // Trial period: 1 month (≈ 30 days, controlled by plan.trialDays)
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + (plan.trialDays || 30));

      // First billing period starts when the trial ends
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
        status: SubscriptionStatus.TRIALING,
        // stripeSubscriptionId: stripeSubscription.id,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialStart: now,
        trialEnd,
        minimumCommitmentEnd,
        scentPreferences: scentPreferences || [],
      });

      return this.saveAndLog(
        subscription,
        `Subscription created for user ${userId} — trialing until ${trialEnd.toISOString()}, ` +
          `minimum commitment until ${minimumCommitmentEnd.toISOString()}`
      );
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

  async activateAfterTrial(stripeSubscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId, status: SubscriptionStatus.TRIALING },
    });

    if (!subscription) {
      this.logger.warn(
        `No trialing subscription found for Stripe ID ${stripeSubscriptionId}`
      );
      return;
    }

    const now = new Date();
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.currentPeriodStart = now;
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    subscription.currentPeriodEnd = periodEnd;

    await this.saveAndLog(
      subscription,
      `Subscription ${subscription.id} activated after trial — first payment collected`
    );
  }

  async pause(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.findSubscriptionForUser(
      subscriptionId,
      userId
    );

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be paused');
    }

    // TODO: Pause the Stripe subscription
    // await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    //     pause_collection: { behavior: 'void' },
    // });

    subscription.status = SubscriptionStatus.PAUSED;
    subscription.pausedAt = new Date();
    return this.saveAndLog(
      subscription,
      `Subscription ${subscription.id} paused`
    );
  }

  async resume(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.findSubscriptionForUser(
      subscriptionId,
      userId
    );

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    // TODO: Resume the Stripe subscription
    // await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    //     pause_collection: { behavior: 'resume' },
    // });

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.pausedAt = undefined;
    return this.saveAndLog(
      subscription,
      `Subscription ${subscription.id} resumed`
    );
  }

  async cancel(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.findSubscriptionForUser(
      subscriptionId,
      userId
    );

    if (subscription.status === SubscriptionStatus.CANCELLED) {
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
    //     cancel_at_period_end: true,
    // });

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    return this.saveAndLog(
      subscription,
      `Subscription ${subscription.id} cancelled`
    );
  }

  // ─── Preferences ───

  async updatePreferences(
    subscriptionId: string,
    userId: string,
    scentPreferences: string[]
  ): Promise<Subscription> {
    const subscription = await this.findSubscriptionForUser(
      subscriptionId,
      userId
    );
    subscription.scentPreferences = scentPreferences;
    return this.saveAndLog(
      subscription,
      `Scent preferences updated for subscription ${subscriptionId}`
    );
  }

  // ─── Queries ───

  async findByUser(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findActiveByUser(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: [
        { user: { id: userId }, status: SubscriptionStatus.ACTIVE },
        { user: { id: userId }, status: SubscriptionStatus.TRIALING },
      ],
    });
  }

  // ─── Fulfillment ───

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
      status: OrderStatus.PENDING,
    });

    this.logger.log(
      `Subscription ${subscriptionId} fulfilled — ${items.length} candle(s) ordered`
    );
  }

  // ─── Private Helpers ───

  /**
   * Save a subscription and log the action.
   * Centralizes the save-then-log pattern to avoid unreachable code
   * (logging after a return statement) and reduces repetition.
   */
  private async saveAndLog(
    subscription: Subscription,
    message: string
  ): Promise<Subscription> {
    const saved = await this.subscriptionRepository.save(subscription);
    this.logger.log(message);
    return saved;
  }

  /**
   * Find a subscription and verify it belongs to the given user.
   * Throws NotFoundException if the subscription doesn't exist or
   * doesn't belong to the requesting user.
   */
  private async findSubscriptionForUser(
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
}
