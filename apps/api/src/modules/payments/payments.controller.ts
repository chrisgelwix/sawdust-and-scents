import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  @Post('intent')
  @ApiOperation({ summary: 'Create payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createIntent(@Body() data: { amount: number; currency: string }) {
    // This is a mock implementation
    return {
      id: 'pi_' + Math.random().toString(36).substr(2, 9),
      client_secret: 'secret_' + Math.random().toString(36).substr(2, 9),
      amount: data.amount,
      currency: data.currency,
    };
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
