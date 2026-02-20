import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { BaseController } from '../common/controllers/base.controller';
import { OrdersService } from './orders.service';
import { ShippingService } from './shipping.service';
import { UsersService } from '../users/users.service';
import { Roles } from 'nest-keycloak-connect';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { OrderStatus } from '@sdas/shared-types';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController extends BaseController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shippingService: ShippingService,
    usersService: UsersService,
  ) {
    super(usersService);
  }

  // ─── User Endpoints ───

  @Get('me')
  @ApiOperation({ summary: 'Get my orders' })
  @ApiResponse({ status: 200, description: 'List of orders for the current user' })
  async getMyOrders(@AuthenticatedUser() user: any) {
    const userId = await this.resolveUserId(user.sub);
    return this.ordersService.findByUser(userId);
  }

  // ─── Admin/Worker Endpoints ───

  @Get()
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Get all orders (admin/worker)' })
  @ApiResponse({ status: 200, description: 'Paginated list of all orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.ordersService.findAll(
      parseInt(page || '1', 10),
      parseInt(limit || '50', 10)
    );
  }

  @Get('status/:status')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Get orders filtered by status' })
  @ApiResponse({ status: 200, description: 'Orders filtered by status' })
  async findByStatus(@Param('status') status: string) {
    const orders = await this.ordersService.findByStatus(status);
    return { status, count: orders.length, orders };
  }

  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Get an order by order number' })
  @ApiResponse({ status: 200, description: 'The order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.findByOrderNumber(
      parseInt(orderNumber, 10)
    );
    if (!order) {
      throw new NotFoundException(
        `Order #${orderNumber} not found`
      );
    }
    return order;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiResponse({ status: 200, description: 'The order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }
    return order;
  }

  @Put(':id')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Update an order (admin/worker)' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  async update(@Param('id') id: string, @Body() updateData: any) {
    return this.ordersService.update(id, updateData);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 201, description: 'Order cancelled' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    return this.ordersService.cancelOrder(id, body?.reason);
  }

  // ─── Shipping Endpoints ───

  @Get(':id/rates')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Get shipping rates for an order' })
  async getRates(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }
    return this.shippingService.createShipment(order);
  }

  @Post(':id/label')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiOperation({ summary: 'Purchase a shipping label for an order' })
  async purchaseLabel(
    @Param('id') id: string,
    @Body() body: { rateId: string; carrier?: string }
  ) {
    const transaction = await this.shippingService.purchaseLabel(body.rateId);

    await this.ordersService.update(id, {
      trackingNumber: transaction.tracking_number,
      shippingLabelUrl: transaction.label_url,
      shippingCarrier: body.carrier,
      status: OrderStatus.SHIPPED,
    });

    return transaction;
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get tracking status for a shipped order' })
  @ApiResponse({ status: 200, description: 'Tracking information' })
  @ApiResponse({ status: 404, description: 'Order not found or not shipped' })
  async getTracking(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }
    if (!order.trackingNumber) {
      throw new NotFoundException(
        `Order "${id}" does not have a tracking number yet`
      );
    }

    const carrier = order.shippingCarrier || 'usps';
    return this.shippingService.getTrackingStatus(
      carrier,
      order.trackingNumber
    );
  }
}
