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
});
