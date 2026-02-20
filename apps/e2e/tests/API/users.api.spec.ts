import { test, expect } from './fixtures/api.fixtures';

test.describe('Users API', () => {
  test('should get current user profile (auto-provisions on first access)', async ({ userRequest }) => {
    const response = await userRequest.get('users/me');
    expect(response.status()).toBe(200);
    const profile = await response.json();
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('keycloakId');
  });

  test('should update user profile', async ({ userRequest }) => {
    const updateData = {
      phoneNumber: '1234567890',
    };

    const response = await userRequest.put('users/profile', {
      data: updateData,
    });
    expect(response.status()).toBe(200);
    const updatedProfile = await response.json();
    expect(updatedProfile.phoneNumber).toBe(updateData.phoneNumber);
  });

  test('should register a guest user', async ({ request }) => {
    // Use unique values to avoid conflicts across test runs
    const ts = Date.now();
    const email = `guest-${ts}@example.com`;
    const phone = `555${String(ts).slice(-7)}`;
    const response = await request.post('users/guest', {
      data: { email, phoneNumber: phone },
    });

    // 201 = created, 409 = email already exists
    expect([201, 409]).toContain(response.status());

    if (response.status() === 201) {
      const guest = await response.json();
      expect(guest).toHaveProperty('id');
      expect(guest.email).toBe(email);
      expect(guest.keycloakId).toBeNull();
    }
  });

  test('should return 409 when registering guest with existing email', async ({ request }) => {
    const email = `guest-conflict-${Date.now()}@example.com`;

    // Create the guest first
    await request.post('users/guest', {
      data: { email },
    });

    // Try to create again with the same email
    const response = await request.post('users/guest', {
      data: { email },
    });
    expect(response.status()).toBe(409);
  });

  test('should return 401 when accessing users/me without token', async ({ request }) => {
    const response = await request.get('users/me');
    expect(response.status()).toBe(401);
  });
});
