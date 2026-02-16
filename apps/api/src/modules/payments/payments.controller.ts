import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionStatus } from '@sdas/shared-types';

// In-memory store for mock payment intents
const paymentStore: Record<string, any> = {};

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private subscriptionsService: SubscriptionsService) {}
  @Post('intent')
  @ApiOperation({ summary: 'Create payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createIntent(@Body() data: { amount: number; currency: string }) {
    const intent = {
      id: 'pi_' + Math.random().toString(36).substr(2, 9),
      client_secret: 'secret_' + Math.random().toString(36).substr(2, 9),
      amount: data.amount,
      currency: data.currency,
      status: 'requires_payment_method',
      createdAt: new Date().toISOString(),
    };
    paymentStore[intent.id] = intent;
    return intent;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment intent status' })
  @ApiResponse({ status: 200, description: 'Payment intent details' })
  @ApiResponse({ status: 404, description: 'Payment intent not found' })
  async getPaymentStatus(@Param('id') id: string) {
    const intent = paymentStore[id];
    if (!intent) {
      throw new NotFoundException(`Payment intent "${id}" not found`);
    }
    return intent;
  }

  @Post('refund')
  @ApiOperation({ summary: 'Process a refund' })
  @ApiResponse({ status: 201, description: 'Refund processed' })
  @ApiResponse({ status: 404, description: 'Payment intent not found' })
  async processRefund(
    @Body() data: { paymentIntentId: string; amount?: number }
  ) {
    const intent = paymentStore[data.paymentIntentId];
    if (!intent) {
      throw new NotFoundException(
        `Payment intent "${data.paymentIntentId}" not found`
      );
    }

    const refund = {
      id: 're_' + Math.random().toString(36).substr(2, 9),
      paymentIntentId: data.paymentIntentId,
      amount: data.amount || intent.amount,
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    };

    // Update the original intent
    intent.status = 'refunded';

    return refund;
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Handle payment webhook (called by Stripe)' })
  @ApiResponse({ status: 201, description: 'Webhook handled' })
  async handleWebhook(@Body() payload: any) {
    const event = payload;

    switch (event.type) {
      case 'customer.subscription.updated': {
        // Trial ended → first charge succeeded → activate subscription
        const subscription = event.data.object;
        const previousStatus = event.data.previous_attributes?.status;
        if (previousStatus === SubscriptionStatus.TRIALING && subscription.status === SubscriptionStatus.ACTIVE) {
          await this.subscriptionsService.activateAfterTrial(subscription.id);
        }
        break;
      }
      case 'customer.subscription.trial_will_end': {
        // Stripe fires this 3 days before trial ends.
        // Use it to notify the customer that billing is about to start.
        const subscription = event.data.object;
        this.logger.log(
          `Trial ending soon for Stripe subscription ${subscription.id}`
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
        const subscriptionId = event.data.object.subscription;
        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription fully cancelled in Stripe
        // TODO: Update local subscription record
        break;
      }
    }

    // Mock webhook handler — public because payment processors call this directly
    return { received: true };
  }
}
