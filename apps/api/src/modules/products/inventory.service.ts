import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<Product>
  ) {}

  async updateStock(
    productId: string,
    quantityChange: number
  ): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const currentStock = (product.attributes['stock'] as number) || 0;
    if (currentStock + quantityChange < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    return (await this.productModel
      .findByIdAndUpdate(
        productId,
        { $inc: { 'attributes.stock': quantityChange } },
        { new: true }
      )
      .exec())!;
  }

  /**
   * Get all products with low stock levels
   *
   * A product is considered "low stock" if:
   * 1. It has a lowStockThreshold defined in attributes
   * 2. Current stock is below or equal to that threshold
   *
   * @returns {Promise<Product[]>} Array of products with low stock
   */
  async getLowStockItems(): Promise<Product[]> {
    try {
      // Find all active products
      const products = await this.productModel.find({ isActive: true }).exec();

      // Filter products where stock <= threshold
      const lowStockProducts = products.filter((product) => {
        const stock = (product.attributes['stock'] as number) || 0;
        const threshold =
          (product.attributes['lowStockThreshold'] as number) || 10;
        return stock <= threshold;
      });

      return lowStockProducts;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch low stock items: ${errorMessage}`);
    }
  }
}
