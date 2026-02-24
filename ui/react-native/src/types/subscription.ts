/**
 * Subscription Types for Cedros Pay
 *
 * Supports both Stripe (redirect-based) and x402 (crypto) subscriptions.
 */

import type { X402Requirement, PaymentResult } from './index';

/**
 * Subscription billing interval
 */
export type BillingInterval = 'weekly' | 'monthly' | 'yearly' | 'custom';

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'expired';

/**
 * Request to create a Stripe subscription session
 */
export interface SubscriptionSessionRequest {
  /** Resource/plan ID for the subscription */
  resource: string;
  /** Billing interval */
  interval: BillingInterval;
  /** Custom interval in days (only used when interval is 'custom') */
  intervalDays?: number;
  /** Number of trial days (0 for no trial) */
  trialDays?: number;
  /** Customer email (pre-fills Stripe checkout) */
  customerEmail?: string;
  /** Metadata for tracking */
  metadata?: Record<string, string>;
  /** Coupon code for discount */
  couponCode?: string;
  /** URL to redirect on success */
  successUrl?: string;
  /** URL to redirect on cancel */
  cancelUrl?: string;
}

/**
 * Response from subscription session creation
 */
export interface SubscriptionSessionResponse {
  /** Stripe checkout session ID */
  sessionId: string;
  /** Stripe checkout URL */
  url: string;
}

/**
 * Request to check subscription status
 */
export interface SubscriptionStatusRequest {
  /** Resource/plan ID */
  resource: string;
  /** User identifier (wallet address for crypto, email/customer ID for Stripe) */
  userId: string;
}

/**
 * Response from subscription status check
 */
export interface SubscriptionStatusResponse {
  /** Whether subscription is currently active */
  active: boolean;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Subscription expiry timestamp (ISO 8601) */
  expiresAt?: string;
  /** Current billing period end timestamp (ISO 8601) */
  currentPeriodEnd?: string;
  /** Billing interval */
  interval?: BillingInterval;
  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd?: boolean;
}

/**
 * x402 subscription quote
 * Extends standard X402Requirement with subscription-specific details
 */
export interface SubscriptionQuote {
  /** Standard x402 payment requirement */
  requirement: X402Requirement;
  /** Subscription-specific details */
  subscription: {
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (for 'custom' interval) */
    intervalDays?: number;
    /** Duration in seconds this payment covers */
    durationSeconds: number;
    /** When the subscription period starts (ISO 8601) */
    periodStart: string;
    /** When the subscription period ends (ISO 8601) */
    periodEnd: string;
  };
}

/**
 * Subscription payment state
 */
export interface SubscriptionState {
  /** Current state of the subscription flow */
  status: 'idle' | 'loading' | 'checking' | 'success' | 'error';
  /** Error message if status is 'error' */
  error: string | null;
  /** Stripe checkout session ID (for redirect flow) */
  sessionId: string | null;
  /** Subscription status after verification */
  subscriptionStatus: SubscriptionStatus | null;
  /** When subscription expires (ISO 8601) */
  expiresAt: string | null;
}

/**
 * Subscription payment result
 * Extends PaymentResult with subscription-specific fields
 */
export interface SubscriptionPaymentResult extends PaymentResult {
  /** Subscription status after payment */
  subscriptionStatus?: SubscriptionStatus;
  /** New expiry date after payment (ISO 8601) */
  expiresAt?: string;
  /** Current billing period end (ISO 8601) */
  currentPeriodEnd?: string;
}

/**
 * Request to cancel a subscription
 */
export interface CancelSubscriptionRequest {
  /** Resource/plan ID */
  resource: string;
  /** User identifier (wallet address for crypto, email/customer ID for Stripe) */
  userId: string;
  /** Whether to cancel immediately or at period end (default: at period end) */
  immediate?: boolean;
}

/**
 * Response from subscription cancellation
 */
export interface CancelSubscriptionResponse {
  /** Whether cancellation was successful */
  success: boolean;
  /** Updated subscription status */
  status: SubscriptionStatus;
  /** When the subscription will end (ISO 8601) */
  endsAt?: string;
  /** Error message if cancellation failed */
  error?: string;
}

/**
 * Request for Stripe billing portal
 */
export interface BillingPortalRequest {
  /** User identifier (email or Stripe customer ID) */
  userId: string;
  /** URL to return to after portal session */
  returnUrl?: string;
}

/**
 * Response from billing portal request
 */
export interface BillingPortalResponse {
  /** Stripe billing portal URL */
  url: string;
}

/**
 * Request to activate x402 subscription after payment verification
 */
export interface ActivateX402SubscriptionRequest {
  /** Resource/plan ID */
  resource: string;
  /** User wallet address (base58) */
  walletAddress: string;
  /** Transaction signature from x402 payment */
  transactionSignature: string;
  /** Billing interval */
  interval: BillingInterval;
  /** Custom interval in days (for 'custom' interval) */
  intervalDays?: number;
}

/**
 * Response from x402 subscription activation
 */
export interface ActivateX402SubscriptionResponse {
  /** Whether activation was successful */
  success: boolean;
  /** Subscription status after activation */
  status: SubscriptionStatus;
  /** When subscription period starts (ISO 8601) */
  periodStart: string;
  /** When subscription period ends (ISO 8601) */
  periodEnd: string;
  /** Error message if activation failed */
  error?: string;
}

/**
 * Proration behavior when changing subscriptions
 */
export type ProrationBehavior =
  | 'create_prorations'      // Create prorated invoice items (default)
  | 'none'                   // No proration - start new price at next billing cycle
  | 'always_invoice';        // Invoice immediately for the change

/**
 * Request to change subscription plan (upgrade/downgrade)
 */
export interface ChangeSubscriptionRequest {
  /** Current resource/plan ID */
  currentResource: string;
  /** New resource/plan ID to change to */
  newResource: string;
  /** User identifier (wallet address for crypto, email/customer ID for Stripe) */
  userId: string;
  /** New billing interval (if changing interval) */
  newInterval?: BillingInterval;
  /** How to handle proration (Stripe only) */
  prorationBehavior?: ProrationBehavior;
  /** Whether to apply change immediately or at period end */
  immediate?: boolean;
}

/**
 * Response from subscription change
 */
export interface ChangeSubscriptionResponse {
  /** Whether change was successful */
  success: boolean;
  /** Updated subscription status */
  status: SubscriptionStatus;
  /** New resource/plan ID */
  newResource: string;
  /** New billing interval */
  newInterval: BillingInterval;
  /** Amount credited/debited for proration (in cents) */
  prorationAmount?: number;
  /** Next billing date (ISO 8601) */
  nextBillingDate?: string;
  /** When the new plan becomes effective (ISO 8601) */
  effectiveDate: string;
  /** Error message if change failed */
  error?: string;
}

/**
 * Request for subscription change preview (proration calculation)
 */
export interface ChangePreviewRequest {
  /** Current resource/plan ID */
  currentResource: string;
  /** New resource/plan ID to preview */
  newResource: string;
  /** User identifier */
  userId: string;
  /** New billing interval (if changing interval) */
  newInterval?: BillingInterval;
}

/**
 * Response from subscription change preview
 */
export interface ChangePreviewResponse {
  /** Whether preview was successful */
  success: boolean;
  /** Amount to be charged immediately (positive) or credited (negative) in cents */
  immediateAmount: number;
  /** Currency for the amounts */
  currency: string;
  /** Current plan price per period (in cents) */
  currentPlanPrice: number;
  /** New plan price per period (in cents) */
  newPlanPrice: number;
  /** Days remaining in current period */
  daysRemaining: number;
  /** When the new plan would become effective (ISO 8601) */
  effectiveDate: string;
  /** Breakdown of proration calculation */
  prorationDetails?: {
    /** Credit for unused time on current plan (in cents) */
    unusedCredit: number;
    /** Cost for remaining time on new plan (in cents) */
    newPlanCost: number;
  };
  /** Error message if preview failed */
  error?: string;
}

/**
 * Full subscription details (for management UI)
 */
export interface SubscriptionDetails {
  /** Unique subscription ID */
  id: string;
  /** Resource/plan ID */
  resource: string;
  /** Current status */
  status: SubscriptionStatus;
  /** Billing interval */
  interval: BillingInterval;
  /** Custom interval in days (for 'custom' interval) */
  intervalDays?: number;
  /** Price per period (in cents for fiat, atomic units for crypto) */
  pricePerPeriod: number;
  /** Currency (e.g., "USD", "USDC") */
  currency: string;
  /** Whether subscription will cancel at period end */
  cancelAtPeriodEnd: boolean;
  /** Current period start (ISO 8601) */
  currentPeriodStart: string;
  /** Current period end (ISO 8601) */
  currentPeriodEnd: string;
  /** When subscription was created (ISO 8601) */
  createdAt: string;
  /** Payment method type */
  paymentMethod: 'stripe' | 'x402';
  /** Trial end date if in trial (ISO 8601) */
  trialEnd?: string;
}
