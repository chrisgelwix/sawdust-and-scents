export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
}

export enum BillingInterval {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
}

export interface SubscriptionPlan {
  id: string;
  name: string; // e.g., "Ember Box", "Blaze Box"
  description: string;
  price: number;
  candleCount: number;
  billingInterval: BillingInterval;
  stripePriceId: string; // Stripe Price ID for recurring billing
  trialDays: number; // Free trial length in days (default: 30 → 1 month)
  minimumCommitmentMonths: number; // Minimum total months including trial
  isActive: boolean;
  features: string[]; // e.g., ["Free shipping", "Exclusive scents", "1-month free trial"]
}

export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date; // When the free trial began
  trialEnd?: Date; // When the free trial ends (≈ 30 days after start)
  minimumCommitmentEnd?: Date; // Earliest date the user can cancel (≈ 3 months after start)
  scentPreferences?: string[];
  createdAt: Date;
  cancelledAt?: Date;
}
