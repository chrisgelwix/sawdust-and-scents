import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SubscriptionPlan extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  candleCount!: number;

  @Prop({
    required: true,
    enum: ['monthly', 'quarterly', 'semi_annually', 'annually'],
    default: 'monthly',
  })
  billingInterval!: string;

  @Prop({ required: true })
  stripePriceId!: string;

  @Prop({ default: 30 })
  trialDays!: number;

  @Prop({ default: 3 })
  minimumCommitmentMonths!: number;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: [String], default: [] })
  features!: string[];

  @Prop({ type: [String], default: [] })
  includedCategories!: string[];
}

export const SubscriptionPlanSchema =
  SchemaFactory.createForClass(SubscriptionPlan);
