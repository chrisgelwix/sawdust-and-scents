import { Injectable, NotFoundException } from '@nestjs/common';
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

  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<CartItem[]> {
    const cart = await this.getCart(userId);
    const item = cart.find((i) => i.productId === productId);
    if (!item) {
      throw new NotFoundException(
        `Product "${productId}" not found in cart`
      );
    }
    item.quantity = quantity;
    this.carts.set(userId, cart);
    return cart;
  }

  async removeItem(userId: string, productId: string): Promise<CartItem[]> {
    const cart = await this.getCart(userId);
    const index = cart.findIndex((i) => i.productId === productId);
    if (index === -1) {
      throw new NotFoundException(
        `Product "${productId}" not found in cart`
      );
    }
    cart.splice(index, 1);
    this.carts.set(userId, cart);
    return cart;
  }

  async clearCart(userId: string): Promise<void> {
    this.carts.delete(userId);
  }
}
