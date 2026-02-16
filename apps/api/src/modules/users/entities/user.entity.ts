import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { PointsTransaction } from '../../rewards/entities/points-transaction.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, nullable: true })
  keycloakId?: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true, nullable: true })
  phoneNumber?: string;

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(() => Subscription, (sub) => sub.user)
  subscriptions!: Subscription[];
  
  @OneToMany(() => PointsTransaction, (pt) => pt.user)
  pointsTransactions!: PointsTransaction[];
  @CreateDateColumn()
  createdAt!: Date;
}
