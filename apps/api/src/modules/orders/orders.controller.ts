import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ShippingService } from './shipping.service';
import { Roles } from 'nest-keycloak-connect';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shippingService: ShippingService
  ) {}

  @Public()
  @Get()
  async findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id/rates')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  async getRates(@Param('id') id: string) {
    const order = await this.ordersService.findOne(id);
    return this.shippingService.createShipment(order);
  }

  @Post(':id/label')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  async purchaseLabel(@Param('id') id: string, @Body('rateId') rateId: string) {
    const transaction = await this.shippingService.purchaseLabel(rateId);

    await this.ordersService.update(id, {
      trackingNumber: transaction.tracking_number,
      shippingLabelUrl: transaction.label_url,
      status: 'Shipped',
    });

    return transaction;
  }
}
