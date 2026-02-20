import { test, expect } from './fixtures/api.fixtures';
import { request as playwrightRequest } from '@playwright/test';

test.describe('Auth API', () => {
  test('should get user profile when authenticated', async ({ adminRequest }) => {
    const response = await adminRequest.get('auth/profile');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('roles');
    if (data.email) {
      expect(typeof data.email).toBe('string');
    }
  });

  test('should return 401 for profile request without token', async ({ request }) => {
    const response = await request.get('auth/profile');
    expect(response.status()).toBe(401);
  });

  test('should refresh an access token', async ({ request }) => {
    // First, get a refresh_token by authenticating directly with Keycloak
    const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    const realm = 'sdas-realm';
    const clientId = 'sdas-api';
    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || '';
    const username = process.env.TEST_ADMIN_USERNAME || '';
    const password = process.env.TEST_ADMIN_PASSWORD || '';

    const authContext = await playwrightRequest.newContext();
    const tokenResponse = await authContext.post(
      `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
      {
        form: {
          grant_type: 'password',
          client_id: clientId,
          client_secret: clientSecret,
          username,
          password,
        },
      }
    );

    expect(tokenResponse.ok()).toBeTruthy();
    const tokenData = await tokenResponse.json();
    expect(tokenData).toHaveProperty('refresh_token');
    await authContext.dispose();

    // Now use the API refresh endpoint
    const refreshResponse = await request.post('auth/refresh', {
      data: { refresh_token: tokenData.refresh_token },
    });

    expect(refreshResponse.status()).toBe(201);
    const refreshData = await refreshResponse.json();
    expect(refreshData).toHaveProperty('access_token');
    expect(refreshData).toHaveProperty('refresh_token');
  });

  test('should fail refresh with an invalid refresh token', async ({ request }) => {
    const response = await request.post('auth/refresh', {
      data: { refresh_token: 'invalid-token-value' },
    });

    expect(response.status()).toBe(201); // Our endpoint always returns 201
    const data = await response.json();
    // The response should contain an error from Keycloak
    expect(data).toHaveProperty('statusCode');
    expect(data).toHaveProperty('message');
  });
});
