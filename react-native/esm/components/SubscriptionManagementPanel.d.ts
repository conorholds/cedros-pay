import React from 'react';
import { ViewStyle } from 'react-native';
import type { BillingInterval } from '../types';
/**
 * Available plan for upgrade/downgrade
 */
export interface AvailablePlan {
    /** Plan resource ID */
    resource: string;
    /** Display name */
    name: string;
    /** Price per period (in cents) */
    price: number;
    /** Currency */
    currency: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Optional description */
    description?: string;
}
/**
 * Props for SubscriptionManagementPanel
 */
export interface SubscriptionManagementPanelProps {
    /** Current plan resource ID */
    resource: string;
    /** User identifier (email, customer ID, or wallet address) */
    userId: string;
    /** Available plans for upgrade/downgrade */
    availablePlans?: AvailablePlan[];
    /** Callback when subscription is successfully changed */
    onSubscriptionChanged?: (newResource: string, newInterval: BillingInterval) => void;
    /** Callback when subscription is canceled */
    onSubscriptionCanceled?: () => void;
    /** Return URL for billing portal */
    billingPortalReturnUrl?: string;
    /** Show billing portal button (Stripe subscriptions only) */
    showBillingPortal?: boolean;
    /** Custom container style */
    style?: ViewStyle;
}
/**
 * Subscription management panel component (React Native)
 *
 * Provides a UI for viewing and managing existing subscriptions:
 * - View current subscription details
 * - Upgrade or downgrade to different plans
 * - Cancel subscription
 * - Access Stripe billing portal
 */
export declare function SubscriptionManagementPanel({ resource, userId, availablePlans, onSubscriptionChanged, onSubscriptionCanceled, billingPortalReturnUrl, showBillingPortal, style, }: SubscriptionManagementPanelProps): React.JSX.Element;
//# sourceMappingURL=SubscriptionManagementPanel.d.ts.map