import { test, expect } from './fixtures/api.fixtures';

test.describe('Cart & Checkout API', () => {
  const testProduct = {
    productId: '65ca12345678901234567890', // Placeholder ID
    quantity: 2,
  };

  test('should manage cart items', async ({ userRequest }) => {
    // 1. Add item to cart
    const addResponse = await userRequest.post('cart/items', {
      data: testProduct,
    });
    expect(addResponse.status()).toBe(201);
    
    // 2. Get cart
    const getResponse = await userRequest.get('cart');
    expect(getResponse.status()).toBe(200);
    const cart = await getResponse.json();
    expect(Array.isArray(cart)).toBeTruthy();
    
    // 3. Clear cart
    const clearResponse = await userRequest.delete('cart');
    expect(clearResponse.status()).toBe(200);
    
    // 4. Verify empty
    const finalGet = await userRequest.get('cart');
    const finalCart = await finalGet.json();
    expect(finalCart.length).toBe(0);
  });

  test('should fail checkout with empty cart', async ({ userRequest }) => {
    // Ensure cart is empty before testing (prevents parallel test pollution)
    await userRequest.delete('cart');

    const response = await userRequest.post('cart/checkout');
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('empty cart');
  });

  test('should return 401 when accessing cart without token', async ({ request }) => {
    const response = await request.get('cart');
    expect(response.status()).toBe(401);
  });
});
