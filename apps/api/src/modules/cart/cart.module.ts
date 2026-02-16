import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { CartController } from './cart.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { RewardsModule } from '../rewards/rewards.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ProductsModule, OrdersModule, RewardsModule, UsersModule],
  controllers: [CartController],
  providers: [CartService, CheckoutService],
  exports: [CartService, CheckoutService],
})
export class CartModule {}
