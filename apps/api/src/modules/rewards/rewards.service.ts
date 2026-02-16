import {
    Injectable,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointsTransaction } from './entities/points-transaction.entity';
import { REWARDS_CONFIG } from './rewards.config';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
import { PointsTransactionType } from '@sdas/shared-types';

@Injectable()
export class RewardsService {
    private readonly logger = new Logger(RewardsService.name);

    constructor(
        @InjectRepository(PointsTransaction)
        private transactionRepository: Repository<PointsTransaction>,
        private errorService: ErrorHandlerService,
    ) {}

    // Balance & History
    /**
     * Get the current points balance for a user.
     * Calculated by summing all ledger entries.
     */
    async getBalance(userId: string): Promise<number> {
        const result = await this.transactionRepository.createQueryBuilder('pt')
        .select('SUM(pt.points)', 'balance')
        .where('pt.userId = :userId', { userId})
        .getRawOne();

        return parseInt(result?.balance || '0', 10);
    }

    /**
     * Get a full rewards account summary for a user.
     * Includes current balance, lifetime earned, and lifetime redeemed.
     */
    async getAccount(userId: string): Promise<{
        currentBalance: number;
        lifetimeEarned: number;
        lifetimeRedeemed: number;
    }> {
        const [ 
            balance,
            earned,
            redeemed 
        ] = await Promise.all([
            this.getBalance(userId),
            this.getLifetimeEarned(userId),
            this.getLifetimeRedeemed(userId),
        ]);

        return {
            currentBalance: balance,
            lifetimeEarned: earned,
            lifetimeRedeemed: redeemed,
        };
    }

    /**
     * Get paginated transaction history for a user.
     * Includes all types of transactions (earn, spend, etc.).
     */
    async getHistory(
        userId: string,
        page = 1,
        limit = 20
    ): Promise<{
        transactions: PointsTransaction[];
        total: number;
    }> {
        const [transactions, total] = await this.transactionRepository.findAndCount({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { transactions, total };
    };

    // Earning Points
    /**
     * Award points for a completed purchase.
     * Called when an order status changes to 'delivered'.
     * @param userId - The user who placed the order
     * @param orderTotal - The total dollar amount of the order
     * @param orderId - Reference to the order
     * @param isSubscriber - Whether user has an active subscription (earns bonus)
     */

    async earnFromPurchase(userId: string,
        orderTotal: number, 
        orderId: string,
        isSubscriber = false): Promise<PointsTransaction> {
            const { pointsPerDollar, subscriberMultiplier } = REWARDS_CONFIG.earning;

            let points = Math.floor(orderTotal * pointsPerDollar);
            let description = `Earned ${points} points from order`;

            if(isSubscriber) {
                points = Math.floor(points * subscriberMultiplier);
                description += ` ($subscriberMultiplier}x subscriber bonus!)`;
            }

            return this.createTransaction(
                userId,
                PointsTransactionType.PURCHASE_EARN,
                points,
                description,
                orderId
            );
        }

        /**
         * Award the one-time sign-up bonus.
         * Called when a new user creates an account.
         * @param userId - The user who created the account
         * @returns The points transaction
         * @throws If the signup bonus was already awarded
         */
    async awardSignupBonus(userId: string): Promise<PointsTransaction> {
        const existing = await this.transactionRepository.findOne({ 
            where: {user: {id: userId}, type: PointsTransactionType.SIGNUP_BONUS}, 
        });

        if(existing) {
            this.logger.warn(`Signup bonus already awarded for user ${userId}`);
            return existing;
        }

        return this.createTransaction(
            userId,
            PointsTransactionType.SIGNUP_BONUS,
            REWARDS_CONFIG.earning.signupBonus,
            'Welcome to Ember Rewards! Here\'s your signup bonus!'
        );
    }

    /**
     * Award bonus for a monthly subscription renewal.
     * Called when a user renews their subscription.
     */
    async earnFromSubscription(
        userId: string,
        subscriptionId: string,
        planPrice: number
    ): Promise<PointsTransaction> {
        const points = Math.floor(
            planPrice * REWARDS_CONFIG.earning.pointsPerDollar 
                * REWARDS_CONFIG.earning.subscriberMultiplier
        );

        return this.createTransaction(
            userId,
            PointsTransactionType.SUBSCRIPTION_EARN,
            points,
            `Monthly subscription points (${REWARDS_CONFIG.earning.subscriberMultiplier}x bonus)`,
            subscriptionId
        );
    }


    // Redeeming Points

    /**
     * Redeem points for a discount on an order.
     * Returns the dollar discount amount.
     */
    async redeem(
        userId: string,
        pointsToRedeem: number,
        orderTotal: number,
        orderId: string
    ): Promise<{ discount: number, transaction: PointsTransaction}> {
        const { pointsPerDollar, minimumRedemption, maxDiscountPercent } = REWARDS_CONFIG.redemption;

        if(pointsToRedeem < minimumRedemption) {
            throw new BadRequestException(`Minimum redemption is ${minimumRedemption} points`);
        }

        const balance = await this.getBalance(userId);
        if(balance < pointsToRedeem) {
            throw new BadRequestException(`Insufficient points. You have ${balance} points tried to redeem ${pointsToRedeem} points.`);
        }

        let discount = pointsToRedeem / pointsPerDollar;

        const maxDiscount = orderTotal * (maxDiscountPercent / 100);
        if (discount > maxDiscount) {
            discount = maxDiscount;
            pointsToRedeem = Math.ceil(discount * pointsPerDollar);
        }

        const transaction = await this.createTransaction(
            userId,
            PointsTransactionType.REDEMPTION,
            -pointsToRedeem,
            `Redeemed ${pointsToRedeem} points for $${discount.toFixed(2)} discount`,
            orderId
        );

        return { discount: Math.round(discount * 100) / 100, transaction };
    }

    /**
     * Reverse a redemption (e.g., if the order is cancelled/refunded).
     */
    async refundPoints(
        userId: string,
        pointsToRefund: number,
        orderId: string
    ): Promise<PointsTransaction> {
        return this.createTransaction(
            userId,
            PointsTransactionType.REFUND_ADJUSTMENT,
            pointsToRefund,
            `${pointsToRefund > 0 ? '+' : '-'}${Math.abs(pointsToRefund)} points restored from order refund`,
            orderId
        );
    }


    // Admin 
    /**
     * Manually adjust a user's points (with reason).
     */
    async adminAdjust( 
        userId: string,
        points: number,
        reason: string,
        adminId: string
    ): Promise<PointsTransaction> {
        return this.createTransaction(
            userId,
            PointsTransactionType.ADMIN_ADJUSTMENT,
            points,
            `Admin adjustment by ${adminId}: ${reason}`
        );
    }

    /**
     * Get total points liability across all users.
     */
    async getTotalLiability(): Promise<{ totalOutstanding: number, dollarValue: number }> {
        const result = await this.transactionRepository.createQueryBuilder('pt')
            .select('SUM(pt.points)', 'total')
            .getRawOne();

        const totalOutstanding = parseInt(result?.total || '0', 10);
        const dollarValue = totalOutstanding / REWARDS_CONFIG.redemption.pointsPerDollar; 

        return { totalOutstanding, dollarValue: Math.round(dollarValue * 100) / 100 };
    }







    // Private Helper Methods
    private async createTransaction(
        userId: string,
        type: PointsTransactionType,
        points: number,
        description: string,
        referenceId?: string
    ): Promise<PointsTransaction> {
        try {
            const transaction = this.transactionRepository.create({
                user: { id: userId } as any,
                type,
                points,
                description,
                referenceId,
            });
            const saved = await this.transactionRepository.save(transaction);
            this.logger.log(`[$type] ${points > 0 ? '+' : ''}${points} points for user ${userId}`);
            return saved;
        } catch (error) {
            this.errorService.handleError(error, 'RewardsService.createTransaction');
        }
    }

    private async getLifetimeEarned(userId: string): Promise<number> {
        const result = await this.transactionRepository.createQueryBuilder('pt')
            .select('SUM(pt.points)', 'earned_total')
            .where('pt.userId = :userId AND pt.points > 0', {userId})
            .getRawOne();
        return parseInt(result?.earned_total || '0', 10);
    }

    private async getLifetimeRedeemed(userId: string): Promise<number> {
        const result = await this.transactionRepository.createQueryBuilder('pt')
            .select('SUM(ABS(pt.points))', 'redeemed_total')
            .where('pt.userId = :userId AND pt.type = :type', { userId, type: PointsTransactionType.REDEMPTION})
            .getRawOne();
        return parseInt(result?.redeemed_total || '0', 10);
    }
}