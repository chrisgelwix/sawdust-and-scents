import { test as base, request, APIRequestContext } from '@playwright/test';
import { getAuthToken } from '../helperMethods/auth.helpers';

type ApiFixtures = {
  adminRequest: APIRequestContext;
  userRequest: APIRequestContext;
};

// Simple in-memory token cache
const tokenCache = {
  admin: { token: '', expires: 0 },
  user: { token: '', expires: 0 },
};

async function getCachedToken(role: 'admin' | 'user'): Promise<string> {
  const now = Date.now();
  const cached = tokenCache[role];
  
  // If token exists and is not expiring in the next 60 seconds
  if (cached.token && cached.expires > now + 60000) {
    return cached.token;
  }

  const username = role === 'admin' 
    ? process.env.TEST_ADMIN_USERNAME 
    : process.env.TEST_USER_USERNAME;
  const password = role === 'admin' 
    ? process.env.TEST_ADMIN_PASSWORD 
    : process.env.TEST_USER_PASSWORD;

  if (!username || !password) {
    throw new Error(`TEST_${role.toUpperCase()}_USERNAME and PASSWORD must be set`);
  }

  const token = await getAuthToken(username, password);
  
  // Cache for 5 minutes (standard Keycloak token lifetime is usually 15-30 mins)
  tokenCache[role] = {
    token,
    expires: now + (5 * 60 * 1000), 
  };

  return token;
}

const API_BASE_URL = (process.env.API_URL || 'http://localhost:3000') + '/api/';

export const test = base.extend<ApiFixtures>({
  adminRequest: async ({ playwright }, use) => {
    const token = await getCachedToken('admin');
    const context = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    await use(context);
    await context.dispose();
  },

  userRequest: async ({ playwright }, use) => {
    const token = await getCachedToken('user');
    const context = await playwright.request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    await use(context);
    await context.dispose();
  },
});

export { expect } from '@playwright/test';
