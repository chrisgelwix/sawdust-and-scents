import { test, expect } from './fixtures/api.fixtures';

test.describe('Products API', () => {
  // ─── Public Endpoints ───

  test('should fetch all products', async ({ request }) => {
    const response = await request.get('products');
    expect(response.ok()).toBeTruthy();
    const products = await response.json();
    expect(Array.isArray(products)).toBeTruthy();
  });

  test('should fetch a single product by ID', async ({ request }) => {
    const allResponse = await request.get('products');
    const products = await allResponse.json();

    if (products.length > 0) {
      const productId = products[0]._id || products[0].id;
      const response = await request.get(`products/${productId}`);
      expect(response.ok()).toBeTruthy();
      const product = await response.json();
      expect(product).toHaveProperty('name', products[0].name);
    }
  });

  test('should return 404 for non-existent product ID', async ({ request }) => {
    const fakeId = '65ca12345678901234567890';
    const response = await request.get(`products/${fakeId}`);
    expect(response.status()).toBe(404);
  });

  test('should get all distinct scents', async ({ request }) => {
    const response = await request.get('products/scents');
    expect(response.ok()).toBeTruthy();
    const scents = await response.json();
    expect(Array.isArray(scents)).toBeTruthy();
  });

  test('should get all categories', async ({ request }) => {
    const response = await request.get('products/categories');
    expect(response.ok()).toBeTruthy();
    const categories = await response.json();
    expect(Array.isArray(categories)).toBeTruthy();
  });

  test('should get products by scent', async ({ request }) => {
    const response = await request.get('products/scent/sandalwood');
    expect(response.ok()).toBeTruthy();
    const products = await response.json();
    expect(Array.isArray(products)).toBeTruthy();
  });

  test('should get products by category', async ({ request }) => {
    // First get categories, then query one
    const catResponse = await request.get('products/categories');
    const categories = await catResponse.json();

    if (categories.length > 0) {
      const response = await request.get(`products/category/${categories[0]}`);
      expect(response.ok()).toBeTruthy();
      const products = await response.json();
      expect(Array.isArray(products)).toBeTruthy();
    }
  });

  test('should search products by name', async ({ request }) => {
    const response = await request.get('products/search?q=candle');
    expect(response.ok()).toBeTruthy();
    const products = await response.json();
    expect(Array.isArray(products)).toBeTruthy();
  });

  // ─── Admin/Worker Endpoints ───

  test.describe('Admin Operations', () => {
    let createdProductId: string;

    test('should create a new product', async ({ adminRequest }) => {
      const newProduct = {
        name: 'Test Playwright Candle',
        description: 'Created during API testing',
        price: 25.99,
        category: 'Candles',
        attributes: {
          scent: 'sandalwood',
          height: 5,
          width: 3,
          stock: 50,
        },
      };

      const response = await adminRequest.post('products', {
        data: newProduct,
      });

      expect(response.status()).toBe(201);
      const product = await response.json();
      expect(product.name).toBe(newProduct.name);
      createdProductId = product._id || product.id;
    });

    test('should update an existing product', async ({ adminRequest }) => {
      test.skip(!createdProductId, 'No product created to update');

      const updateData = {
        price: 29.99,
        description: 'Updated description',
      };

      const response = await adminRequest.put(`products/${createdProductId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      const product = await response.json();
      expect(product.price).toBe(updateData.price);
    });

    test('should soft-delete a product', async ({ adminRequest }) => {
      test.skip(!createdProductId, 'No product created to delete');

      const response = await adminRequest.delete(`products/${createdProductId}`);
      expect(response.ok()).toBeTruthy();
      const product = await response.json();
      expect(product.isActive).toBe(false);
    });
  });

  // ─── Negative Tests ───

  test.describe('Negative Tests', () => {
    test('should return 401 when creating product without token', async ({ request }) => {
      const response = await request.post('products', {
        data: { name: 'Unauthorized Product', price: 10 },
      });
      expect(response.status()).toBe(401);
    });

    test('should return 401 when deleting product without token', async ({ request }) => {
      const response = await request.delete('products/65ca12345678901234567890');
      expect(response.status()).toBe(401);
    });
  });
});
