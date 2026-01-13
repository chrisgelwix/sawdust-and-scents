# Payments Module

Payment processing and transaction management.

## Overview

Handles payment processing for customer orders. Currently a placeholder module awaiting implementation.

## Status

🚧 **Not Yet Implemented**

This module is scaffolded but does not contain payment logic yet.

## Planned Responsibilities

- Process credit card payments
- Handle payment authorization and capture
- Store payment transaction records
- Support multiple payment methods
- Handle refunds and chargebacks
- PCI compliance adherence
- Payment webhook handling

## Planned Payment Providers

### Primary Options
1. **Stripe** (Recommended)
   - Easy integration
   - Excellent documentation
   - Built-in fraud protection
   - PCI compliance handled
   - Support for subscriptions

2. **PayPal/Braintree**
   - PayPal wallet support
   - Venmo integration
   - Alternative payment methods

3. **Square**
   - Good for retail integration
   - Simple pricing

## Planned Implementation

### Payment Flow

```
1. User enters payment info (frontend)
    ↓
2. Frontend tokenizes card (Stripe.js)
    ↓
3. Frontend sends token to backend
    ↓
4. PaymentsService.processPayment(token, amount)
    ↓
5. Create Stripe charge/payment intent
    ↓
6. Store transaction record
    ↓
7. Return success/failure to checkout
```

### Security Considerations

**PCI Compliance:**
- ❌ Never store raw card numbers
- ✅ Use payment provider's tokenization
- ✅ All payment data sent via HTTPS
- ✅ Minimal payment data in logs

**Best Practices:**
- Use payment provider SDKs
- Implement webhook verification
- Store only transaction IDs
- Handle failed payments gracefully
- Implement retry logic for network issues

## Planned Database Schema

### Transactions Table (PostgreSQL)
```sql
transactions
├── id (UUID, PK)
├── order_id (UUID, FK → orders)
├── user_id (UUID, FK → users)
├── amount (decimal)
├── currency (string, default: USD)
├── status (enum: pending, succeeded, failed, refunded)
├── provider (enum: stripe, paypal, square)
├── provider_transaction_id (string)
├── payment_method (enum: card, paypal, etc)
├── last_four (string, nullable)
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Planned Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PayPal (if used)
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_MODE=sandbox  # or 'live'
```

## Planned API Endpoints

### Process Payment
```http
POST /payments/process
Authorization: Bearer <token>

{
  "paymentToken": "tok_xxx",
  "amount": 99.99,
  "orderId": "order-uuid"
}
```

### Get Transaction History
```http
GET /payments/transactions
Authorization: Bearer <token>
```

### Refund Transaction
```http
POST /payments/:transactionId/refund
Authorization: Bearer <token>
Roles: admin

{
  "amount": 99.99,  # partial or full
  "reason": "customer_request"
}
```

### Webhook Handler
```http
POST /payments/webhook/stripe
# No auth - verified by webhook signature
```

## Example Implementation (Stripe)

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private config: ConfigService) {
    this.stripe = new Stripe(
      config.get('STRIPE_SECRET_KEY'),
      { apiVersion: '2023-10-16' }
    );
  }

  async processPayment(token: string, amount: number, orderId: string) {
    const charge = await this.stripe.charges.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      source: token,
      metadata: { orderId }
    });

    // Store transaction in database
    await this.saveTransaction({
      orderId,
      amount,
      status: charge.status,
      providerTransactionId: charge.id
    });

    return charge;
  }

  async refundPayment(transactionId: string, amount?: number) {
    const refund = await this.stripe.refunds.create({
      charge: transactionId,
      amount: amount ? Math.round(amount * 100) : undefined
    });

    return refund;
  }
}
```

## Testing Strategy

### Development
- Use Stripe test mode
- Test cards: `4242 4242 4242 4242`
- Test different scenarios (success, decline, etc.)

### Unit Tests
- Mock Stripe SDK
- Test error handling
- Verify transaction storage

### Integration Tests
- Use Stripe test environment
- Test webhook handling
- Test refund flows

## Error Handling

Expected errors:
- `CARD_DECLINED`: Insufficient funds
- `INVALID_CARD`: Invalid card number
- `EXPIRED_CARD`: Card expired
- `PROCESSING_ERROR`: Network/provider issue
- `INSUFFICIENT_FUNDS`: Not enough balance

## Compliance Requirements

- **PCI DSS**: Payment Card Industry Data Security Standard
- **GDPR**: Handle payment data per GDPR
- **Data Retention**: Define transaction data retention policy
- **Audit Logs**: Maintain payment activity logs

## Integration Points

Will integrate with:
- **OrdersModule**: Link transactions to orders
- **CartModule**: Process checkout payments
- **UsersModule**: Associate payments with users

## Next Steps

1. [ ] Choose payment provider (Stripe recommended)
2. [ ] Create Stripe account
3. [ ] Implement PaymentsService
4. [ ] Create Transaction entity
5. [ ] Add payment endpoints to controller
6. [ ] Integrate with checkout flow
7. [ ] Implement webhook handlers
8. [ ] Add comprehensive error handling
9. [ ] Write unit and integration tests
10. [ ] Security audit before production

## Related Documentation

- [Stripe Documentation](https://stripe.com/docs)
- [PayPal Developer Docs](https://developer.paypal.com)
- PCI Compliance guidelines
- OrdersModule README
- CartModule README


