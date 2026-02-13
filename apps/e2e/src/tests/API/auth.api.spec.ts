import { test, expect } from './fixtures/api.fixtures';

test.describe('Auth API', () => {
  test('should get user profile when authenticated', async ({ adminRequest }) => {
    const response = await adminRequest.get('auth/profile');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('roles');
    // email is only present if set in Keycloak for this user
    if (data.email) {
      expect(typeof data.email).toBe('string');
    }
  });

  test('should return 401 for profile request without token', async ({ request }) => {
    const response = await request.get('auth/profile');
    expect(response.status()).toBe(401);
  });
});
