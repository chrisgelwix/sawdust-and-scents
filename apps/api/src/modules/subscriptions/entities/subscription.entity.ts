import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DataResult } from '@remix-run/router/dist/utils';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true })
  user!: User;

  @Column()
  planId!: string;

  @Column({ default: 'trialing' })
  status!: string;

  @Column({ nullable: true })
  stripeSubscriptionId?: string;

  @Column({ nullable: true })
  stripeCustomerId?: string;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  currentPeriodEnd?: Date;

  @Column({ type: 'timestamp', nullable: true })
  trialStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  trialEnd?: Date;

  @Column({ type: 'timestamp', nullable: true })
  minimumCommitmentEnd?: Date;

  @Column({ type: 'simple-array', nullable: true })
  scentPreferences?: string[];

  @Column({ nullable: true })
  cancelledAt?: Date;

  @Column({ nullable: true })
  pausedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
