import { test, expect } from './fixtures/api.fixtures';

test.describe('Subscriptions API', () => {
  // ─── Public Endpoints: Subscription Plans ───

  test('should fetch all active subscription plans', async ({ request }) => {
    const response = await request.get('subscriptions/plans');
    expect(response.ok()).toBeTruthy();
    const plans = await response.json();
    expect(Array.isArray(plans)).toBeTruthy();
  });

  test('should fetch a specific plan by ID', async ({ request }) => {
    const allResponse = await request.get('subscriptions/plans');
    const plans = await allResponse.json();

    if (plans.length > 0) {
      const planId = plans[0]._id || plans[0].id;
      const response = await request.get(`subscriptions/plans/${planId}`);
      expect(response.ok()).toBeTruthy();
      const plan = await response.json();
      expect(plan).toHaveProperty('name', plans[0].name);
      expect(plan).toHaveProperty('price');
      expect(plan).toHaveProperty('candleCount');
      expect(plan).toHaveProperty('trialDays');
      expect(plan).toHaveProperty('minimumCommitmentMonths');
    }
  });

  test('should return 404 for non-existent plan ID', async ({ request }) => {
    const fakeId = '65ca12345678901234567890';
    const response = await request.get(`subscriptions/plans/${fakeId}`);
    expect(response.status()).toBe(404);
  });

  // ─── Authenticated Endpoints: Subscription Lifecycle ───

  test.describe('Subscription Lifecycle', () => {
    let subscriptionId: string;
    let testPlanId: string;

    test('should subscribe to a plan (starts in trialing)', async ({
      userRequest,
      request,
    }) => {
      // Get an available plan first
      const plansResponse = await request.get('subscriptions/plans');
      const plans = await plansResponse.json();
      test.skip(plans.length === 0, 'No subscription plans available');

      testPlanId = plans[0]._id || plans[0].id;

      const response = await userRequest.post('subscriptions', {
        data: {
          planId: testPlanId,
          scentPreferences: ['woody', 'vanilla'],
        },
      });
      expect(response.status()).toBe(201);

      const subscription = await response.json();
      expect(subscription).toHaveProperty('id');
      expect(subscription).toHaveProperty('status', 'trialing');
      expect(subscription).toHaveProperty('trialStart');
      expect(subscription).toHaveProperty('trialEnd');
      expect(subscription).toHaveProperty('minimumCommitmentEnd');
      expect(subscription.scentPreferences).toEqual(['woody', 'vanilla']);

      subscriptionId = subscription.id;
    });

    test('should reject duplicate subscription for same user', async ({
      userRequest,
      request,
    }) => {
      test.skip(!subscriptionId, 'No subscription was created');

      const plansResponse = await request.get('subscriptions/plans');
      const plans = await plansResponse.json();
      test.skip(plans.length === 0, 'No subscription plans available');

      const planId = plans[0]._id || plans[0].id;
      const response = await userRequest.post('subscriptions', {
        data: { planId },
      });
      expect(response.status()).toBe(400);
    });

    test('should get my subscriptions', async ({ userRequest }) => {
      const response = await userRequest.get('subscriptions/me');
      expect(response.ok()).toBeTruthy();
      const subscriptions = await response.json();
      expect(Array.isArray(subscriptions)).toBeTruthy();
    });

    test('should get my active subscription', async ({ userRequest }) => {
      const response = await userRequest.get('subscriptions/me/active');
      expect(response.ok()).toBeTruthy();

      if (subscriptionId) {
        const subscription = await response.json();
        expect(subscription).toHaveProperty('id', subscriptionId);
        // Active subscription includes both 'active' and 'trialing'
        expect(['active', 'trialing']).toContain(subscription.status);
      }
    });

    test('should update scent preferences', async ({ userRequest }) => {
      test.skip(!subscriptionId, 'No subscription was created');

      const newPreferences = ['fresh', 'citrus', 'floral'];
      const response = await userRequest.put(
        `subscriptions/${subscriptionId}/preferences`,
        {
          data: { scentPreferences: newPreferences },
        }
      );
      expect(response.ok()).toBeTruthy();

      const subscription = await response.json();
      expect(subscription.scentPreferences).toEqual(newPreferences);
    });

    test('should reject pause on non-active (trialing) subscription', async ({
      userRequest,
    }) => {
      test.skip(!subscriptionId, 'No subscription was created');

      // Subscription starts as 'trialing', not 'active' — pause should fail
      const response = await userRequest.put(
        `subscriptions/${subscriptionId}/pause`
      );
      expect(response.status()).toBe(400);
    });

    test('should reject resume on non-paused subscription', async ({
      userRequest,
    }) => {
      test.skip(!subscriptionId, 'No subscription was created');

      const response = await userRequest.put(
        `subscriptions/${subscriptionId}/resume`
      );
      expect(response.status()).toBe(400);
    });

    test('should reject cancel during minimum commitment period', async ({
      userRequest,
    }) => {
      test.skip(!subscriptionId, 'No subscription was created');

      // Subscription was just created — still within 3-month minimum commitment
      const response = await userRequest.put(
        `subscriptions/${subscriptionId}/cancel`
      );
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.message).toContain('3-month minimum commitment');
    });

    test('should return 404 for non-existent subscription ID', async ({
      userRequest,
    }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await userRequest.put(`subscriptions/${fakeId}/pause`);
      expect(response.status()).toBe(404);
    });
  });

  // ─── Admin Endpoints: Plan Management ───

  test.describe('Admin Plan Management', () => {
    let createdPlanId: string;

    test('should create a new subscription plan (admin)', async ({
      adminRequest,
    }) => {
      const newPlan = {
        name: 'Test Playwright Plan',
        description: 'Created during API testing',
        price: 34.99,
        candleCount: 3,
        billingInterval: 'monthly',
        stripePriceId: 'price_test_playwright',
        trialDays: 30,
        minimumCommitmentMonths: 3,
        features: ['Free shipping', '1-month free trial'],
      };

      const response = await adminRequest.post('subscriptions/plans', {
        data: newPlan,
      });
      expect(response.status()).toBe(201);

      const plan = await response.json();
      expect(plan.name).toBe(newPlan.name);
      expect(plan.price).toBe(newPlan.price);
      expect(plan.candleCount).toBe(newPlan.candleCount);
      expect(plan.trialDays).toBe(newPlan.trialDays);
      expect(plan.minimumCommitmentMonths).toBe(
        newPlan.minimumCommitmentMonths
      );

      createdPlanId = plan._id || plan.id;
    });

    test('should update a subscription plan (admin)', async ({
      adminRequest,
    }) => {
      test.skip(!createdPlanId, 'No plan was created');

      const updateData = {
        price: 39.99,
        description: 'Updated during testing',
      };

      const response = await adminRequest.put(
        `subscriptions/plans/${createdPlanId}`,
        {
          data: updateData,
        }
      );
      expect(response.ok()).toBeTruthy();

      const plan = await response.json();
      expect(plan.price).toBe(updateData.price);
      expect(plan.description).toBe(updateData.description);
    });
  });

  // ─── Security ───

  test.describe('Security', () => {
    test('should return 401 when subscribing without token', async ({
      request,
    }) => {
      const response = await request.post('subscriptions', {
        data: { planId: 'some-plan-id' },
      });
      expect(response.status()).toBe(401);
    });

    test('should return 401 when accessing my subscriptions without token', async ({
      request,
    }) => {
      const response = await request.get('subscriptions/me');
      expect(response.status()).toBe(401);
    });

    test('should return 401 when accessing active subscription without token', async ({
      request,
    }) => {
      const response = await request.get('subscriptions/me/active');
      expect(response.status()).toBe(401);
    });

    test('should return 401 when pausing without token', async ({
      request,
    }) => {
      const response = await request.put('subscriptions/some-id/pause');
      expect(response.status()).toBe(401);
    });

    test('should return 401 when cancelling without token', async ({
      request,
    }) => {
      const response = await request.put('subscriptions/some-id/cancel');
      expect(response.status()).toBe(401);
    });

    test('should return 401 when creating plan without token', async ({
      request,
    }) => {
      const response = await request.post('subscriptions/plans', {
        data: { name: 'Unauthorized Plan', price: 10 },
      });
      expect(response.status()).toBe(401);
    });

    test('should allow public access to browse plans', async ({ request }) => {
      const response = await request.get('subscriptions/plans');
      expect(response.ok()).toBeTruthy();
    });
  });
});
