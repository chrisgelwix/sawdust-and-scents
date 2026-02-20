import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiQuery,
} from '@nestjs/swagger';
import { BaseController } from '../common/controllers/base.controller';
import { RewardsService } from './rewards.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../auth/decorators/user.decorator';
import { Roles } from 'nest-keycloak-connect';

@ApiTags('rewards')
@ApiBearerAuth()
@Controller('rewards')
export class RewardsController extends BaseController {
    constructor(
        private rewardsService: RewardsService,
        usersService: UsersService,
    ) {
        super(usersService);
    }

    // ─── User: My Rewards ───
    @Get('me')
    @ApiOperation({ summary: 'Get my rewards account summary' })
    @ApiResponse({ status: 200, description: 'Balance, lifetime earned/redeemed' })
    async getMyAccount(@AuthenticatedUser() user: any) {
        const userId = await this.resolveUserId(user.sub);
        return this.rewardsService.getAccount(userId);
    }

    @Get('me/balance')
    @ApiOperation({ summary: 'Get my current points balance' })
    async getMyBalance(@AuthenticatedUser() user: any) {
        const userId = await this.resolveUserId(user.sub);
        return this.rewardsService.getBalance(userId);
    }

    @Get('me/history')
    @ApiOperation({ summary: 'Get my points transaction history' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getMyHistory(
        @AuthenticatedUser() user: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string
    ) {
        const userId = await this.resolveUserId(user.sub);
        return this.rewardsService.getHistory(
            userId,
            parseInt(page || '1', 10),
            parseInt(limit || '20', 10)
        )
    }

    @Post('redeem')
    @ApiOperation({ summary: 'Redeem points for a discount on an order' })
    @ApiResponse({ status: 201, description: 'Discount amount and transaction' })
    async redeem(
        @AuthenticatedUser() user: any,
        @Body()
        body: {
            pointsToRedeem: number;
            orderTotal: number;
            orderId: string;
        }
    ) {
        const userId = await this.resolveUserId(user.sub);
        return this.rewardsService.redeem(
            userId,
            body.pointsToRedeem,
            body.orderTotal,
            body.orderId
        );
    }

    // ─── Admin: System Management ───
    @Get('admin/liability')
    @Roles({ roles: ['realm:admin'] })
    @ApiOperation({ summary: 'Get total points liability (Admin)' })
    async getLiability() {
        return this.rewardsService.getTotalLiability()
    }

    @Post('admin/adjust')
    @Roles({ roles: ['realm:admin']})
    @ApiOperation({ summary: 'Manually adjust a user\'s points (Admin)' })
    async adminAdjust(
        @AuthenticatedUser() admin: any,
        @Body()
        body: {
            userId: string;
            points: number;
            reason: string;
        }
    ) {
        return this.rewardsService.adminAdjust(
            body.userId,
            body.points,
            body.reason,
            admin.sub
        );
    }
}