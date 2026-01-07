import { 
    Controller,
    Post,
    Body,
    Put,
    Param,
    Get 
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from 'nest-keycloak-connect';
import { Product} from './schemas/product.schema';

@Controller('products')
export class ProductsController{
    constructor(private productsService: ProductsService)
    {}

    @Public()
    @Get()
    findAll() {
        return this.productsService.findAll();
    }

    @Public()
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Post()
    @Roles({ roles: ['realm:worker', 'realm:admin']})
    create(@Body() productData: Partial<Product>) {
        return this.productsService.create(productData);
    }

    @Put(':id')
    @Roles({ roles: ['realm:worker', 'realm:admin']})
    update(@Param('id') id: string, @Body() updateData: Partial<Product>) {
        return this.productsService.update(id, updateData);
    }
}