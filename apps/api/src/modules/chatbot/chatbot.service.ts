import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';


@Injectable()
export class ChatbotService {
    constructor(
        private productsService: ProductsService,
        private ordersService: OrdersService,
    ) {}

    async processMessage(text: string, userId?: string) {
        const input = text.toLowerCase();

        // Check for order status/delivery
        if ((input.includes('order') || input.includes('delivery') || input.includes('status')) && userId) {
            const orders = await this.ordersService.findByUser(userId);
            if (orders.length === 0) {
                return { reply: "I couldn't find any orders for your account." };
            }
            
            // Get the most recent order
            const latestOrder = orders.sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];

            let statusMessage = `Your most recent order (#${latestOrder.orderNumber}) is currently ${latestOrder.status}.`;
            if (latestOrder.trackingNumber) {
                statusMessage += ` Your tracking number is ${latestOrder.trackingNumber}.`;
            }
            return { reply: statusMessage };
        }
        
        // Check for candle scents
        if (input.includes('candle') && (input.includes('scent') || input.includes('smell'))) {
            const scents = ['sandalwood', 'pine', 'vanilla', 'lavender']; // Default list or extracted from query
            const requestedScent = scents.find(s => input.includes(s));
            
            if (requestedScent) {
                const products = await this.productsService.findByAttribute('scent', requestedScent);
                if (products.length > 0) {
                    return { reply: `I found ${products.length} ${requestedScent} scented candles! Our ${products[0].name} is a popular choice.` };
                }
            }
            return { reply: "We have several scented candles available! Are you looking for something woody like Sandalwood or fresh like Pine?" };
        }

        if (input.includes('candle')) {
            return { reply: "We have a variety of hand-poured candles. Most are approximately 4 inches wide and 5 inches tall, but sizes vary by collection." };
        }

        return { reply: "I'm Rowan! I can help you with order status or product questions." };
    }

    async getHistory(userId: string) {
        return [{ role: 'assistant', text: 'Hello! How can I help you today?'}];
    
    }
}
