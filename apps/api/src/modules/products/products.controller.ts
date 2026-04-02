import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  Get,
  Delete,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from 'nest-keycloak-connect';
import { Product } from './schemas/product.schema';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // ─── Public Endpoints ───

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  findAll() {
    return this.productsService.findAll();
  }

  @Public()
  @SkipThrottle()
  @Get('search')
  @ApiOperation({ summary: 'Search products by name, description or category' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Matching products' })
  async search(@Query('q') query: string) {
    return this.productsService.search(query || '');
  }

  @Public()
  @SkipThrottle()
  @Get('scents')
  @ApiOperation({ summary: 'Get all available scents' })
  @ApiResponse({ status: 200, description: 'List of distinct scent values' })
  async getScents() {
    return this.productsService.getDistinctScents();
  }

  @Public()
  @SkipThrottle()
  @Get('categories')
  @ApiOperation({ summary: 'Get all available categories' })
  @ApiResponse({ status: 200, description: 'List of distinct categories' })
  async getCategories() {
    return this.productsService.getCategories();
  }

  @Public()
  @SkipThrottle()
  @Get('scent/:scent')
  @ApiOperation({ summary: 'Get products by scent' })
  @ApiResponse({ status: 200, description: 'Products with the specified scent' })
  async findByScent(@Param('scent') scent: string) {
    return this.productsService.findByScent(scent);
  }

  @Public()
  @SkipThrottle()
  @Get('category/:category')
  @ApiOperation({ summary: 'Get products by category' })
  @ApiResponse({ status: 200, description: 'Products in the specified category' })
  async findByCategory(@Param('category') category: string) {
    return this.productsService.findByCategory(category);
  }

  @Public()
  @SkipThrottle()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiResponse({ status: 200, description: 'The product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  // ─── Admin/Worker Endpoints ───

  @Post()
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  create(@Body() productData: Partial<Product>) {
    return this.productsService.create(productData);
  }

  @Put(':id')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  update(@Param('id') id: string, @Body() updateData: Partial<Product>) {
    return this.productsService.update(id, updateData);
  }

  @Delete(':id')
  @Roles({ roles: ['realm:worker', 'realm:admin'] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a product (sets isActive to false)' })
  @ApiResponse({ status: 200, description: 'Product deactivated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string) {
    return this.productsService.softDelete(id);
  }
}
