import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ShippingService } from './shipping.service';
import { User} from '../users/entities/user.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, User])],
  controllers: [OrdersController],
  providers: [OrdersService, ShippingService],
  exports: [OrdersService, ShippingService, TypeOrmModule],
})
export class OrdersModule {}
