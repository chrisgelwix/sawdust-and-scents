import { Injectable } from '@nestjs/common';
import { CartItem } from '@sdas/shared-types';

@Injectable()
export class CartService {
  private carts: Map<string, CartItem[]> = new Map();

  async getCart(userId: string): Promise<CartItem[]> {
    return this.carts.get(userId) || [];
  }

  async addToCart(userId: string, item: CartItem): Promise<CartItem[]> {
    const cart = await this.getCart(userId);
    const existing = cart.find((i) => i.productId === item.productId);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push(item);
    }

    this.carts.set(userId, cart);
    return cart;
  }

  async clearCart(userId: string): Promise<void> {
    this.carts.delete(userId);
  }
}
