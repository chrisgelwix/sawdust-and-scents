import { test, expect } from './fixtures/api.fixtures';

test.describe('Cart & Checkout API', () => {
  // Cart is in-memory and keyed by user ID — tests must run serially
  // to avoid parallel workers stomping on each other's cart state.
  test.describe.configure({ mode: 'serial' });

  const testProduct = {
    productId: '65ca12345678901234567890',
    quantity: 2,
  };

  test('should manage cart items (add, get, clear)', async ({ userRequest }) => {
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

  test('should update a single cart item quantity', async ({ userRequest }) => {
    // Start clean
    await userRequest.delete('cart');

    // Add item
    await userRequest.post('cart/items', { data: testProduct });

    // Update quantity
    const response = await userRequest.put(`cart/items/${testProduct.productId}`, {
      data: { quantity: 5 },
    });
    expect(response.status()).toBe(200);
    const cart = await response.json();
    const item = cart.find((i: any) => i.productId === testProduct.productId);
    expect(item.quantity).toBe(5);

    // Cleanup
    await userRequest.delete('cart');
  });

  test('should remove a single item from cart', async ({ userRequest }) => {
    // Start clean
    await userRequest.delete('cart');

    // Add item
    await userRequest.post('cart/items', { data: testProduct });

    // Remove just that item
    const response = await userRequest.delete(`cart/items/${testProduct.productId}`);
    expect(response.status()).toBe(200);
    const cart = await response.json();
    expect(cart.length).toBe(0);
  });

  test('should return 404 when removing item not in cart', async ({ userRequest }) => {
    await userRequest.delete('cart');

    const response = await userRequest.delete('cart/items/nonexistent-product-id');
    expect(response.status()).toBe(404);
  });

  test('should return 404 when updating item not in cart', async ({ userRequest }) => {
    await userRequest.delete('cart');

    const response = await userRequest.put('cart/items/nonexistent-product-id', {
      data: { quantity: 3 },
    });
    expect(response.status()).toBe(404);
  });

  test('should fail checkout with empty cart', async ({ userRequest }) => {
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
