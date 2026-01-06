import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [
        ProductsModule,
        OrdersModule
    ],
    providers: [
        CartService, 
        CheckoutService
    ],
    exports: [
        CartService,
        CheckoutService
    ]
})
export class CartModule {}
