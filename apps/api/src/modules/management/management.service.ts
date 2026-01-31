import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ManagementService {
    constructor (
        private ordersService: OrdersService,
        private productsService: ProductsService
    ) {}

    async getOverview() {
        const orders = await this.ordersService.findAll();
        const products = await this.productsService.findAll();

        return {
            totalOrders: orders.length,
            totalRevenue: orders.reduce((acc, order) => acc + Number(order.totalAmount), 0),
            lowStockCount: products.filter(p => (p.attributes['stock'] as number) <10).length,
        };
    }

    async getLowStockAlerts() {
        const products = await this.productsService.findAll();
        return products.filter(p => (p.attributes['stock'] as number) < 10);
    }
}