import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubscriptionsSection } from '../../components/admin/SubscriptionsSection';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import {
  SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE,
  validateSubscriptionPagePatch,
} from '../../components/admin/subscriptionAutosaveApi';

const SETTINGS = {
  enabled: true,
  plans: [],
  pageTitle: 'Choose Your Plan',
  pageSubtitle: 'Pick a tier.',
  annualSavingsBadge: '2 months free',
  popularBadgeText: 'Best Deal',
  footerNotice: '',
  revision: 1,
  etag: '"subscription-settings:1"',
};

class FakeAuthManager implements IAdminAuthManager {
  requests: Array<{ path: string; options?: RequestInit }> = [];

  constructor(private readonly settings: Record<string, unknown> = SETTINGS) {}

  getAuthMethod() {
    return 'cedros-login' as const;
  }

  isAuthenticated() {
    return true;
  }

  setCedrosLoginAuth() {}

  async createAuthHeaders() {
    return { Authorization: 'Bearer token' };
  }

  async fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> {
    this.requests.push({ path, options });
    if (path === '/admin/subscriptions/settings' && !options?.method) {
      return this.settings as T;
    }
    if (path.startsWith('/admin/config/shop')) {
      return { category: 'shop', config: {}, updatedAt: '', secretsRedacted: true } as T;
    }
    if (path === '/admin/v1/status') {
      return { runtime: 'wasm', unsupportedRoutes: [] } as T;
    }
    if (path === '/admin/subscriptions/settings' && options?.method === 'PATCH') {
      const body = JSON.parse(String(options.body));
      return {
        resourceId: 'default',
        revision: 2,
        etag: '"subscription-settings:2"',
        savedAt: '2026-07-01T00:00:00Z',
        canonicalPatchOrResource: { ...this.settings, ...body.patch, revision: 2 },
        warnings: [],
      } as T;
    }
    if (path === '/admin/subscriptions/settings' && options?.method === 'PUT') {
      return { ...JSON.parse(String(options.body)), revision: 3 } as T;
    }
    throw new Error(`Unexpected path: ${path}`);
  }
}

describe('subscription plan page copy', () => {
  it('declares safe subscription page autosave metadata', () => {
    expect(SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE.allowedAutosaveFields).toContain('pageTitle');
    expect(SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE.blockedFields).toContain('plans.priceMonthlyUsd');
    expect(validateSubscriptionPagePatch({ pageTitle: 'Memberships' })).toEqual({ ok: true });
    expect(validateSubscriptionPagePatch({ enabled: true } as never)).toEqual({
      ok: false,
      message: 'Unsupported subscription page autosave field: enabled',
    });
  });

  it('edits the copy beside the plans it labels, attached to a preview', async () => {
    const authManager = new FakeAuthManager();
    render(<SubscriptionsSection serverUrl="https://example.test" authManager={authManager} />);

    expect(await screen.findByRole('heading', { name: 'Plan page' })).toBeInTheDocument();
    const preview = document.querySelector('.cedros-admin__preview-surface');
    expect(preview).toBeTruthy();
    expect(preview).toHaveTextContent('Choose Your Plan');
    expect(preview).toHaveTextContent('Best Deal');
    expect(preview).toHaveTextContent('2 months free');
  });

  it('falls back to the shipped defaults in the preview when a field is cleared', async () => {
    const authManager = new FakeAuthManager({ ...SETTINGS, pageTitle: '' });
    render(<SubscriptionsSection serverUrl="https://example.test" authManager={authManager} />);

    expect(await screen.findByRole('heading', { name: 'Plan page' })).toBeInTheDocument();
    expect(document.querySelector('.cedros-admin__preview-title')).toHaveTextContent(
      'Choose Your Plan'
    );
    expect(screen.getByLabelText('Heading')).toHaveValue('');
  });

  it('autosaves copy through the field-masked protocol without a plans write', async () => {
    const authManager = new FakeAuthManager();
    render(<SubscriptionsSection serverUrl="https://example.test" authManager={authManager} />);

    const heading = await screen.findByLabelText('Heading');
    fireEvent.change(heading, { target: { value: 'Memberships' } });

    await waitFor(
      () => {
        expect(
          authManager.requests.some(
            (request) =>
              request.path === '/admin/subscriptions/settings' &&
              request.options?.method === 'PATCH'
          )
        ).toBe(true);
      },
      { timeout: 2500 }
    );

    const save = authManager.requests.find(
      (request) =>
        request.path === '/admin/subscriptions/settings' && request.options?.method === 'PATCH'
    );
    expect(save?.options?.headers).toMatchObject({
      'If-Match': '"subscription-settings:1"',
      'Idempotency-Key': expect.any(String),
    });
    expect(JSON.parse(String(save?.options?.body))).toEqual(
      expect.objectContaining({
        autosave: true,
        updateMask: ['pageTitle'],
        patch: { pageTitle: 'Memberships' },
        schemaVersion: 'v1',
      })
    );
    expect(
      authManager.requests.filter((request) => request.options?.method === 'PUT')
    ).toHaveLength(0);
  });

  it('carries live copy into a plan save so plan writes never rewind it', async () => {
    const authManager = new FakeAuthManager();
    render(<SubscriptionsSection serverUrl="https://example.test" authManager={authManager} />);

    const heading = await screen.findByLabelText('Heading');
    fireEvent.change(heading, { target: { value: 'Memberships' } });
    fireEvent.click(screen.getByRole('button', { name: /Add plan/ }));

    await waitFor(
      () => {
        expect(
          authManager.requests.some(
            (request) =>
              request.path === '/admin/subscriptions/settings' &&
              request.options?.method === 'PUT'
          )
        ).toBe(true);
      },
      { timeout: 2500 }
    );

    const planWrite = authManager.requests.find(
      (request) =>
        request.path === '/admin/subscriptions/settings' && request.options?.method === 'PUT'
    );
    expect(JSON.parse(String(planWrite?.options?.body))).toMatchObject({
      pageTitle: 'Memberships',
    });
  });

  it('hides the copy card while subscriptions are turned off', async () => {
    const authManager = new FakeAuthManager({ ...SETTINGS, enabled: false });
    render(<SubscriptionsSection serverUrl="https://example.test" authManager={authManager} />);

    expect(await screen.findByText('Enable subscriptions')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Plan page' })).not.toBeInTheDocument();
  });
});
