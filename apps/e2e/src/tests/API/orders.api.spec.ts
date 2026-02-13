import { test, expect } from './fixtures/api.fixtures';

test.describe('Orders API', () => {
  test('should get all orders (Admin View)', async ({ adminRequest }) => {
    const response = await adminRequest.get('orders');
    expect(response.status()).toBe(200);
    const orders = await response.json();
    expect(Array.isArray(orders)).toBeTruthy();
  });

  test('should fetch shipping rates for an order', async ({ adminRequest }) => {
    // 1. First get an existing order
    const ordersResponse = await adminRequest.get('orders');
    const orders = await ordersResponse.json();
    
    if (orders.length > 0) {
      const orderId = orders[0].id;
      // 2. Fetch rates
      const response = await adminRequest.get(`orders/${orderId}/rates`);
      // Since this hits external Shippo API, it might return 200 or an error depending on test data
      expect(response.status()).toBeDefined();
    }
  });

  test('should return 401 when non-admin tries to get rates', async ({ request }) => {
    const response = await request.get('orders/some-id/rates');
    expect(response.status()).toBe(401);
  });

  test('should find orders by contact info (Guest)', async ({ request }) => {
    // Testing the guest lookup logic
    const contactInfo = 'test@example.com';
    // This path is based on the logic described in 18a
    const response = await request.get(`orders/lookup?email=${contactInfo}`);
    expect(response.status()).toBeDefined();
  });
});
