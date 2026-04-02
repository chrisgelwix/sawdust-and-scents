import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productModel.findById(id).exec();
  }

  async create(productData: Partial<Product>): Promise<Product> {
    const newProduct = new this.productModel(productData);
    return newProduct.save();
  }

  async update(
    id: string,
    updateData: Partial<Product>
  ): Promise<Product | null> {
    return this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async softDelete(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product "${id}" not found`);
    }
    product.isActive = false;
    return product.save();
  }

  async findByAttribute(key: string, value: any): Promise<Product[]> {
    const query = { [`attributes.${key}`]: value };
    return this.productModel.find(query).exec();
  }

  async findByScent(scent: string): Promise<Product[]> {
    const query = { 'attributes.scent': scent, isActive: true };
    return this.productModel.find(query).exec();
  }

  async getDistinctScents(): Promise<string[]> {
    return this.productModel.distinct('attributes.scent').exec() as Promise<
      string[]
    >;
  }

  async findByCategory(category: string): Promise<Product[]> {
    const raw = (category ?? '').trim();
    if (!raw) return [];

    // Allow matching both slugified and human-readable categories.
    // Example: "wood-signs" should match "wood signs", "Wood Signs", "wood-signs", etc.
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const slugFlexible = escapeRegex(raw).replace(/\\-+/g, '[-\\s]+');
    const spacedFlexible = escapeRegex(raw.replace(/-+/g, ' ')).replace(/\s+/g, '[-\\s]+');
    const pattern = `^(?:${slugFlexible}|${spacedFlexible})$`;
    const categoryRegex = new RegExp(pattern, 'i');

    return this.productModel.find({ category: categoryRegex, isActive: true }).exec();
  }

  async search(query: string): Promise<Product[]> {
    const regex = new RegExp(query, 'i');
    return this.productModel
      .find({
        isActive: true,
        $or: [
          { name: regex },
          { description: regex },
          { category: regex },
        ],
      })
      .exec();
  }

  async getCategories(): Promise<string[]> {
    return this.productModel.distinct('category').exec() as Promise<string[]>;
  }
}
