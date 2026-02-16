import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { ProductsService } from '../products/products.service';
import { RewardsService } from '../rewards/rewards.service';
import { OrdersService } from '../orders/orders.service';
import { Order, OrderStatus } from '@sdas/shared-types';

@Injectable()
export class CheckoutService {
  constructor(
    private cartService: CartService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private rewardsService: RewardsService
  ) {}

  async checkout(userId: string, pointsToRedeem?: number): Promise<Order> {
    const cartItems = await this.cartService.getCart(userId);
    if (cartItems.length === 0) {
      throw new BadRequestException('Cannot checkout with an empty cart');
    }

    const validatedItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await this.productsService.findOne(item.productId);
        if (!product || !product.isActive) {
          throw new NotFoundException(
            `Product ${item.productId} no longer available`
          );
        }
        return {
          productId: item.productId,
          productName: product.name,
          price: product.price,
          quantity: item.quantity,
        };
      })
    );

    let totalAmount = validatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );


    // Apply points discount if requested
    let pointsDiscount = 0;
    if(pointsToRedeem && pointsToRedeem > 0) {
      const redemption = await this.rewardsService.redeem(
        userId,
        pointsToRedeem,
        totalAmount,
        'pending-order' // Will be updated with real order ID
      );
      pointsDiscount = redemption.discount;
      totalAmount -= pointsDiscount;
    }
    const order = await this.ordersService.create({
      user: { id: userId } as any,
      items: validatedItems as any,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    await this.cartService.clearCart(userId);
    return order as any as Order;
  }
}
