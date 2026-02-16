import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('points_transactions')
@Index(['user', 'createdAt']) // Fast lookups for user's transaction history
export class PointsTransaction {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, { eager: false})
    user!: User;

    @Column()
    type!: string;
    // purchase_earn, subscription_earn, signup_bonus,

    @Column({ type: 'integer'})
    points!: number; // Positive = earn, Negative = spend

    @Column()
    description!: string;

    @Column({ nullable: true })
    referenceId?: string; // Links to orderId, subscriptionId, etc.

    @CreateDateColumn()
    createdAt!: Date;
}