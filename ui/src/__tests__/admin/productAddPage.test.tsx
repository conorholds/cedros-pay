import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductAddPage } from '../../components/admin/ProductAddPage';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import { DEFAULT_COMMERCE_FEATURE_FLAGS } from '../../components/admin/commerceFeatureSettings';

function buildAuthManager(fetchWithAuth: IAdminAuthManager['fetchWithAuth']): IAdminAuthManager {
  return {
    getAuthMethod: () => 'host-session',
    isAuthenticated: () => true,
    setCedrosLoginAuth: () => {},
    createAuthHeaders: async () => ({}),
    fetchWithAuth,
  };
}

function renderPage(fetchWithAuth: ReturnType<typeof vi.fn>) {
  render(
    <ProductAddPage
      authManager={buildAuthManager(fetchWithAuth as IAdminAuthManager['fetchWithAuth'])}
      serverUrl="https://api.example.com"
      onBack={() => {}}
      onCreated={() => {}}
    />
  );
}

function renderPageWithDisabledFeatures(
  fetchWithAuth: ReturnType<typeof vi.fn>,
  featureOverrides: Partial<typeof DEFAULT_COMMERCE_FEATURE_FLAGS> = {}
) {
  render(
    <ProductAddPage
      authManager={buildAuthManager(fetchWithAuth as IAdminAuthManager['fetchWithAuth'])}
      serverUrl="https://api.example.com"
      features={{
        ...DEFAULT_COMMERCE_FEATURE_FLAGS,
        subscriptions: false,
        inventory: false,
        coupons: false,
        ...featureOverrides,
      }}
      onBack={() => {}}
      onCreated={() => {}}
    />
  );
}

function fillRequiredProductFields() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Cedros Hoodie' } });
  fireEvent.change(screen.getByLabelText('Description'), {
    target: { value: 'Midweight fleece with relaxed fit' },
  });
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '72.50' } });
}

function latestPayload(fetchWithAuth: ReturnType<typeof vi.fn>) {
  const options = fetchWithAuth.mock.calls[0][1] as RequestInit;
  return JSON.parse(String(options.body));
}

describe('ProductAddPage', () => {
  it('derives the product id from the name and sends price as cents', async () => {
    const fetchWithAuth = vi.fn(async () => ({}));
    renderPage(fetchWithAuth);

    fillRequiredProductFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));
    const payload = latestPayload(fetchWithAuth);
    expect(payload.id).toBe('cedros-hoodie');
    expect(payload.title).toBe('Cedros Hoodie');
    expect(payload.fiatAmountCents).toBe(7250);
    expect(payload.metadata.product_type).toBe('one_time');
  });

  it('submits SEO title and description when provided', async () => {
    const fetchWithAuth = vi.fn(async () => ({}));
    renderPage(fetchWithAuth);

    fillRequiredProductFields();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    fireEvent.change(screen.getByLabelText('SEO title'), {
      target: { value: 'Cedros Hoodie - Midweight Fleece' },
    });
    fireEvent.change(screen.getByLabelText('SEO description'), {
      target: { value: 'Shop a midweight fleece hoodie with a relaxed fit and fast checkout.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));
    const payload = latestPayload(fetchWithAuth);
    expect(payload.seoTitle).toBe('Cedros Hoodie - Midweight Fleece');
    expect(payload.seoDescription).toBe(
      'Shop a midweight fleece hoodie with a relaxed fit and fast checkout.'
    );
  });

  it('omits empty SEO fields from product creation', async () => {
    const fetchWithAuth = vi.fn(async () => ({}));
    renderPage(fetchWithAuth);

    fillRequiredProductFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalledTimes(1));
    const payload = latestPayload(fetchWithAuth);
    expect(payload).not.toHaveProperty('seoTitle');
    expect(payload).not.toHaveProperty('seoDescription');
  });

  it('blocks submission until name, description, and price are set', async () => {
    const fetchWithAuth = vi.fn(async () => ({}));
    renderPage(fetchWithAuth);

    fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByText('Add a product name.')).toBeInTheDocument();
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });

  it('hides disabled subscription, inventory, and coupon-specific controls', () => {
    renderPageWithDisabledFeatures(vi.fn(async () => ({})));

    expect(screen.queryByRole('button', { name: 'Subscription' })).not.toBeInTheDocument();
    expect(screen.queryByText(/category-wide coupons/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Physical' }));

    expect(screen.queryByLabelText('Track inventory')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Ships to')).toBeInTheDocument();
  });

  it('hides physical delivery when shipping is disabled', () => {
    renderPageWithDisabledFeatures(vi.fn(async () => ({})), { shipping: false });

    expect(screen.queryByRole('button', { name: 'Physical' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ships to')).not.toBeInTheDocument();
  });
});
