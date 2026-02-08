import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
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
    // Aggregate data from MongoDB, PostgreSQL
    return this.managementService.getOverview();
    //ADP API (for now) will be added later
  }

  @Get('inventory/alerts')
  @ApiOperation({ summary: 'Get low stock alerts' })
  @ApiResponse({
    status: 200,
    description: 'List of products needing attention',
  })
  async getInventoryAlerts() {
    // Returns only products that need immediate attention
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

  // Get all orders
  @Get('orders')
  @ApiOperation({ summary: 'Get all orders (management view)' })
  @ApiResponse({ status: 200, description: 'List of all orders' })
  async getAllOrders() {
    const orders = await this.ordersService.findAll();
    return {
      total: orders.length,
      orders,
    };
  }

  //Get orders by status
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

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get overall analytics summary' })
  @ApiResponse({
    status: 200,
    description: 'Sales, inventory, and payroll summary',
  })
  async getAnalyticsSummary() {
    const [orders, products, lowStock, payrollSummary] = await Promise.all([
      this.ordersService.findAll(),
      this.productsService.findAll(),
      this.inventoryService.getLowStockItems(),
      this.hrService.getPayrollSummary().catch(() => null),
    ]);

    const revenue = orders
      .filter((order) => order.status === 'delivered')
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    const avgOrderValue = orders.length > 0 ? revenue / orders.length : 0;

    return {
      sales: {
        totalRevenue: revenue,
        totalOrders: orders.length,
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
