import {
  Entity,
  Column,
  Generated,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.orders)
  user!: User;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
  })
  items!: OrderItem[];

  @Column()
  @Generated('increment')
  orderNumber!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ default: 'pending' })
  status!: string;

  @Column({ nullable: true })
  trackingNumber?: string;

  @Column({ nullable: true })
  shippingLabelUrl?: string;

  // Shipping Address fields
  @Column({ nullable: true })
  shippingName?: string;

  @Column({ nullable: true })
  shippingStreet1?: string;

  @Column({ nullable: true })
  shippingCity?: string;

  @Column({ nullable: true })
  shippingState?: string;

  @Column({ nullable: true })
  shippingZip?: string;

  @Column({ nullable: true, default: 'US' })
  shippingCountry?: string;

  @Column({ nullable: true })
  shippingPhone?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
