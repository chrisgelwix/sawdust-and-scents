import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [ ProductsModule, OrdersModule ],
    controllers: [ ChatbotController ],
    providers: [ ChatbotService ],
})
export class ChatbotModule {}