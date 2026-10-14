/**
 * Edit product page — reuses the create form, seeded from an existing product,
 * and saves with PUT. The update payload preserves fields this form doesn't
 * manage (see buildUpdatePayload). Thin wrapper over ProductFormPage.
 */

import type { IAdminAuthManager } from './AdminAuthManager';
import { ProductFormPage } from './ProductFormPage';
import { requireAdminAuth } from './authFetch';
import type { CommerceFeatureFlags } from './commerceFeatureSettings';
import { buildUpdatePayload, formFromProduct } from './productEditPayload';
import { getProductTitle } from './productDisplay';
import type { Product } from './types';

interface ProductEditPageProps {
  product: Product;
  authManager?: IAdminAuthManager;
  serverUrl: string;
  features?: CommerceFeatureFlags;
  onBack: () => void;
  onSaved: () => void;
}

export function ProductEditPage({
  product,
  authManager,
  serverUrl,
  features,
  onBack,
  onSaved,
}: ProductEditPageProps) {
  return (
    <ProductFormPage
      title="Edit product"
      subtitle={`Update “${getProductTitle(product)}”. Changes are stored as you edit.`}
      submitLabel="Update product"
      submittingLabel="Updating…"
      initialForm={formFromProduct(product)}
      idEditable={false}
      authManager={authManager}
      serverUrl={serverUrl}
      features={features}
      onBack={onBack}
      autosave={{
        enabled: true,
        resourceType: 'product',
        resourceId: product.id,
      }}
      onSubmit={async (form) => {
        await requireAdminAuth(authManager).fetchWithAuth(
          `/admin/products/${encodeURIComponent(product.id)}`,
          { method: 'PUT', body: JSON.stringify(buildUpdatePayload(form, product)) }
        );
        onSaved();
      }}
    />
  );
}
