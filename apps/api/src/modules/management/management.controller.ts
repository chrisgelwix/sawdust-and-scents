import { Controller, Get, Post, UseGuards} from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';
import {HRService} from './hr.service';
import { InventoryService} from '../products/inventory.service';
import { OrdersService } from '../orders/orders.service';

@Controller('management')
@Roles({ roles: ['realm: admin'] })
export class ManagementController {
    constructor(
        private hrService: HRService,
        private inventoryService: InventoryService,
        private ordersService: OrdersService
    ) {}

    /**
     * Get dashboard overview with aggregated data from multiple sources
     */
    @Get('dashboard/overview')
    async getOverview() {
        // Aggregate data from MongoDB, PostgreSQL, and ADP API
        const[lowStock, pendingOrders, payrollStatus] = await Promise.all([
            this.inventoryService.getLowStockItems(),
            this.ordersService.getPendingOrdersCount(),
            this.hrService.getPayrollSummary().catch(() => null),
        ]);

        return {
            inventory: {
                lowStockIems: lowStock,
            },
            orders: {
                pendingCount: pendingOrders,
            }, 
            payroll: payrollStatus,
            timeStamp: new Date().toISOString(),
        };
    }

    @Post('employees/sync')
    async syncEmployees() {
        const result = await this.hrService.syncEmployees();

        return {
            message: 'Employee sync completed',
            stats: result,
        };
    }
}