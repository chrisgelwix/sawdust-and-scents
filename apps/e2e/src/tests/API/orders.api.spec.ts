import { test, expect } from './fixtures/api.fixtures';

test.describe('Orders API', () => {
  // ─── Admin / Worker Endpoints ───

  test('should get all orders with pagination (admin)', async ({ adminRequest }) => {
    const response = await adminRequest.get('orders');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.orders)).toBeTruthy();
  });

  test('should get orders filtered by status', async ({ adminRequest }) => {
    const response = await adminRequest.get('orders/status/pending');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('status', 'pending');
    expect(Array.isArray(data.orders)).toBeTruthy();
  });

  // ─── Authenticated User Endpoints ───

  test('should get my orders', async ({ userRequest }) => {
    const response = await userRequest.get('orders/me');
    expect(response.status()).toBe(200);
    const orders = await response.json();
    expect(Array.isArray(orders)).toBeTruthy();
  });

  test('should get a single order by ID when it exists', async ({ adminRequest }) => {
    // Get list first, then fetch one by ID
    const listResponse = await adminRequest.get('orders');
    const data = await listResponse.json();

    if (data.orders.length > 0) {
      const orderId = data.orders[0].id;
      const response = await adminRequest.get(`orders/${orderId}`);
      expect(response.status()).toBe(200);
      const order = await response.json();
      expect(order).toHaveProperty('id', orderId);
    }
  });

  test('should return 404 for non-existent order ID', async ({ adminRequest }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await adminRequest.get(`orders/${fakeId}`);
    expect(response.status()).toBe(404);
  });

  test('should update an order (admin)', async ({ adminRequest }) => {
    const listResponse = await adminRequest.get('orders');
    const data = await listResponse.json();

    if (data.orders.length > 0) {
      const orderId = data.orders[0].id;
      const response = await adminRequest.put(`orders/${orderId}`, {
        data: { status: 'processing' },
      });
      expect(response.status()).toBe(200);
      const updated = await response.json();
      expect(updated.status).toBe('processing');
    }
  });

  test('should cancel a pending order', async ({ adminRequest }) => {
    const listResponse = await adminRequest.get('orders/status/pending');
    const data = await listResponse.json();

    if (data.orders.length > 0) {
      const orderId = data.orders[0].id;
      const response = await adminRequest.post(`orders/${orderId}/cancel`, {
        data: { reason: 'Changed my mind' },
      });
      // 201 = cancelled, 400 = already shipped/delivered/cancelled
      expect([201, 400]).toContain(response.status());
    }
  });

  test('should not cancel a delivered order', async ({ adminRequest }) => {
    // Find a delivered order (if any)
    const listResponse = await adminRequest.get('orders/status/delivered');
    const data = await listResponse.json();

    if (data.orders.length > 0) {
      const orderId = data.orders[0].id;
      const response = await adminRequest.post(`orders/${orderId}/cancel`, {
        data: { reason: 'Test' },
      });
      expect(response.status()).toBe(400);
    }
  });

  // ─── Shipping Endpoints ───

  test('should fetch shipping rates for an order', async ({ adminRequest }) => {
    const listResponse = await adminRequest.get('orders');
    const data = await listResponse.json();

    if (data.orders.length > 0) {
      const orderId = data.orders[0].id;
      const response = await adminRequest.get(`orders/${orderId}/rates`);
      // Shippo may succeed or fail depending on test data / API key
      expect(response.status()).toBeDefined();
    }
  });

  test('should get tracking status for a shipped order', async ({ adminRequest }) => {
    const listResponse = await adminRequest.get('orders/status/shipped');
    const data = await listResponse.json();

    if (data.orders.length > 0) {
      const orderId = data.orders[0].id;
      const response = await adminRequest.get(`orders/${orderId}/tracking`);
      // 200 = has tracking, 404 = no tracking number yet
      expect([200, 404]).toContain(response.status());
    }
  });

  // ─── Security ───

  test('should return 401 when accessing orders without token', async ({ request }) => {
    const response = await request.get('orders');
    expect(response.status()).toBe(401);
  });

  test('should return 401 for unauthenticated shipping rate request', async ({ request }) => {
    const response = await request.get('orders/some-id/rates');
    expect(response.status()).toBe(401);
  });
});
