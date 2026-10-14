import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductEditPage } from '../../components/admin/ProductEditPage';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import type { Product } from '../../components/admin/types';

function buildAuthManager(fetchWithAuth: IAdminAuthManager['fetchWithAuth']): IAdminAuthManager {
  return {
    getAuthMethod: () => 'host-session',
    isAuthenticated: () => true,
    setCedrosLoginAuth: () => {},
    createAuthHeaders: async () => ({}),
    fetchWithAuth,
  };
}

const product = {
  id: 'hoodie',
  title: 'Cedros Hoodie',
  description: 'Cozy fleece',
  fiatAmountCents: 5000,
  fiatCurrency: 'usd',
  active: true,
  variants: [{ id: 'v1' }],
  metadata: { product_type: 'one_time', store_policy_fulfillment_type: 'digital_in_app' },
} as unknown as Product;

describe('ProductEditPage', () => {
  it('seeds the form from the product and PUTs a merged update that preserves unmanaged fields', async () => {
    const fetchWithAuth = vi.fn(async () => ({}));
    const onSaved = vi.fn();
    render(
      <ProductEditPage
        product={product}
        authManager={buildAuthManager(fetchWithAuth as IAdminAuthManager['fetchWithAuth'])}
        serverUrl="https://api.example.com"
        onBack={() => {}}
        onSaved={onSaved}
      />
    );

    // Seeded values are shown.
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Cedros Hoodie');
    expect((screen.getByLabelText('Price') as HTMLInputElement).value).toBe('50.00');
    expect(screen.getByRole('radio', { name: 'Digital' })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(document.querySelector('.cedros-admin__product-editor-status')).not.toBeNull();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Cedros Hoodie v2' } });
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();

    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));
    const [path, options] = fetchWithAuth.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/admin/products/hoodie');
    expect(options.method).toBe('PUT');
    const payload = JSON.parse(String(options.body));
    expect(payload.id).toBe('hoodie');
    expect(payload.title).toBe('Cedros Hoodie v2');
    expect(payload.variants).toEqual([{ id: 'v1' }]); // unmanaged field preserved
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('does not change the product id (shown read-only)', () => {
    render(
      <ProductEditPage
        product={product}
        authManager={buildAuthManager(vi.fn(async () => ({})) as IAdminAuthManager['fetchWithAuth'])}
        serverUrl="https://api.example.com"
        onBack={() => {}}
        onSaved={() => {}}
      />
    );
    // The editable "Product ID" textbox from create mode is absent in edit mode.
    expect(screen.queryByLabelText('Product ID')).not.toBeInTheDocument();
  });
});
