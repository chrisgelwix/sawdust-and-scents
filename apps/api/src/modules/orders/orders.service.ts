import { Injectable } from '@nestjs/common';
import {InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>
    ) {}

    async create(orderData: Partial<Order>): Promise<Order> {
        const newOrder = this.ordersRepository.create(orderData);
        return this.ordersRepository.save(newOrder);
    }
    
    async findByUser(userId: string): Promise<Order[]> {
        return this.ordersRepository.find({ 
            where: { user: { id: userId}}, 
            relations: ['items'],
        });
    }
}