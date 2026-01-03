import {
    Entity,
    Column,
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
        cascade: true
    })
    items!: OrderItem[];

    @Column({ type: 'decimal', precision: 10, scale: 2})
    totalAmount!: number;

    @Column({ default: 'pending' })
    status!: string;

    @CreateDateColumn()
    createdAt!: Date;
}

