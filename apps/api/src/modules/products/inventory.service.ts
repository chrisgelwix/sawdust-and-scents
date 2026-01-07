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
}
