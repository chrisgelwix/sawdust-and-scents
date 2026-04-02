import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { ContactModule } from '../modules/contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env = (config.get<string>('NODE_ENV') ?? 'development').toLowerCase();
        const isProd = env === 'production';

        // 3 req/min was blocking basic UI navigation (category clicks, retries, etc.).
        return [
          {
            ttl: 60_000,
            limit: isProd ? 30 : 300,
          },
        ];
      },
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
    ContactModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },  // rate limiting applied globally
  ],
})
export class AppModule {}
