import { test, expect } from './fixtures/api.fixtures';

test.describe('Products API', () => {
  // Public Endpoints
  test('should fetch all products (Public)', async ({ request }) => {
    const response = await request.get('products');
    expect(response.ok()).toBeTruthy();
    const products = await response.json();
    expect(Array.isArray(products)).toBeTruthy();
  });

  test('should fetch a single product by ID', async ({ request }) => {
    // First get all products to find a valid ID
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

  // Admin/Worker Endpoints
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
          width: 3
        }
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
        description: 'Updated description'
      };

      const response = await adminRequest.put(`products/${createdProductId}`, {
        data: updateData,
      });

      expect(response.ok()).toBeTruthy();
      const product = await response.json();
      expect(product.price).toBe(updateData.price);
    });
  });

  test.describe('Negative Tests', () => {
    test('should return 401 when creating product without token', async ({ request }) => {
      const response = await request.post('products', {
        data: { name: 'Unauthorized Product', price: 10 }
      });
      expect(response.status()).toBe(401);
    });

    test('should return 404 for non-existent product ID', async ({ request }) => {
      const fakeId = '65ca12345678901234567890'; // Valid length MongoID but unlikely to exist
      const response = await request.get(`products/${fakeId}`);
      expect(response.status()).toBe(404);
    });
  });
});