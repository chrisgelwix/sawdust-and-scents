import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrdersService } from '../orders/orders.service';


import { User } from './entities/user.entity';
@Module({
    imports: [TypeOrmModule.forFeature([User])],
    exports: [TypeOrmModule],
})
export class UsersModule {}
