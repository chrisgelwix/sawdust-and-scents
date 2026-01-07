import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items)
  order!: Order;

  @Column()
  productId!: string; // Reference to MongoDB Product ID

  @Column()
  productName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column()
  quantity!: number;
}


