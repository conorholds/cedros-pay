import { useState, useCallback, useRef } from 'react';
import { Linking } from 'react-native';
import { useCedrosContext } from '../context';
import type {
  SubscriptionDetails,
  ChangeSubscriptionRequest,
  ChangeSubscriptionResponse,
  ChangePreviewRequest,
  ChangePreviewResponse,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  BillingPortalResponse,
  SubscriptionStatus,
  BillingInterval,
  ProrationBehavior,
} from '../types';

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
export function useSubscriptionManagement() {
  const { subscriptionChangeManager } = useCedrosContext();

  const [state, setState] = useState<SubscriptionManagementState>({
    status: 'idle',
    error: null,
    subscription: null,
    changePreview: null,
    userId: null,
  });

  // Use refs to track latest state values and prevent stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Load subscription details
   */
  const loadSubscription = useCallback(
    async (resource: string, userId: string): Promise<SubscriptionDetails | null> => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      try {
        const details = await subscriptionChangeManager.getDetails(resource, userId);
        setState((prev) => ({
          ...prev,
          status: 'success',
          subscription: details,
          userId,
        }));
        return details;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load subscription';
        setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );

  /**
   * Preview a subscription change (get proration details)
   */
  const previewChange = useCallback(
    async (
      currentResource: string,
      newResource: string,
      userId: string,
      newInterval?: BillingInterval
    ): Promise<ChangePreviewResponse | null> => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      try {
        const request: ChangePreviewRequest = {
          currentResource,
          newResource,
          userId,
          newInterval,
        };
        const preview = await subscriptionChangeManager.previewChange(request);
        setState((prev) => ({
          ...prev,
          status: 'idle',
          changePreview: preview,
        }));
        return preview;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to preview change';
        setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );

  /**
   * Change subscription plan (upgrade or downgrade)
   */
  const changeSubscription = useCallback(
    async (options: ChangeOptions): Promise<ChangeSubscriptionResponse | null> => {
      // Use ref to access latest state values and prevent stale closures
      const { subscription, userId } = stateRef.current;
      if (!subscription || !userId) {
        setState((prev) => ({ ...prev, status: 'error', error: 'No subscription loaded' }));
        return null;
      }

      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      try {
        const request: ChangeSubscriptionRequest = {
          currentResource: subscription.resource,
          newResource: options.newResource,
          userId,
          newInterval: options.newInterval,
          prorationBehavior: options.prorationBehavior,
          immediate: options.immediate,
        };
        const response = await subscriptionChangeManager.changeSubscription(request);

        if (response.success) {
          // Update local subscription state with new values
          setState((prev) => ({
            ...prev,
            status: 'success',
            subscription: prev.subscription
              ? {
                  ...prev.subscription,
                  resource: response.newResource,
                  interval: response.newInterval,
                  status: response.status,
                }
              : null,
            changePreview: null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: response.error || 'Failed to change subscription',
          }));
        }

        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to change subscription';
        setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );

  /**
   * Cancel subscription
   */
  const cancelSubscription = useCallback(
    async (immediate?: boolean): Promise<CancelSubscriptionResponse | null> => {
      // Use ref to access latest state values and prevent stale closures
      const { subscription, userId } = stateRef.current;
      if (!subscription || !userId) {
        setState((prev) => ({ ...prev, status: 'error', error: 'No subscription loaded' }));
        return null;
      }

      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      try {
        const request: CancelSubscriptionRequest = {
          resource: subscription.resource,
          userId,
          immediate,
        };
        const response = await subscriptionChangeManager.cancel(request);

        if (response.success) {
          // Update local subscription state
          const newStatus: SubscriptionStatus = immediate ? 'canceled' : subscription.status;
          setState((prev) => ({
            ...prev,
            status: 'success',
            subscription: prev.subscription
              ? {
                  ...prev.subscription,
                  status: newStatus,
                  cancelAtPeriodEnd: !immediate,
                }
              : null,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: response.error || 'Failed to cancel subscription',
          }));
        }

        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
        setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );

  /**
   * Open Stripe billing portal
   */
  const openBillingPortal = useCallback(
    async (userId: string, returnUrl?: string): Promise<BillingPortalResponse | null> => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      try {
        const response = await subscriptionChangeManager.getBillingPortalUrl({
          userId,
          returnUrl,
        });

        // Open billing portal in external browser
        await Linking.openURL(response.url);

        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to open billing portal';
        setState((prev) => ({ ...prev, status: 'error', error: errorMessage }));
        return null;
      }
    },
    [subscriptionChangeManager]
  );

  /**
   * Clear change preview
   */
  const clearPreview = useCallback(() => {
    setState((prev) => ({ ...prev, changePreview: null }));
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      error: null,
      subscription: null,
      changePreview: null,
      userId: null,
    });
  }, []);

  return {
    ...state,
    loadSubscription,
    previewChange,
    changeSubscription,
    cancelSubscription,
    openBillingPortal,
    clearPreview,
    reset,
  };
}
