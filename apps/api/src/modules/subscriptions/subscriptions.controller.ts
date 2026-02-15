import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from 'nest-keycloak-connect';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private subscriptionsService: SubscriptionsService,
    private plansService: SubscriptionPlansService
  ) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of active plans' })
  async getPlans() {
    return this.plansService.findAll();
  }

  @Public()
  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a specific subscription plan' })
  async getPlan(@Param('id') id: string) {
    return this.plansService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  async subscribe(
    @AuthenticatedUser() user: any,
    @Body() body: { planId: string; scentPreferences?: string[] }
  ) {
    return this.subscriptionsService.subscribe(
      user.sub,
      body.planId,
      body.scentPreferences
    );
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my subscriptions' })
  async getMySubscriptions(@AuthenticatedUser() user: any) {
    return this.subscriptionsService.findByUser(user.sub);
  }

  @Get('me/active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my active subscription' })
  async getMyActiveSubscription(@AuthenticatedUser() user: any) {
    return this.subscriptionsService.findActiveByUser(user.sub);
  }

  @Put(':id/pause')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause my subscription' })
  async pause(@Param('id') id: string, @AuthenticatedUser() user: any) {
    return this.subscriptionsService.pause(id, user.sub);
  }

  @Put(':id/resume')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume my paused subscription' })
  async resume(@Param('id') id: string, @AuthenticatedUser() user: any) {
    return this.subscriptionsService.resume(id, user.sub);
  }

  @Put(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel my subscription' })
  async cancel(@Param('id') id: string, @AuthenticatedUser() user: any) {
    return this.subscriptionsService.cancel(id, user.sub);
  }

  @Put(':id/preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update scent preferences for my subscription' })
  async updatePreferences(
    @Param('id') id: string,
    @AuthenticatedUser() user: any,
    @Body() body: { scentPreferences: string[] }
  ) {
    return this.subscriptionsService.updatePreferences(
      id,
      user.sub,
      body.scentPreferences
    );
  }

  // ─── Admin: Manage Plans ───

  @Post('plans')
  @ApiBearerAuth()
  @Roles({ roles: ['realm:admin'] })
  @ApiOperation({ summary: 'Create a new subscription plan (Admin)' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  async createPlan(@Body() planData: any) {
    return this.plansService.create(planData);
  }

  @Put('plans/:id')
  @ApiBearerAuth()
  @Roles({ roles: ['realm:admin'] })
  @ApiOperation({ summary: 'Update a subscription plan (Admin)' })
  async updatePlan(@Param('id') id: string, @Body() updateData: any) {
    return this.plansService.update(id, updateData);
  }
}
