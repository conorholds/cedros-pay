import { useState } from 'react';
import type { IAdminAuthManager } from './AdminAuthManager';
import { requireAdminAuth } from './authFetch';

export interface SyncStripeProductButtonProps {
  productId: string;
  authManager?: IAdminAuthManager;
  onSynced: () => void | Promise<void>;
  onError: (message: string | null) => void;
}

export function useSyncStripeProduct({
  productId,
  authManager,
  onSynced,
  onError,
}: SyncStripeProductButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const isAuthenticated = authManager?.isAuthenticated() === true;

  const syncProduct = async () => {
    setIsSyncing(true);
    onError(null);
    try {
      await requireAdminAuth(authManager).fetchWithAuth(`/admin/products/${encodeURIComponent(productId)}/sync-stripe`, {
        method: 'POST',
      });
      await onSynced();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to sync product to Stripe');
    } finally {
      setIsSyncing(false);
    }
  };

  return { isAuthenticated, isSyncing, syncProduct };
}
