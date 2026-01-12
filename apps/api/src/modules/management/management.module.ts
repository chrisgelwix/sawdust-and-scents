import { Module } from '@nestjs/common';
import { ADPService } from './adp.service';
import { KeycloakAdminService } from './keycloak-admin.service';
import { HRService } from './hr.service';
import { ManagementController } from './management.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [ProductsModule, OrdersModule],
  controllers: [ManagementController],
  providers: [ADPService, KeycloakAdminService, HRService],
  exports: [ADPService, KeycloakAdminService, HRService],
})
export class ManagementModule {}
