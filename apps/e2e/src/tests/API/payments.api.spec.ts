import { test, expect } from './fixtures/api.fixtures';

test.describe('Payments API', () => {
  test('should create payment intent', async ({ userRequest }) => {
    const data = {
      amount: 5000, // $50.00
      currency: 'usd'
    };
    
    const response = await userRequest.post('payments/intent', {
      data
    });
    
    expect(response.status()).toBe(201);
    const intent = await response.json();
    expect(intent).toHaveProperty('id');
    expect(intent).toHaveProperty('client_secret');
    expect(intent.amount).toBe(data.amount);
  });

  test('should handle payment webhook', async ({ request }) => {
    const payload = {
      id: 'evt_test',
      type: 'payment_intent.succeeded'
    };
    
    const response = await request.post('payments/webhook', {
      data: payload
    });
    
    expect(response.status()).toBe(201); // Post returns 201 in NestJS by default
    const result = await response.json();
    expect(result.received).toBe(true);
  });
});
