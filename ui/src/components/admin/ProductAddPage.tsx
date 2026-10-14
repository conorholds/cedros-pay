/**
 * Add product page — a dedicated page (not an inline takeover of the products
 * list) for creating a catalog product. Thin wrapper over ProductFormPage.
 */

import type { IAdminAuthManager } from './AdminAuthManager';
import { ProductFormPage } from './ProductFormPage';
import { requireAdminAuth } from './authFetch';
import type { CommerceFeatureFlags } from './commerceFeatureSettings';
import { buildCreatePayload, defaultProduct } from './productPayload';

interface ProductAddPageProps {
  authManager?: IAdminAuthManager;
  serverUrl: string;
  features?: CommerceFeatureFlags;
  onBack: () => void;
  onCreated: () => void;
}

export function ProductAddPage({
  authManager,
  serverUrl,
  features,
  onBack,
  onCreated,
}: ProductAddPageProps) {
  return (
    <ProductFormPage
      title="Add product"
      subtitle="Create something to sell through your storefront and paywall. You can refine everything later."
      submitLabel="Create product"
      submittingLabel="Creating…"
      initialForm={defaultProduct()}
      idEditable
      authManager={authManager}
      serverUrl={serverUrl}
      features={features}
      onBack={onBack}
      onSubmit={async (form) => {
        await requireAdminAuth(authManager).fetchWithAuth('/admin/products', {
          method: 'POST',
          body: JSON.stringify(buildCreatePayload(form)),
        });
        onCreated();
      }}
    />
  );
}
