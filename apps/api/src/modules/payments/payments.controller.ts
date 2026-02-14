import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

// In-memory store for mock payment intents
const paymentStore: Record<string, any> = {};

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
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
  async processRefund(@Body() data: { paymentIntentId: string; amount?: number }) {
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
    // Mock webhook handler — public because payment processors call this directly
    return { received: true };
  }
}
