import { BillingInterval } from '../types';
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
    /** Custom class name */
    className?: string;
    /** Custom styles */
    style?: React.CSSProperties;
}
/**
 * Subscription management panel component
 *
 * Provides a UI for viewing and managing existing subscriptions:
 * - View current subscription details
 * - Upgrade or downgrade to different plans
 * - Cancel subscription
 * - Access Stripe billing portal
 *
 * @example
 * ```tsx
 * <SubscriptionManagementPanel
 *   resource="plan-pro"
 *   userId="user@example.com"
 *   availablePlans={[
 *     { resource: 'plan-basic', name: 'Basic', price: 999, currency: 'USD', interval: 'monthly' },
 *     { resource: 'plan-pro', name: 'Pro', price: 1999, currency: 'USD', interval: 'monthly' },
 *     { resource: 'plan-enterprise', name: 'Enterprise', price: 4999, currency: 'USD', interval: 'monthly' },
 *   ]}
 *   onSubscriptionChanged={(newResource) => console.log('Changed to:', newResource)}
 *   showBillingPortal
 * />
 * ```
 */
export declare function SubscriptionManagementPanel({ resource, userId, availablePlans, onSubscriptionChanged, onSubscriptionCanceled, billingPortalReturnUrl, showBillingPortal, className, style, }: SubscriptionManagementPanelProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SubscriptionManagementPanel.d.ts.map