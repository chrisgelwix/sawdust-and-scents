import { test, expect } from './fixtures/api.fixtures';

test.describe('Management API', () => {
  test('should fetch management dashboard overview', async ({ adminRequest }) => {
    const response = await adminRequest.get('management/dashboard/overview');

    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('totalSales');
    expect(data).toHaveProperty('orderCount');
    expect(data).toHaveProperty('lowStockCount');
  });

  test('should get management inventory alerts', async ({ adminRequest }) => {
    const response = await adminRequest.get('management/inventory/alerts');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('should trigger employee sync', async ({ adminRequest }) => {
    const response = await adminRequest.post('management/employees/sync');
    const status = response.status();

    // ADP credentials may not be configured in dev — sync returns 500 in that case
    if (status === 500) {
      const data = await response.json();
      expect(data).toHaveProperty('message');
    } else {
      expect(status).toBe(201); // Post returns 201 by default in Nest
      const data = await response.json();
      expect(data).toHaveProperty('message', 'Employee sync completed');
      expect(data).toHaveProperty('stats');
    }
  });

  test('should fetch all orders for management', async ({ adminRequest }) => {
    const response = await adminRequest.get('management/orders');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.orders)).toBeTruthy();
  });

  test('should get orders by status', async ({ adminRequest }) => {
    const status = 'pending';
    const response = await adminRequest.get(`management/orders/status/${status}`);

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe(status);
    expect(Array.isArray(data.orders)).toBeTruthy();
  });

  test('should fetch detailed inventory report', async ({ adminRequest }) => {
    const response = await adminRequest.get('management/inventory/report');

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('totalProducts');
    expect(data).toHaveProperty('lowStockCount');
    expect(data).toHaveProperty('totalInventoryValue');
    expect(Array.isArray(data.lowStockItems)).toBeTruthy();
  });

  test('should get employee payroll data', async ({ adminRequest }) => {
    const employeeId = 'test-id';
    const response = await adminRequest.get(`management/employees/${employeeId}/payroll`);

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.employeeId).toBe(employeeId);
    // Controller returns {employeeId, payroll} on success or {employeeId, error} if ADP is unavailable
    expect(data.payroll !== undefined || data.error !== undefined).toBeTruthy();
  });

  test('should get analytics summary', async ({ adminRequest }) => {
    const response = await adminRequest.get('management/analytics/summary');

    expect(response.status()).toBe(200);
    const data = await response.json();
    
    expect(data.sales).toHaveProperty('totalRevenue');
    expect(data.inventory).toHaveProperty('totalProducts');
    expect(data).toHaveProperty('generatedOn');
  });

  test('should return 401 when no token is provided for secure management endpoints', async ({ request }) => {
    const response = await request.get('management/dashboard/overview');
    expect(response.status()).toBe(401);
  });
});
