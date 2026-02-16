/**
 * Ember Rewards Program Configuration.....
 *
 * This lists all the rewards rules in one place. In the future, these could
 * come from a database table or admin UI for dynamic configuration.
 */

export const REWARDS_CONFIG = {
    // Earning Rules
    earning: {
        /** Points earned per $1 spent on orders */
        pointsPerDollar: 10,

        /** Multiplier for subscribers (e.g., 2x = subscribers earn double) */
        subscriberMultiplier: 2,

        /** One-time bonus when a new user creates an account */
        signupBonus: 500,

        /** Bonus for referring a new customer who places an order */
        referralBonus: 1000,
    }, 
    // Redemption Rules
    redemption: {
        /** How many points equal $1 in discount */
        pointsPerDollar: 100,

        /** Minimum points that can be redeemed at once */
        minimumRedemption: 500,

        /** Maximum discount percentage allowed per order (e.g., 50%) */
        maxDiscountPercent: 50, 
    },
    // Expiration Rules
    expiration: {
        /** Points expire after this many months of account inactivity */
        inactivityMonths: 12,
    },
}