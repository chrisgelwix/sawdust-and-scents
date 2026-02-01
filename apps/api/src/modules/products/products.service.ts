import { Injectable } from '@nestjs/common';
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
        return this.productModel.findById(id).exec()
    }

    async create(productData: Partial<Product>): Promise<Product> {
        const newProduct = new this.productModel(productData);
        return newProduct.save();
    }

    async update(id: string, updateData: Partial<Product>): Promise<Product | null> {
        return this.productModel.findByIdAndUpdate(id, updateData, {new: true}).exec();
    }

    async findByAttribute(key: string, value: any): Promise<Product[]> {
        const query = { [`attributes.${key}`]: value };
        return this.productModel.find(query).exec();
    }

    async findByScent(scent: string): Promise<Product[]> {
        const query = { 'attributes.scent': scent };
        return this.productModel.find(query).exec();
    }

    async getDistinctScents(): Promise<string[]> {
        return this.productModel.distinct('attributes.scent').exec() as Promise<string[]>;
    }
}