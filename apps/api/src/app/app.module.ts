import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../modules/auth/auth.module';
import { ProductsModule } from '../modules/products/products.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { CartModule } from '../modules/cart/cart.module';
import { ChatbotModule } from '../modules/chatbot/chatbot.module';
import { UsersModule } from '../modules/users/users.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { DatabaseModule } from '../modules/database/database.module';
import { ManagementModule } from '../modules/management/management.module';
import { CommonModule } from '../modules/common/common.module';
import { RewardsModule } from '../modules/rewards/rewards.module';
import { SubscriptionsModule } from '../modules/subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),
    CommonModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    CartModule,
    ChatbotModule,
    UsersModule,
    PaymentsModule,
    DatabaseModule,
    ManagementModule,
    RewardsModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
