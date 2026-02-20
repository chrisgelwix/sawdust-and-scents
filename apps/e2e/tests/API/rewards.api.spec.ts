import { test, expect } from './fixtures/api.fixtures';

test.describe('Rewards API', () => {
  // Tests run serially since later tests depend on points state from earlier ones
  test.describe.configure({ mode: 'serial' });

  // ─── User Endpoints: Account & Balance ───

  test('should get my rewards account summary', async ({ userRequest }) => {
    const response = await userRequest.get('rewards/me');
    expect(response.status()).toBe(200);

    const account = await response.json();
    expect(account).toHaveProperty('currentBalance');
    expect(account).toHaveProperty('lifetimeEarned');
    expect(account).toHaveProperty('lifetimeRedeemed');
    expect(typeof account.currentBalance).toBe('number');
    expect(typeof account.lifetimeEarned).toBe('number');
    expect(typeof account.lifetimeRedeemed).toBe('number');
  });

  test('should get my current points balance', async ({ userRequest }) => {
    const response = await userRequest.get('rewards/me/balance');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(typeof data).toBe('number');
  });

  test('should get my points transaction history', async ({ userRequest }) => {
    const response = await userRequest.get('rewards/me/history');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('transactions');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.transactions)).toBeTruthy();
    expect(typeof data.total).toBe('number');
  });

  test('should support pagination on history', async ({ userRequest }) => {
    const response = await userRequest.get('rewards/me/history?page=1&limit=5');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('transactions');
    expect(data).toHaveProperty('total');
    expect(data.transactions.length).toBeLessThanOrEqual(5);
  });

  // ─── Admin Endpoints: Liability & Adjustments ───

  test('should get total points liability (admin)', async ({ adminRequest }) => {
    const response = await adminRequest.get('rewards/admin/liability');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('totalOutstanding');
    expect(data).toHaveProperty('dollarValue');
    expect(typeof data.totalOutstanding).toBe('number');
    expect(typeof data.dollarValue).toBe('number');
  });

  test('should manually adjust points (admin)', async ({ adminRequest, userRequest }) => {
    // Get the user's ID from their profile
    const profileResponse = await userRequest.get('users/me');
    const profile = await profileResponse.json();
    const userId = profile.id;

    const response = await adminRequest.post('rewards/admin/adjust', {
      data: {
        userId,
        points: 2000,
        reason: 'Playwright test: adding points for redemption testing',
      },
    });
    expect(response.status()).toBe(201);

    const transaction = await response.json();
    expect(transaction).toHaveProperty('id');
    expect(transaction).toHaveProperty('type', 'admin_adjustment');
    expect(transaction).toHaveProperty('points', 2000);
    expect(transaction).toHaveProperty('description');
    expect(transaction.description).toContain('Admin adjustment');
  });

  test('should reflect adjusted points in balance', async ({ userRequest }) => {
    const response = await userRequest.get('rewards/me/balance');
    expect(response.status()).toBe(200);

    const balance = await response.json();
    // Balance should include the 2000 points we just added (and any prior points)
    expect(balance).toBeGreaterThanOrEqual(2000);
  });

  test('should reflect adjustment in transaction history', async ({ userRequest }) => {
    const response = await userRequest.get('rewards/me/history?page=1&limit=5');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.total).toBeGreaterThanOrEqual(1);

    const adminTx = data.transactions.find(
      (t: any) => t.type === 'admin_adjustment'
    );
    expect(adminTx).toBeDefined();
    expect(adminTx.points).toBe(2000);
  });

  // ─── Redemption ───

  test('should reject redemption below minimum (500 points)', async ({ userRequest }) => {
    const response = await userRequest.post('rewards/redeem', {
      data: {
        pointsToRedeem: 100,
        orderTotal: 50,
        orderId: '00000000-0000-0000-0000-000000000001',
      },
    });
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.message).toContain('Minimum redemption');
  });

  test('should redeem points for a discount', async ({ userRequest }) => {
    const response = await userRequest.post('rewards/redeem', {
      data: {
        pointsToRedeem: 500,
        orderTotal: 100,
        orderId: '00000000-0000-0000-0000-000000000002',
      },
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty('discount');
    expect(data).toHaveProperty('transaction');
    expect(data.discount).toBe(5); // 500 points / 100 points-per-dollar = $5
    expect(data.transaction.points).toBe(-500); // Negative = spending
    expect(data.transaction.type).toBe('redemption');
  });

  test('should reject redemption when insufficient points', async ({ userRequest }) => {
    // Try to redeem way more points than the user has
    const response = await userRequest.post('rewards/redeem', {
      data: {
        pointsToRedeem: 999999,
        orderTotal: 100,
        orderId: '00000000-0000-0000-0000-000000000003',
      },
    });
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.message).toContain('Insufficient points');
  });

  test('should cap discount at max percentage of order total', async ({ adminRequest, userRequest }) => {
    // Give the user a large number of points
    const profileResponse = await userRequest.get('users/me');
    const profile = await profileResponse.json();

    await adminRequest.post('rewards/admin/adjust', {
      data: {
        userId: profile.id,
        points: 50000,
        reason: 'Playwright test: points for max discount test',
      },
    });

    // Try to redeem 50000 points on a $100 order
    // Max discount is 50% → $50 → 5000 points actually used
    const response = await userRequest.post('rewards/redeem', {
      data: {
        pointsToRedeem: 50000,
        orderTotal: 100,
        orderId: '00000000-0000-0000-0000-000000000004',
      },
    });
    expect(response.status()).toBe(201);

    const data = await response.json();
    // Discount should be capped at 50% of $100 = $50
    expect(data.discount).toBeLessThanOrEqual(50);
  });

  // ─── Account Summary After Activity ───

  test('should show correct lifetime stats after earn and spend', async ({ userRequest }) => {
    const response = await userRequest.get('rewards/me');
    expect(response.status()).toBe(200);

    const account = await response.json();
    // We've added points via admin adjustments and spent via redemptions
    expect(account.lifetimeEarned).toBeGreaterThan(0);
    expect(account.lifetimeRedeemed).toBeGreaterThan(0);
    expect(account.currentBalance).toBe(
      account.lifetimeEarned - account.lifetimeRedeemed
    );
  });

  // ─── Security ───

  test('should return 401 for rewards/me without token', async ({ request }) => {
    const response = await request.get('rewards/me');
    expect(response.status()).toBe(401);
  });

  test('should return 401 for rewards/me/balance without token', async ({ request }) => {
    const response = await request.get('rewards/me/balance');
    expect(response.status()).toBe(401);
  });

  test('should return 401 for rewards/me/history without token', async ({ request }) => {
    const response = await request.get('rewards/me/history');
    expect(response.status()).toBe(401);
  });

  test('should return 401 for redeem without token', async ({ request }) => {
    const response = await request.post('rewards/redeem', {
      data: { pointsToRedeem: 500, orderTotal: 50, orderId: 'test' },
    });
    expect(response.status()).toBe(401);
  });

  test('should return 401 for admin liability without token', async ({ request }) => {
    const response = await request.get('rewards/admin/liability');
    expect(response.status()).toBe(401);
  });

  test('should return 401 for admin adjust without token', async ({ request }) => {
    const response = await request.post('rewards/admin/adjust', {
      data: { userId: 'test', points: 100, reason: 'test' },
    });
    expect(response.status()).toBe(401);
  });
});
