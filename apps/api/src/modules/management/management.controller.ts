import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from 'nest-keycloak-connect';
import { HRService } from './hr.service';
import { InventoryService } from '../products/inventory.service';
import { ManagementService } from './management.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { OrderStatus } from '@sdas/shared-types';

@ApiTags('management')
@ApiBearerAuth()
@Controller('management')
@Roles({ roles: ['realm:manager', 'realm:admin'] })
export class ManagementController {
  constructor(
    private hrService: HRService,
    private inventoryService: InventoryService,
    private managementService: ManagementService,
    private ordersService: OrdersService,
    private productsService: ProductsService
  ) {}

  /**
   * Get dashboard overview with aggregated data from multiple sources
   */
  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get management dashboard overview' })
  @ApiResponse({ status: 200, description: 'Aggregated dashboard data' })
  async getOverview() {
    return this.managementService.getOverview();
  }

  @Get('inventory/alerts')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiResponse({
    status: 200,
    description: 'List of products needing attention',
  })
  async getInventoryAlerts() {
    return this.managementService.getLowStockAlerts();
  }

  @Post('employees/sync')
  @ApiOperation({ summary: 'Sync employee data from ADP/HR system' })
  @ApiResponse({ status: 200, description: 'Sync results' })
  async syncEmployees() {
    const result = await this.hrService.syncEmployees();
    return {
      message: 'Employee sync completed',
      stats: result,
    };
  }

  // ─── Orders ───

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders (management view)' })
  @ApiResponse({ status: 200, description: 'List of all orders' })
  async getAllOrders() {
    const result = await this.ordersService.findAll();
    return {
      total: result.total,
      orders: result.orders,
    };
  }

  @Get('orders/completed')
  @ApiOperation({ summary: 'Get completed orders' })
  @ApiResponse({ status: 200, description: 'List of completed orders' })
  async getCompletedOrders() {
    const completedOrders = await this.ordersService.getCompletedOrders();
    return {
      total: completedOrders.length,
      completedOrders,
    };
  }

  @Get('orders/pending/count')
  @ApiOperation({ summary: 'Get count of pending/processing orders' })
  @ApiResponse({ status: 200, description: 'Pending orders count' })
  async getPendingOrdersCount() {
    const count = await this.ordersService.getPendingOrdersCount();
    return { pendingCount: count };
  }

  @Get('orders/status/:status')
  @ApiOperation({ summary: 'Get orders by status' })
  @ApiResponse({ status: 200, description: 'Filtered list of orders' })
  async getOrdersByStatus(@Param('status') status: string) {
    const orders = await this.ordersService.findByStatus(status);
    return {
      status,
      count: orders.length,
      orders,
    };
  }

  // ─── Inventory ───

  @Get('inventory/report')
  @ApiOperation({ summary: 'Get detailed inventory report' })
  @ApiResponse({
    status: 200,
    description: 'Inventory analytics and low stock report',
  })
  async getInventoryReport() {
    const [allProducts, lowStockItems] = await Promise.all([
      this.productsService.findAll(),
      this.inventoryService.getLowStockItems(),
    ]);

    const totalValue = allProducts.reduce((sum, product) => {
      const stock = (product.attributes?.['stock'] as number) || 0;
      return sum + product.price * stock;
    }, 0);

    return {
      totalProducts: allProducts.length,
      lowStockCount: lowStockItems.length,
      totalInventoryValue: totalValue,
      lowStockItems: lowStockItems.map((item) => ({
        id: item._id,
        name: item.name,
        stock: item.attributes?.['stock'],
        threshold: item.attributes?.['lowStockThreshold'],
        reorderRecommended: true,
      })),
    };
  }

  @Put('inventory/:productId/stock')
  @ApiOperation({ summary: 'Update stock level for a product' })
  @ApiResponse({ status: 200, description: 'Stock updated' })
  async updateStock(
    @Param('productId') productId: string,
    @Body() body: { quantityChange: number }
  ) {
    return this.inventoryService.updateStock(productId, body.quantityChange);
  }

  // ─── HR / Employees ───

  @Get('employees/:employeeId/payroll')
  @ApiOperation({ summary: 'Get payroll data for an employee' })
  @ApiResponse({ status: 200, description: 'Payroll information' })
  async getEmployeePayroll(@Param('employeeId') employeeId: string) {
    try {
      const payroll = await this.hrService.getEmployeePayroll(employeeId);
      return {
        employeeId,
        payroll,
      };
    } catch (error) {
      return {
        employeeId,
        error: 'Failed to fetch payroll data',
      };
    }
  }

  // ─── Analytics ───

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get overall analytics summary' })
  @ApiResponse({
    status: 200,
    description: 'Sales, inventory, and payroll summary',
  })
  async getAnalyticsSummary() {
    const [ordersResult, products, lowStock, payrollSummary] =
      await Promise.all([
        this.ordersService.findAll(),
        this.productsService.findAll(),
        this.inventoryService.getLowStockItems(),
        this.hrService.getPayrollSummary().catch(() => null),
      ]);

    const orders = ordersResult.orders;

    const revenue = orders
      .filter((order) => order.status === OrderStatus.DELIVERED)
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    const avgOrderValue =
      orders.length > 0 ? revenue / orders.length : 0;

    return {
      sales: {
        totalRevenue: revenue,
        totalOrders: ordersResult.total,
        averageOrderValue: avgOrderValue,
      },
      inventory: {
        totalProducts: products.length,
        lowStockItems: lowStock.length,
      },
      payroll: payrollSummary,
      generatedOn: new Date().toISOString(),
    };
  }
}
