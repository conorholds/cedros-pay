import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContentSettingsSection } from '../../components/admin/ContentSettingsSection';
import type { AdminAuthHeaders, IAdminAuthManager } from '../../components/admin/AdminAuthManager';

const VALID_WALLET = '11111111111111111111111111111111';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Give assertions comfortable headroom on slower CI machines.
const SAVE_TIMEOUT = { timeout: 3000 };

const TIPPING_DEFAULTS = {
  enabled: true,
  recipient: VALID_WALLET,
  currencies: [{ symbol: 'USDC', decimals: 6, logo: '' }],
  presets: [1, 5, 10],
  label: 'Tip',
  description: '',
  allowPerPostRecipient: false,
};

const MONETIZATION_DEFAULTS = {
  enabled: true,
  defaultAccessMode: 'paid',
  defaultPreviewParagraphs: 2,
  defaultPrice: { amountCents: 500, currency: 'USD' },
  acceptedPaymentMethods: ['stripe', 'crypto'],
  subscriptionProductId: '',
  creditsPerArticle: 5,
  freeReadsPerMonth: 3,
  lockedMessage: 'Subscribe to continue reading.',
  mediaEnabled: true,
  mediaDefaultAccessMode: 'locked',
  mediaPreviewPolicy: { kind: 'thumbnail', assetId: null, variantKind: null },
  mediaPayProductId: 'product_media_123',
  mediaRequiredEntitlementId: '',
  mediaRequiresLogin: true,
  mediaLockedMessage: 'Sign in and purchase access to view this media.',
};

const X402_DEFAULTS = {
  enabled: true,
  payment_address: VALID_WALLET,
  token_mint: USDC_MINT,
  token_symbol: 'USDC',
  token_decimals: 6,
  custom_token_symbol: '',
  custom_token_icon: '',
};

class FakeAuthManager implements IAdminAuthManager {
  readonly requests: Array<{ path: string; options?: RequestInit }> = [];

  constructor(
    private tipping: Record<string, unknown> = TIPPING_DEFAULTS,
    private monetization: Record<string, unknown> = MONETIZATION_DEFAULTS,
    private x402: Record<string, unknown> = X402_DEFAULTS
  ) {}

  getAuthMethod() {
    return 'cedros-login' as const;
  }

  isAuthenticated() {
    return true;
  }

  setCedrosLoginAuth(_token: string | null, _isAdmin?: boolean) {}

  async createAuthHeaders(): Promise<AdminAuthHeaders> {
    return { Authorization: 'Bearer test' };
  }

  async fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> {
    this.requests.push({ path, options });
    if (options?.method === 'PUT') {
      return {
        kind: path.endsWith('tipping') ? 'tipping' : 'monetization',
        key: 'site_settings',
        settings: JSON.parse(String(options.body)).settings,
        updated: true,
        updatedAt: '2026-06-08T00:00:00Z',
      } as T;
    }
    if (path === '/admin/site-settings/tipping') {
      return { kind: 'tipping', key: 'site_settings/tipping', settings: this.tipping, updatedAt: null } as T;
    }
    if (path === '/admin/site-settings/monetization') {
      return { kind: 'monetization', key: 'site_settings/monetization', settings: this.monetization, updatedAt: null } as T;
    }
    if (path === '/admin/config/x402') {
      return { category: 'x402', config: this.x402, updatedAt: null, secretsRedacted: true } as T;
    }
    throw new Error(`Unexpected path: ${path}`);
  }
}

async function findCard(title: string): Promise<HTMLElement> {
  const heading = await screen.findByText(title);
  const card = heading.closest('.cedros-admin__content-settings-card');
  if (!(card instanceof HTMLElement)) throw new Error(`Card not found: ${title}`);
  return card;
}

function lastPut(authManager: FakeAuthManager, kind: 'tipping' | 'monetization') {
  const request = [...authManager.requests]
    .reverse()
    .find((req) => req.path.endsWith(kind) && req.options?.method === 'PUT');
  return request ? JSON.parse(String(request.options?.body)) : null;
}

describe('ContentSettingsSection', () => {
  it('shows only a retryable error when the initial settings load fails', async () => {
    const authManager = new FakeAuthManager();
    const fetchWithAuth = authManager.fetchWithAuth.bind(authManager);
    vi.spyOn(authManager, 'fetchWithAuth')
      .mockRejectedValueOnce(new Error('Content settings unavailable'))
      .mockImplementation(fetchWithAuth);
    render(
      <ContentSettingsSection
        serverUrl="https://example.test"
        authManager={authManager}
        showPageHeader={false}
      />
    );

    expect(await screen.findByText('Content settings unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Tipping')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Tipping')).toBeInTheDocument();
  });

  it('renders three embedded cards with custom dropdowns and autosave status', async () => {
    const authManager = new FakeAuthManager();
    render(
      <ContentSettingsSection
        serverUrl="https://example.test"
        authManager={authManager}
        showPageHeader={false}
      />
    );

    expect(await screen.findByText('Tipping')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Content' })).not.toBeInTheDocument();
    const root = screen.getByText('Tipping').closest('.cedros-admin__content-settings');
    expect(root).toHaveClass('cedros-admin__content-settings--embedded');
    expect(root?.querySelectorAll('.cedros-admin__content-settings-card')).toHaveLength(3);
    expect(root?.querySelectorAll('select')).toHaveLength(0);
    expect(root?.querySelectorAll('.cedros-admin__dropdown--form').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByRole('button', { name: /Save tipping defaults/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Save article and media defaults/i })
    ).not.toBeInTheDocument();
  });

  it('collapses a disabled card to an off-note instead of fields', async () => {
    const authManager = new FakeAuthManager({ ...TIPPING_DEFAULTS, enabled: false });
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    await screen.findByText('Tipping');
    expect(screen.getByText(/Tipping is turned off/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Tip wallet (Solana)')).not.toBeInTheDocument();
    expect(screen.queryByText('Tip currencies')).not.toBeInTheDocument();
  });

  it('autosaves tipping with derived Crypto wallet and token settings', async () => {
    const authManager = new FakeAuthManager();
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    const card = await findCard('Tipping');
    expect(within(card).queryByLabelText('Tip wallet (Solana)')).not.toBeInTheDocument();
    expect(within(card).queryByText('Tip currencies')).not.toBeInTheDocument();

    fireEvent.change(await within(card).findByLabelText('Button text'), {
      target: { value: 'Support this post' },
    });
    const amountInput = within(card).getByLabelText('Quick tip amounts');
    fireEvent.change(amountInput, { target: { value: '25' } });
    fireEvent.keyDown(amountInput, { key: 'Enter' });

    expect(lastPut(authManager, 'tipping')).toBeNull();

    await waitFor(() => {
      expect(lastPut(authManager, 'tipping')).toMatchObject({
        settings: {
          label: 'Support this post',
          presets: [1, 5, 10, 25],
          recipient: VALID_WALLET,
          currencies: [{ symbol: 'USDC', decimals: 6, mint: USDC_MINT }],
          allowPerPostRecipient: false,
        },
      });
    }, SAVE_TIMEOUT);
    expect(await within(card).findByText('Saved just now', {}, SAVE_TIMEOUT)).toBeInTheDocument();
  });

  it('blocks tipping when Crypto is disabled', async () => {
    const authManager = new FakeAuthManager(
      { ...TIPPING_DEFAULTS, enabled: true },
      MONETIZATION_DEFAULTS,
      { ...X402_DEFAULTS, enabled: false }
    );
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    const card = await findCard('Tipping');
    expect(within(card).getByText(/Turn on Crypto to enable tipping/i)).toBeInTheDocument();
    const toggle = within(card).getByRole('switch', { name: 'Turn Tipping on or off' });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(lastPut(authManager, 'tipping')).toBeNull();
  });

  it('blocks tipping when Crypto has no payout token', async () => {
    const authManager = new FakeAuthManager(
      TIPPING_DEFAULTS,
      MONETIZATION_DEFAULTS,
      { ...X402_DEFAULTS, token_mint: '' }
    );
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    const card = await findCard('Tipping');
    expect(
      await within(card).findByText(/Add a payout wallet and payment token in Crypto/i)
    ).toBeInTheDocument();
    expect(within(card).getByRole('switch', { name: 'Turn Tipping on or off' })).toBeDisabled();
  });

  it('drops the payment-methods info box, credits price, and Advanced section', async () => {
    const authManager = new FakeAuthManager();
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    const card = await findCard('Article paywall');
    await within(card).findByLabelText('Locked post message');
    expect(within(card).queryByText(/Readers pay with the methods/i)).not.toBeInTheDocument();
    expect(within(card).queryByLabelText('Price in credits')).not.toBeInTheDocument();
    expect(within(card).queryByLabelText('Custom unlock price')).not.toBeInTheDocument();
    expect(within(card).queryByText('Advanced')).not.toBeInTheDocument();
  });

  it('shows a subscription-for-unlimited-reads field in pay-to-unlock mode', async () => {
    const authManager = new FakeAuthManager();
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    const card = await findCard('Article paywall');
    // Default access is "paid" → per-article price + optional unlimited-reads subscription.
    expect(await within(card).findByLabelText('Price per article')).toBeInTheDocument();
    expect(
      within(card).getByLabelText('Subscription for unlimited reads (optional)')
    ).toBeInTheDocument();
  });

  it('autosaves the per-article price as fixed-point integer cents', async () => {
    const authManager = new FakeAuthManager();
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    const card = await findCard('Article paywall');
    fireEvent.change(await within(card).findByLabelText('Price per article'), {
      target: { value: '4.99' },
    });

    expect(lastPut(authManager, 'monetization')).toBeNull();

    await waitFor(() => {
      expect(lastPut(authManager, 'monetization')).toMatchObject({
        settings: {
          // 4.99 → exactly 499 cents (no float drift), and the legacy credits price is cleared.
          defaultPrice: { amountCents: 499, currency: 'USD' },
          creditsPerArticle: null,
          acceptedPaymentMethods: ['stripe', 'crypto'],
        },
      });
    }, SAVE_TIMEOUT);
  });

  it('autosaves the article access mode from the dropdown', async () => {
    const authManager = new FakeAuthManager();
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    const card = await findCard('Article paywall');
    fireEvent.click(await within(card).findByRole('button', { name: 'Default access for new posts' }));
    fireEvent.click(screen.getByRole('option', { name: 'Subscribers only' }));
    // Subscriber-only access reveals the required subscription field (not the optional one).
    expect(within(card).getByLabelText('Subscription that unlocks posts')).toBeInTheDocument();

    expect(lastPut(authManager, 'monetization')).toBeNull();

    await waitFor(() => {
      expect(lastPut(authManager, 'monetization')).toMatchObject({
        settings: { defaultAccessMode: 'subscription' },
      });
    }, SAVE_TIMEOUT);
  });

  it('autosaves gated media defaults and forces sign-in for locked media', async () => {
    const authManager = new FakeAuthManager();
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    const card = await findCard('Gated media');
    fireEvent.change(await within(card).findByLabelText('Locked media message'), {
      target: { value: 'Purchase this gallery to view the full media.' },
    });

    expect(lastPut(authManager, 'monetization')).toBeNull();

    await waitFor(() => {
      expect(lastPut(authManager, 'monetization')).toMatchObject({
        settings: {
          mediaEnabled: true,
          mediaDefaultAccessMode: 'locked',
          mediaPayProductId: 'product_media_123',
          mediaRequiresLogin: true,
          mediaLockedMessage: 'Purchase this gallery to view the full media.',
        },
      });
    }, SAVE_TIMEOUT);
  });

  it('blocks saving locked media when no product or entitlement is configured', async () => {
    const authManager = new FakeAuthManager();
    render(<ContentSettingsSection serverUrl="https://example.test" authManager={authManager} />);

    const card = await findCard('Gated media');
    fireEvent.change(await within(card).findByLabelText('Product that unlocks media'), {
      target: { value: '' },
    });

    await screen.findByText('Add a product or entitlement that unlocks your media before saving.', {}, SAVE_TIMEOUT);
    expect(lastPut(authManager, 'monetization')).toBeNull();
  });
});
