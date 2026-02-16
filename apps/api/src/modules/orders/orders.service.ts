import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
import { OrderStatus, SubscriptionStatus } from '@sdas/shared-types';
import { RewardsService } from '../rewards/rewards.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private errorService: ErrorHandlerService,
    private rewardsService: RewardsService
  ) {}

  async create(orderData: Partial<Order>): Promise<Order> {
    const newOrder = this.ordersRepository.create(orderData);
    return this.ordersRepository.save(newOrder);
  }

  async findAll(page = 1, limit = 50): Promise<{ orders: Order[]; total: number }> {
    const [orders, total] = await this.ordersRepository.findAndCount({
      relations: ['items', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { orders, total };
  }

  async findOne(id: string): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { id },
      relations: ['items', 'user'],
    });
  }

  async findByOrderNumber(orderNumber: number): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { orderNumber },
      relations: ['items', 'user'],
    });
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByContactInfo(contactInfo: string): Promise<Order[]> {
    try {
      const user = await this.usersRepository.findOne({
        where: [{ email: contactInfo }, { phoneNumber: contactInfo }],
      });

      if (!user) return [];

      // Security: If this user has a Keycloak account, they must sign in
      // to view their orders — don't expose registered users' data to guests
      if (user.keycloakId) {
        throw new ForbiddenException(
          'This email or phone number is associated with an existing account. Please sign in to view your orders.'
        );
      }

      return this.findByUser(user.id);
    } catch (error) {
      // Re-throw ForbiddenException so it reaches the chatbot/controller
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.errorService.handleError(error, 'OrdersService.findByContactInfo');
      return [];
    }
  }

  async findByStatus(status: string): Promise<Order[]> {
    try {
      return await this.ordersRepository.find({
        where: { status },
        relations: ['items', 'user'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.errorService.handleError(error, 'OrdersService.findByStatus');
      return [];
    }
  }

  async update(id: string, updateData: Partial<Order>): Promise<Order> {
    const order = await this.findOne(id);
    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }
    await this.ordersRepository.update(id, updateData);
    return (await this.findOne(id))!;
  }

  async updateStatus(id: string, newStatus: string): Promise<Order> {
    const order = await this.findOne(id);
    if (!order) {
      throw new NotFoundException(`Order "${id}" not found`);
    }
    const previousStatus = order.status;
    order.status = newStatus;
    await this.ordersRepository.save(order);

    if (newStatus === OrderStatus.DELIVERED && previousStatus !== OrderStatus.DELIVERED) {
      const activeSub = await this.subscriptionRepository.findOne({
        where: [
          { user: { id: order.user.id }, status: SubscriptionStatus.ACTIVE },
          { user: { id: order.user.id }, status: SubscriptionStatus.TRIALING },
        ],
      });
      await this.rewardsService.earnFromPurchase(
        order.user.id,
        order.totalAmount,
        order.id,
        activeSub !== null,
      );
    }
    return order;
  }
  async cancelOrder(id: string, reason?: string): Promise<Order> {
    const order = await this.findOne(id);
    if (!order) throw new NotFoundException('Order not found');

    const nonCancellable = [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED];
    if (nonCancellable.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        `Cannot cancel an order that is already "${order.status}"`
      );
    }

    await this.ordersRepository.update(id, {
      status: OrderStatus.CANCELLED,
      cancelledReason: reason || 'Cancelled by user',
    });
    return (await this.findOne(id))!;
  }

  async getPendingOrdersCount(): Promise<number> {
    try {
      return await this.ordersRepository.count({
        where: [{ status: OrderStatus.PENDING }, { status: OrderStatus.PAID }],
      });
    } catch (error) {
      this.errorService.handleError(
        error,
        'OrdersService.getPendingOrdersCount'
      );
      return 0;
    }
  }

  async getCompletedOrders(): Promise<Order[]> {
    try {
      return await this.ordersRepository.find({
        where: { status: OrderStatus.DELIVERED },
        relations: ['items', 'user'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.errorService.handleError(
        error,
        'OrdersService.getCompletedOrders'
      );
      return [];
    }
  }
}
