import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
      where: { user: { id: userId } },
      relations: ['items'],
    });
  }

  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['items', 'user'],
    });
  }

  async findOne(id: string): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  async update(id: string, updateData: Partial<Order>): Promise<Order> {
    await this.ordersRepository.update(id, updateData);
    return (await this.findOne(id))!;
  }

  async getPendingOrdersCount(): Promise<number> {
    try {
      const count = await this.ordersRepository.count({
        where: [{ status: 'pending' }, { status: 'processing' }],
      });
      return count;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get pending orders count: ${errorMessage}`);
    }
  }

  async findByStatus(status: string): Promise<Order[]> {
    try { 
      return await this.ordersRepository.find({
        where: {status}, 
        relations: ['items', 'user'],
        order: {createdAt: 'DESC'},
      });

    } catch(error) { 
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to find orders by status: ${errorMessage}`);
    }
  }
}
