import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { HRService } from './hr.service';

@Injectable()
export class ManagementService {
    constructor (
        private ordersService: OrdersService,
        private productsService: ProductsService,
        private hrService: HRService
    ) {}

    async getOverview() {
        const [orders, products] = await Promise.all([
            this.ordersService.findAll(),
            this.productsService.findAll()
        ])

        return {
            totalSales: orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
            orderCount: orders.length,
            prodcutCount: products.length,
            lowStockCount: products.filter(p => (p.attributes['stock'] as number) <5).length,
        };
    }

    async getLowStockAlerts() {
        const products = await this.productsService.findAll();
        return products.filter(p => (p.attributes['stock'] as number) < 10);
    }
}