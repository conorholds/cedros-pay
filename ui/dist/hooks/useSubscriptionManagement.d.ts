import { SubscriptionDetails, ChangeSubscriptionResponse, ChangePreviewResponse, CancelSubscriptionResponse, BillingPortalResponse, BillingInterval, ProrationBehavior } from '../types';
/**
 * State for subscription management operations
 */
export interface SubscriptionManagementState {
    /** Current operation status */
    status: 'idle' | 'loading' | 'success' | 'error';
    /** Error message if status is 'error' */
    error: string | null;
    /** Full subscription details */
    subscription: SubscriptionDetails | null;
    /** Preview of a pending change */
    changePreview: ChangePreviewResponse | null;
    /** User ID used to load the subscription (wallet address, email, or customer ID) */
    userId: string | null;
}
/**
 * Options for changing subscription
 */
export interface ChangeOptions {
    /** New resource/plan ID */
    newResource: string;
    /** New billing interval (optional) */
    newInterval?: BillingInterval;
    /** Proration behavior (Stripe only) */
    prorationBehavior?: ProrationBehavior;
    /** Apply change immediately vs at period end */
    immediate?: boolean;
}
/**
 * Hook for managing existing subscriptions (upgrade, downgrade, cancel)
 *
 * @example
 * ```tsx
 * function SubscriptionSettings({ userId }: { userId: string }) {
 *   const {
 *     subscription,
 *     status,
 *     error,
 *     loadSubscription,
 *     previewChange,
 *     changeSubscription,
 *     cancelSubscription,
 *     openBillingPortal,
 *   } = useSubscriptionManagement();
 *
 *   useEffect(() => {
 *     loadSubscription('plan-pro', userId);
 *   }, [userId]);
 *
 *   const handleUpgrade = async () => {
 *     const preview = await previewChange('plan-pro', 'plan-enterprise', userId);
 *     if (preview && confirm(`Upgrade for $${preview.immediateAmount / 100}?`)) {
 *       await changeSubscription({ newResource: 'plan-enterprise' });
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {subscription && (
 *         <div>
 *           <p>Plan: {subscription.resource}</p>
 *           <p>Status: {subscription.status}</p>
 *           <button onClick={handleUpgrade}>Upgrade</button>
 *           <button onClick={() => cancelSubscription()}>Cancel</button>
 *         </div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export declare function useSubscriptionManagement(): {
    loadSubscription: (resource: string, userId: string) => Promise<SubscriptionDetails | null>;
    previewChange: (currentResource: string, newResource: string, userId: string, newInterval?: BillingInterval) => Promise<ChangePreviewResponse | null>;
    changeSubscription: (options: ChangeOptions) => Promise<ChangeSubscriptionResponse | null>;
    cancelSubscription: (immediate?: boolean) => Promise<CancelSubscriptionResponse | null>;
    openBillingPortal: (userId: string, returnUrl?: string) => Promise<BillingPortalResponse | null>;
    clearPreview: () => void;
    reset: () => void;
    /** Current operation status */
    status: "idle" | "loading" | "success" | "error";
    /** Error message if status is 'error' */
    error: string | null;
    /** Full subscription details */
    subscription: SubscriptionDetails | null;
    /** Preview of a pending change */
    changePreview: ChangePreviewResponse | null;
    /** User ID used to load the subscription (wallet address, email, or customer ID) */
    userId: string | null;
};
//# sourceMappingURL=useSubscriptionManagement.d.ts.map