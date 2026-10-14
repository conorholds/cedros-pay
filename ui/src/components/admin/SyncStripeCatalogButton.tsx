import { useState } from 'react';

import type { IAdminAuthManager } from './AdminAuthManager';
import { requireAdminAuth } from './authFetch';
import { Icons } from './icons';
import type { Product } from './types';

interface SyncStripeCatalogButtonProps {
  products: Product[];
  authManager?: IAdminAuthManager;
  onSynced: () => void | Promise<void>;
  onError: (message: string | null) => void;
}

export function SyncStripeCatalogButton({
  products,
  authManager,
  onSynced,
  onError,
}: SyncStripeCatalogButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const activeProducts = products.filter((product) => product.active === true);
  const isAuthenticated = authManager?.isAuthenticated() === true;

  const syncAll = async () => {
    setIsSyncing(true);
    onError(null);
    let synchronized = 0;
    const failed: string[] = [];
    try {
      const auth = requireAdminAuth(authManager);
      for (const product of activeProducts) {
        try {
          await auth.fetchWithAuth(
            `/admin/products/${encodeURIComponent(product.id)}/sync-stripe`,
            { method: 'POST' }
          );
          synchronized += 1;
        } catch {
          failed.push(product.title || product.id);
        }
      }
      await onSynced();
      if (failed.length > 0) {
        onError(
          `Synchronized ${synchronized} product${synchronized === 1 ? '' : 's'}; failed: ${failed.join(', ')}`
        );
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to synchronize the Stripe catalog');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      type="button"
      className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost"
      onClick={syncAll}
      disabled={!isAuthenticated || isSyncing || activeProducts.length === 0}
      title={!isAuthenticated ? 'Admin authentication is required to sync Stripe.' : undefined}
    >
      {isSyncing ? Icons.loading : Icons.refresh}
      {isSyncing ? 'Syncing catalog…' : 'Sync catalog to Stripe'}
    </button>
  );
}
