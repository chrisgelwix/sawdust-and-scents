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
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { CartItem } from '@sdas/shared-types';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly checkoutService: CheckoutService,
    private readonly usersService: UsersService,
  ) {}

  /** Resolve Keycloak sub → database user ID */
  private async resolveUserId(keycloakSub: string): Promise<string> {
    const user = await this.usersService.findOrCreateByKeycloakId(keycloakSub);
    return user.id;
  }

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Return cart items' })
  async getCart(@AuthenticatedUser() user: any) {
    const userId = await this.resolveUserId(user.sub);
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async addToCart(@AuthenticatedUser() user: any, @Body() item: CartItem) {
    const userId = await this.resolveUserId(user.sub);
    return this.cartService.addToCart(userId, item);
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
    const userId = await this.resolveUserId(user.sub);
    return this.cartService.updateItemQuantity(
      userId,
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
    const userId = await this.resolveUserId(user.sub);
    return this.cartService.removeItem(userId, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@AuthenticatedUser() user: any) {
    const userId = await this.resolveUserId(user.sub);
    return this.cartService.clearCart(userId);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Process checkout' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty' })
  async checkout(@AuthenticatedUser() user: any) {
    const userId = await this.resolveUserId(user.sub);
    return this.checkoutService.checkout(userId);
  }
}
