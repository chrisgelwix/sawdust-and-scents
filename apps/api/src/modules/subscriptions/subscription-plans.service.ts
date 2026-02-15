import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan } from './schemas/subscription-plan.schema';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectModel(SubscriptionPlan.name)
    private planModel: Model<SubscriptionPlan>
  ) {}

  async findAll(): Promise<SubscriptionPlan[]> {
    return this.planModel
      .find({
        isActive: true,
      })
      .exec();
  }

  async findById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) {
      throw new NotFoundException(`Subscription plan "${id}" not found`);
    }
    return plan;
  }

  async findByUserId(userId: string): Promise<SubscriptionPlan[]> {
    const plans = await this.planModel
      .find({
        userId: userId,
      })
      .exec();
    if (!plans || plans.length === 0) {
      throw new NotFoundException(
        `No subscription plans found for user "${userId}"`
      );
    }
    return plans;
  }

  async create(planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const newPlan = new this.planModel(planData);
    return newPlan.save();
  }

  async update(
    id: string,
    updateData: Partial<SubscriptionPlan>
  ): Promise<SubscriptionPlan> {
    const plan = await this.planModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!plan) {
      throw new NotFoundException(`Subscription plan "${id}" not found`);
    }
    return plan;
  }

  async deactivate(id: string): Promise<SubscriptionPlan> {
    return this.update(id, { isActive: false });
  }
}
