import { test, expect } from './fixtures/api.fixtures';

test.describe('Chatbot API', () => {
  test('should process a guest message', async ({ request }) => {
    const response = await request.post('chatbot/message', {
      data: {
        text: 'Hello Rowan!'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('reply');
  });

  test('should get conversation history for authenticated user', async ({ userRequest }) => {
    const response = await userRequest.get('chatbot/history');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('should find candles by scent', async ({ request }) => {
    const response = await request.post('chatbot/message', {
      data: {
        text: 'Do you have any candles that smell like sandalwood?'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.reply.toLowerCase()).toContain('sandalwood');
  });

  test('should deny guest order lookup for registered user email', async ({ adminRequest, request }) => {
    // Ensure the admin user exists in PostgreSQL (auto-provisions on first GET /users/me)
    const profileResponse = await adminRequest.get('users/me');
    const profile = await profileResponse.json();
    const registeredEmail = profile.email;

    // A registered user's email should NOT be usable by a guest to look up orders
    const response = await request.post('chatbot/message', {
      data: {
        text: `Can I check my order status? My email is ${registeredEmail}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    // Should tell the guest to sign in instead of exposing order data
    expect(data.reply.toLowerCase()).toContain('sign in');
  });

  test('should allow guest order lookup for non-registered contact', async ({ request }) => {
    // A contact that doesn't belong to a registered user should get a normal response
    const response = await request.post('chatbot/message', {
      data: {
        text: 'What is my order status? My email is guest-shopper@example.com'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    // Should NOT tell them to sign in — just report no orders found
    expect(data.reply.toLowerCase()).not.toContain('sign in');
  });
});
