import { test, expect } from './fixtures/api.fixtures';

test.describe('Payments API', () => {
  let createdIntentId: string;

  test('should create a payment intent', async ({ userRequest }) => {
    const data = {
      amount: 5000,
      currency: 'usd',
    };

    const response = await userRequest.post('payments/intent', { data });
    expect(response.status()).toBe(201);

    const intent = await response.json();
    expect(intent).toHaveProperty('id');
    expect(intent).toHaveProperty('client_secret');
    expect(intent).toHaveProperty('status', 'requires_payment_method');
    expect(intent.amount).toBe(data.amount);

    createdIntentId = intent.id;
  });

  test('should get payment intent status', async ({ userRequest }) => {
    test.skip(!createdIntentId, 'No payment intent was created');

    const response = await userRequest.get(`payments/${createdIntentId}`);
    expect(response.status()).toBe(200);

    const intent = await response.json();
    expect(intent.id).toBe(createdIntentId);
    expect(intent).toHaveProperty('status');
  });

  test('should return 404 for non-existent payment intent', async ({ userRequest }) => {
    const response = await userRequest.get('payments/pi_nonexistent');
    expect(response.status()).toBe(404);
  });

  test('should process a refund for an existing intent', async ({ userRequest }) => {
    test.skip(!createdIntentId, 'No payment intent was created');

    const response = await userRequest.post('payments/refund', {
      data: { paymentIntentId: createdIntentId },
    });
    expect(response.status()).toBe(201);

    const refund = await response.json();
    expect(refund).toHaveProperty('id');
    expect(refund.paymentIntentId).toBe(createdIntentId);
    expect(refund.status).toBe('succeeded');
  });

  test('should return 404 when refunding non-existent intent', async ({ userRequest }) => {
    const response = await userRequest.post('payments/refund', {
      data: { paymentIntentId: 'pi_nonexistent' },
    });
    expect(response.status()).toBe(404);
  });

  test('should handle payment webhook (public)', async ({ request }) => {
    const payload = {
      id: 'evt_test',
      type: 'payment_intent.succeeded',
    };

    const response = await request.post('payments/webhook', {
      data: payload,
    });
    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result.received).toBe(true);
  });

  test('should return 401 when creating intent without token', async ({ request }) => {
    const response = await request.post('payments/intent', {
      data: { amount: 1000, currency: 'usd' },
    });
    expect(response.status()).toBe(401);
  });
});
