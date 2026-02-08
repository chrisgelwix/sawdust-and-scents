import { Module } from '@nestjs/common';
import { ADPService } from './adp.service';
import { KeycloakAdminService } from './keycloak-admin.service';
import { HRService } from './hr.service';
import { ManagementController } from './management.controller';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { ManagementService } from './management.service';

@Module({
  imports: [ProductsModule, OrdersModule],
  controllers: [ManagementController],
  providers: [ADPService, KeycloakAdminService, HRService, ManagementService],
  exports: [ADPService, KeycloakAdminService, HRService, ManagementService],
})
export class ManagementModule {}
