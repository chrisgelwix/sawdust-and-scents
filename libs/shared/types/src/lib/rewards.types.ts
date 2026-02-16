export enum PointsTransactionType {
    PURCHASE_EARN = 'purchase_earn', // Earned from placing an order
    SUBSCRIPTION_EARN = 'subscription_earn', // Monthly bonus for subscribers
    SIGNUP_BONUS = 'signup_bonus', // One-time bonus for new accounts
    REFERRAL_BONUS = 'referral_bonus', // Earned from referring a friend
    REDEMPTION = 'redemption', // Spent on an order discount
    REFUND_ADJUSTMENT = 'refund_adjustment', // Points returned after order refund
    EXPIRATION = 'expiration', // Points expired due to inactivity
    ADMIN_ADJUSTMENT = 'admin_adjustment', // Manual adjustment by admin
}

export interface PointsTransaction {
    id: string;
    userId: string;
    type: PointsTransactionType;
    points: number;         // Positive for earning, negative for spending
    description: string;    // Human-readable reason
    referenceId?: string;   // Order ID, subscription ID, etc.
    createdAt: Date;
}

export interface RewardsAccount {
    userId: string;
    currentBalance: number;  // Derived from transaction ledger
    lifetimeEarned: number;
    lifetimeRedeemed: number;
}