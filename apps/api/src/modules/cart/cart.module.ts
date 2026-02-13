import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { CartController } from './cart.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [ProductsModule, OrdersModule],
  controllers: [CartController],
  providers: [CartService, CheckoutService],
  exports: [CartService, CheckoutService],
})
export class CartModule {}
