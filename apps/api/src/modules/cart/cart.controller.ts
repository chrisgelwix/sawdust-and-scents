import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { CartItem } from '@sdas/shared-types';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly checkoutService: CheckoutService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Return cart items' })
  async getCart(@AuthenticatedUser() user: any) {
    return this.cartService.getCart(user.sub);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async addToCart(@AuthenticatedUser() user: any, @Body() item: CartItem) {
    return this.cartService.addToCart(user.sub, item);
  }

  @Put('items/:productId')
  @ApiOperation({ summary: 'Update quantity of a cart item' })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 404, description: 'Item not in cart' })
  async updateItem(
    @AuthenticatedUser() user: any,
    @Param('productId') productId: string,
    @Body() body: { quantity: number }
  ) {
    return this.cartService.updateItemQuantity(
      user.sub,
      productId,
      body.quantity
    );
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a single item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  @ApiResponse({ status: 404, description: 'Item not in cart' })
  async removeItem(
    @AuthenticatedUser() user: any,
    @Param('productId') productId: string
  ) {
    return this.cartService.removeItem(user.sub, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@AuthenticatedUser() user: any) {
    return this.cartService.clearCart(user.sub);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Process checkout' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty' })
  async checkout(@AuthenticatedUser() user: any) {
    return this.checkoutService.checkout(user.sub);
  }
}
