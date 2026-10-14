import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SingleCategorySettings } from '../../components/admin/SingleCategorySettings';
import type {
  AdminAuthHeaders,
  IAdminAuthManager,
} from '../../components/admin/AdminAuthManager';

const STRIPE_CONFIG = {
  enabled: false,
  mode: 'test',
  publishable_key: '',
  secret_key: '[REDACTED]',
  webhook_token: '[REDACTED]',
  allowed_redirect_schemes: [],
  success_url: '',
  cancel_url: '',
};

// Setup fields only render once the rail is on, so tests that exercise the
// fields start from an enabled config.
const STRIPE_CONFIG_ON = { ...STRIPE_CONFIG, enabled: true };

const X402_CONFIG = {
  enabled: false,
  payment_address: '',
  token_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  token_symbol: 'USDC',
  token_decimals: 6,
  gasless_enabled: false,
  auto_create_token_account: false,
  rounding_mode: 'standard',
};

const CEDROS_LOGIN_CONFIG = {
  enabled: false,
  credits_enabled: false,
  base_url: '',
  api_key: '[REDACTED]',
  timeout: 5,
  jwt_issuer: '',
  jwt_audience: '',
};

const NATIVE_STORE_CONFIG = {
  enabled: true,
  apple_enabled: false,
  apple_issuer_id: '',
  apple_key_id: '',
  apple_private_key: '',
  apple_bundle_id: '',
  apple_allow_sandbox_fallback: true,
  google_enabled: true,
  google_service_account_email: '',
  google_private_key: '',
  google_package_name: '',
  google_push_service_account_email: '',
  google_push_audience: '',
};

class FakeAuthManager implements IAdminAuthManager {
  readonly requests: Array<{ path: string; options?: RequestInit }> = [];

  webhookEndpoint = {
    path: '/extensions/cedros-pay/webhook/stripe?token=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    events: ['checkout.session.completed', 'invoice.paid'],
  };

  constructor(private configs: Record<string, Record<string, unknown>>) {}

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

  mutationRequests() {
    return this.requests.filter((r) => r.options?.method === 'PUT');
  }

  async fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> {
    this.requests.push({ path, options });
    const configMatch = path.match(/^\/admin\/config\/([a-z0-9_]+)(\?|$)/);
    if (configMatch && (!options?.method || options.method === 'GET')) {
      const category = configMatch[1];
      return {
        category,
        config: this.configs[category],
        updatedAt: '2026-06-01T00:00:00Z',
        secretsRedacted: true,
        ...(category === 'stripe' ? { webhookEndpoint: this.webhookEndpoint } : {}),
      } as T;
    }
    if (configMatch && options?.method === 'PUT') {
      return {} as T;
    }
    if (path === '/admin/config/validate') {
      return { valid: true, errors: [], warnings: [] } as T;
    }
    throw new Error(`Unexpected path: ${path}`);
  }
}

function renderStripe(authManager: FakeAuthManager) {
  return render(
    <SingleCategorySettings
      serverUrl="https://example.test"
      authManager={authManager}
      category="stripe"
      title="Stripe"
      showEnabledToggle={true}
    />
  );
}

describe('SingleCategorySettings', () => {
  it('offers a retry after a settings load failure', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    const fetchWithAuth = authManager.fetchWithAuth.bind(authManager);
    vi.spyOn(authManager, 'fetchWithAuth')
      .mockRejectedValueOnce(new Error('Settings unavailable'))
      .mockImplementation(fetchWithAuth);
    renderStripe(authManager);

    expect(await screen.findByText('Settings unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByLabelText('Publishable key')).toBeInTheDocument();
  });

  it('autosaves exactly once per edit and does not re-save in a loop', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    renderStripe(authManager);

    const input = await screen.findByLabelText('Publishable key');
    fireEvent.change(input, { target: { value: 'pk_test_123' } });
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await waitFor(() => expect(authManager.mutationRequests()).toHaveLength(1));
    expect(
      screen.getByText('Saved just now', { selector: '.cedros-admin__autosave-indicator' })
    ).toBeInTheDocument();

    // Regression: the old autosave model re-triggered itself after every save.
    await Promise.resolve();
    await Promise.resolve();
    expect(authManager.mutationRequests()).toHaveLength(1);
    expect(JSON.parse(String(authManager.mutationRequests()[0].options?.body))).toEqual({
      config: { publishable_key: 'pk_test_123' },
      description: 'Updated via Pay hub',
      expectedRevision: null,
      mutationId: expect.any(String),
    });
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('hides the setup fields while the rail is off and explains why', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG } });
    renderStripe(authManager);

    expect(await screen.findByText(/turned off/)).toBeInTheDocument();
    // The setup fields and autosave controls stay collapsed until the rail is on.
    expect(screen.queryByLabelText('Publishable key')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('reveals the setup fields once the rail is switched on', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG } });
    renderStripe(authManager);

    await screen.findByText(/turned off/);
    fireEvent.click(screen.getByRole('switch', { name: 'Turn Stripe on or off' }));

    await waitFor(() => expect(authManager.mutationRequests()).toHaveLength(1));
    const body = JSON.parse(String(authManager.mutationRequests()[0].options?.body));
    expect(body.config.enabled).toBe(true);

    // Toggling on collapses the note and surfaces the fields for setup.
    expect(await screen.findByLabelText('Publishable key')).toBeInTheDocument();
    expect(screen.queryByText(/turned off/)).not.toBeInTheDocument();
  });

  it('uses the supported Crypto update route when setup begins', async () => {
    const authManager = new FakeAuthManager({ x402: { ...X402_CONFIG } });
    render(
      <SingleCategorySettings
        serverUrl="https://example.test"
        authManager={authManager}
        category="x402"
        title="Crypto"
        showEnabledToggle={true}
      />
    );

    fireEvent.click(await screen.findByRole('switch', { name: 'Turn Crypto on or off' }));
    await waitFor(() => expect(authManager.mutationRequests()).toHaveLength(1));

    const request = authManager.mutationRequests()[0];
    expect(request.path).toBe('/admin/config/x402');
    expect(request.options?.method).toBe('PUT');
    expect(JSON.parse(String(request.options?.body)).config).toEqual({ enabled: true });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports local setup errors instead of trusting backend success', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    renderStripe(authManager);

    fireEvent.click(await screen.findByRole('button', { name: 'Check setup' }));

    expect(await screen.findByText('Some settings need attention')).toBeInTheDocument();
    expect(screen.getByText('Stripe publishable key is required.')).toBeInTheDocument();
    expect(authManager.requests.some((request) => request.path === '/admin/config/validate')).toBe(
      false
    );
  });

  it('checks setup through the backend once local requirements pass', async () => {
    const authManager = new FakeAuthManager({
      stripe: {
        ...STRIPE_CONFIG_ON,
        publishable_key: 'pk_test_123',
      },
    });
    renderStripe(authManager);

    fireEvent.click(await screen.findByRole('button', { name: 'Check setup' }));

    expect(await screen.findByText('Setup looks ready')).toBeInTheDocument();
    expect(authManager.requests.some((request) => request.path === '/admin/config/validate')).toBe(
      true
    );
  });

  it('shows the generated Stripe webhook URL and events instead of a signing-secret field', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    renderStripe(authManager);

    expect(await screen.findByTestId('stripe-webhook-url')).toHaveTextContent(
      `https://example.test${authManager.webhookEndpoint.path}`
    );
    expect(screen.getByTestId('stripe-webhook-events')).toHaveTextContent(
      'checkout.session.completed, invoice.paid'
    );
    expect(screen.queryByLabelText('Webhook signing secret')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Webhook ingress token')).not.toBeInTheDocument();
  });

  it('regenerates the webhook URL by clearing the token and reloading', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    renderStripe(authManager);
    await screen.findByTestId('stripe-webhook-url');
    authManager.webhookEndpoint = {
      ...authManager.webhookEndpoint,
      path: '/extensions/cedros-pay/webhook/stripe?token=rotated',
    };

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate URL' }));

    await waitFor(() => {
      expect(screen.getByTestId('stripe-webhook-url')).toHaveTextContent('token=rotated');
    });
    const rotate = authManager.mutationRequests().find((request) =>
      String(request.options?.body).includes('"webhook_token":null')
    );
    expect(rotate?.path).toBe('/admin/config/stripe');
  });

  it('does not render local config history controls', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    renderStripe(authManager);

    await screen.findByLabelText('Publishable key');

    expect(screen.queryByRole('button', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.queryByText('Change history')).not.toBeInTheDocument();
  });

  it('autosaves field edits and rail toggles together', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    renderStripe(authManager);

    const input = await screen.findByLabelText('Publishable key');
    fireEvent.change(input, { target: { value: 'pk_test_456' } });

    fireEvent.click(screen.getByRole('switch', { name: 'Turn Stripe on or off' }));
    await waitFor(() => expect(authManager.mutationRequests()).toHaveLength(1));

    const body = JSON.parse(String(authManager.mutationRequests()[0].options?.body));
    expect(body.config.enabled).toBe(false);
    expect(body.config.publishable_key).toBe('pk_test_456');

    fireEvent.click(screen.getByRole('switch', { name: 'Turn Stripe on or off' }));
    expect(await screen.findByLabelText('Publishable key')).toHaveValue('pk_test_456');
    await waitFor(() => expect(authManager.mutationRequests()).toHaveLength(2));
  });

  it('keeps pending edits visible after the rail is switched off until autosave finishes', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    renderStripe(authManager);

    const input = await screen.findByLabelText('Publishable key');
    fireEvent.change(input, { target: { value: 'pk_test_999' } });

    // Switching the rail off must not hide a pending edit (silent data loss).
    fireEvent.click(screen.getByRole('switch', { name: 'Turn Stripe on or off' }));

    expect(screen.getByLabelText('Publishable key')).toHaveValue('pk_test_999');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    // Autosave clears the edit, and the now-clean off rail collapses.
    await waitFor(() => expect(authManager.mutationRequests()).toHaveLength(1));
    await waitFor(() =>
      expect(screen.queryByLabelText('Publishable key')).not.toBeInTheDocument()
    );
    expect(screen.getByText(/turned off/)).toBeInTheDocument();
  });

  it('turning on Credits persists the Pay-side credits flags', async () => {
    const authManager = new FakeAuthManager({ cedros_login: { ...CEDROS_LOGIN_CONFIG } });
    render(
      <SingleCategorySettings
        serverUrl="https://example.test"
        authManager={authManager}
        category="cedros_login"
        title="Credits"
        enabledField="credits_enabled"
        enableImplies={['enabled']}
        showEnabledToggle={true}
      />
    );

    fireEvent.click(
      await screen.findByRole('switch', { name: 'Turn Credits on or off' })
    );
    await waitFor(() => expect(authManager.mutationRequests()).toHaveLength(1));

    const body = JSON.parse(String(authManager.mutationRequests()[0].options?.body));
    expect(body.config.credits_enabled).toBe(true);
    expect(body.config.enabled).toBe(true);
  });

  it('blocks a rail toggle when a required dependency is missing', async () => {
    const authManager = new FakeAuthManager({ cedros_login: { ...CEDROS_LOGIN_CONFIG } });
    render(
      <SingleCategorySettings
        serverUrl="https://example.test"
        authManager={authManager}
        category="cedros_login"
        title="Credits"
        enabledField="credits_enabled"
        showEnabledToggle={true}
        blockedReason="Install Cedros Balance before enabling Credits."
        blockedTitle="Cedros Balance required"
      />
    );

    const toggle = await screen.findByRole('switch', { name: 'Turn Credits on or off' });
    expect(toggle).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Cedros Balance required');

    fireEvent.click(toggle);
    expect(authManager.mutationRequests()).toHaveLength(0);
  });

  it('does not render legacy Cedros Login connection fields for Credits', async () => {
    const authManager = new FakeAuthManager({
      cedros_login: { ...CEDROS_LOGIN_CONFIG, enabled: true, credits_enabled: true },
    });
    render(
      <SingleCategorySettings
        serverUrl="https://example.test"
        authManager={authManager}
        category="cedros_login"
        title="Credits"
        enabledField="credits_enabled"
        showEnabledToggle={true}
        setupNote="Cedros Balance handles credit balances."
        hideEditor={true}
        hideActions={true}
      />
    );

    expect(await screen.findByText('Cedros Balance handles credit balances.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cedros Login URL')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('does not render manual reset controls on autosaved settings', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    renderStripe(authManager);

    const input = await screen.findByLabelText('Publishable key');
    fireEvent.change(input, { target: { value: 'pk_test_789' } });

    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await waitFor(() => expect(authManager.mutationRequests()).toHaveLength(1));
    expect(JSON.parse(String(authManager.mutationRequests()[0].options?.body)).config.publishable_key)
      .toBe('pk_test_789');
  });

  it('renders curated Stripe fields: ordering, endpoint URL, hidden internals, saved secret', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    renderStripe(authManager);

    await screen.findByLabelText('Publishable key');

    // Mode renders as a segmented control ahead of the key fields.
    const testOption = screen.getByRole('button', { name: 'Test mode' });
    expect(testOption).toHaveAttribute('aria-pressed', 'true');
    expect(
      testOption.compareDocumentPosition(screen.getByLabelText('Publishable key')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // The webhook endpoint is shown ready to copy, token included.
    expect(screen.getByTestId('stripe-webhook-url')).toHaveTextContent(
      `https://example.test${authManager.webhookEndpoint.path}`
    );

    // Saved secrets read as saved instead of leaking the redaction placeholder.
    expect(screen.getByText('Saved')).toBeInTheDocument();

    // Internal fields stay hidden; optional ones live under Advanced.
    expect(screen.queryByLabelText('Success Url')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Mobile app redirect schemes')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByLabelText('Mobile app redirect schemes')).toBeInTheDocument();
  });

  it('joins the webhook path to the site origin, not the extension mount', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON } });
    render(
      <SingleCategorySettings
        serverUrl="https://example.test/extensions/cedros-pay/"
        authManager={authManager}
        category="stripe"
        title="Stripe"
        showEnabledToggle={true}
      />
    );

    expect(await screen.findByTestId('stripe-webhook-url')).toHaveTextContent(
      `https://example.test${authManager.webhookEndpoint.path}`
    );
  });

  it('defaults a blank Stripe mode to Test mode without flagging an unsaved change', async () => {
    const authManager = new FakeAuthManager({ stripe: { ...STRIPE_CONFIG_ON, mode: '' } });
    renderStripe(authManager);

    // The empty server value lands on Test mode, shown selected.
    const testOption = await screen.findByRole('button', { name: 'Test mode' });
    expect(testOption).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Live mode' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Filling a default is not a user edit: no unsaved prompt or manual save control.
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('groups App Store fields behind their per-store toggles', async () => {
    const authManager = new FakeAuthManager({ native_store: { ...NATIVE_STORE_CONFIG } });
    render(
      <SingleCategorySettings
        serverUrl="https://example.test"
        authManager={authManager}
        category="native_store"
        title="App stores"
        showEnabledToggle={true}
      />
    );

    await screen.findByText('Apple App Store');

    // Apple is off: its fields are hidden. Google is on: its fields show.
    expect(screen.queryByLabelText('Issuer ID')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Service account email')).toBeInTheDocument();
    expect(
      screen.getByText('https://example.test/paywall/v1/native-store/google/notifications')
    ).toBeInTheDocument();

    // Turning Apple on reveals its fields as a draft edit.
    fireEvent.click(screen.getByRole('switch', { name: 'Enable Apple App Store' }));
    expect(screen.getByLabelText('Issuer ID')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });
});
