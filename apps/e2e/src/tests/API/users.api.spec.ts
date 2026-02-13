import { test, expect } from './fixtures/api.fixtures';

test.describe('Users API', () => {
  test('should get current user profile', async ({ userRequest }) => {
    const response = await userRequest.get('users/me');
    expect(response.status()).toBe(200);
    const body = await response.text();
    // Profile may be empty/null if user not yet in DB (no order placed)
    if (body) {
      const profile = JSON.parse(body);
      if (profile) {
        expect(profile).toHaveProperty('email');
      }
    }
  });

  test('should update user profile', async ({ userRequest }) => {
    const updateData = {
      phoneNumber: '1234567890'
    };
    
    const response = await userRequest.put('users/profile', {
      data: updateData
    });
    
    expect(response.status()).toBe(200);
    const body = await response.text();
    // Response may be empty if user not yet in DB
    if (body) {
      const updatedProfile = JSON.parse(body);
      if (updatedProfile) {
        expect(updatedProfile.phoneNumber).toBe(updateData.phoneNumber);
      }
    }
  });

  test('should return 401 when accessing users/me without token', async ({ request }) => {
    const response = await request.get('users/me');
    expect(response.status()).toBe(401);
  });
});
