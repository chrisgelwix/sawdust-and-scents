import { request } from '@playwright/test';

/**
 * Helper to get a Bearer token from Keycloak for testing
 * @param username Keycloak username
 * @param password Keycloak password
 * @returns The access token string
 */
export async function getAuthToken(username: string, password: string): Promise<string> {
  // Use a fresh request context to avoid interference with other tests
  const authContext = await request.newContext();
  
  const realm = 'sdas-realm';
  const clientId = 'sdas-api';
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || '';
  const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';

  const response = await authContext.post(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
    form: {
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username: username,
      password: password,
    }
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to get auth token: ${response.status()} ${response.statusText()} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}
