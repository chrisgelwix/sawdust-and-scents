import { test, expect } from './fixtures/api.fixtures';

test.describe('App (Root) API', () => {
  test('should return health check data', async ({ request }) => {
    // Note: The root endpoint is at /api (global prefix)
    const response = await request.get('');
    expect(response.status()).toBe(200);
  });

  test('should verify secure-test endpoint with token', async ({ adminRequest }) => {
    const response = await adminRequest.get('secure-test');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toContain('logged in');
  });
});
