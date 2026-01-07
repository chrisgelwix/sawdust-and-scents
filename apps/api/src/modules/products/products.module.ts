import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { InventoryService } from './inventory.service';
import { Product, ProductSchema } from './schemas/product.schema';
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Product.name, schema: ProductSchema }
        ])
    ], 
    controllers: [ProductsController],
    providers: [ProductsService, InventoryService],
    exports: [ProductsService, InventoryService,MongooseModule]
})
export class ProductsModule {}
