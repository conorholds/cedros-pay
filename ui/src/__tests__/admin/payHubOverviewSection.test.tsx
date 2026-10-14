import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PayHubOverviewSection } from '../../components/admin/PayHubOverviewSection';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';

type FakeAuthOptions = {
  failEnrollment?: boolean;
  failLoad?: boolean;
  failShopWrite?: boolean;
  guardedActive?: boolean;
  paymentRailReady?: boolean;
  shopConfig?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  subscriptionResponse?: Record<string, unknown>;
  unsupportedRoutes?: string[];
};

const CLEAR_STATS = {
  totalRevenue: 240,
  totalTransactions: 4,
  activeProducts: 2,
  sellableProducts: 2,
  pendingRefunds: 0,
  revenueByMethod: { stripe: 240, x402: 0, credits: 0 },
  transactionsByMethod: { stripe: 4, x402: 0, credits: 0 },
  orders: { total: 4, paid: 4, refunded: 0, pending: 0, failed: 0, revenue: 240 },
};

const EMPTY_STATS = {
  totalRevenue: 0,
  totalTransactions: 0,
  activeProducts: 0,
  sellableProducts: 0,
  pendingRefunds: 0,
  revenueByMethod: { stripe: 0, x402: 0, credits: 0 },
  transactionsByMethod: { stripe: 0, x402: 0, credits: 0 },
  orders: { total: 0, paid: 0, refunded: 0, pending: 0, failed: 0, revenue: 0 },
};

class FakeAuthManager implements IAdminAuthManager {
  requests: Array<{ path: string; options?: RequestInit }> = [];

  private readonly failEnrollment: boolean;
  private readonly failLoad: boolean;
  private readonly failShopWrite: boolean;
  private guardedActive: boolean;
  private readonly paymentRailReady: boolean;
  private readonly shopConfig: Record<string, unknown>;
  private stats: Record<string, unknown>;
  private readonly subscriptionResponse: Record<string, unknown>;
  private readonly unsupportedRoutes: string[];

  constructor(options: FakeAuthOptions = {}) {
    this.failEnrollment = options.failEnrollment ?? false;
    this.failLoad = options.failLoad ?? false;
    this.failShopWrite = options.failShopWrite ?? false;
    this.guardedActive = options.guardedActive ?? true;
    this.paymentRailReady = options.paymentRailReady ?? true;
    this.shopConfig = options.shopConfig ?? {
      refunds_enabled: true,
      returns_enabled: true,
      inventory_enabled: true,
      coupons_enabled: false,
    };
    this.subscriptionResponse = options.subscriptionResponse ?? {
      enabled: true,
      plans: [],
      pageTitle: 'Choose Your Plan',
      pageSubtitle: 'Pick a tier.',
      revision: 1,
      etag: '"subscription-settings:1"',
    };
    this.unsupportedRoutes = options.unsupportedRoutes ?? [];
    this.stats = options.stats ?? {
      ...CLEAR_STATS,
      pendingRefunds: 1,
      orders: { total: 4, paid: 2, refunded: 0, pending: 1, failed: 1, revenue: 240 },
    };
  }

  setStats(stats: Record<string, unknown>) {
    this.stats = stats;
  }

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
    if (this.failLoad) throw new Error('load failed');
    if (path === '/admin/subscriptions/settings' && !options) {
      return this.subscriptionResponse as T;
    }
    if (path.startsWith('/admin/config/shop') && !options?.method) {
      return {
        category: 'shop',
        config: this.shopConfig,
        updatedAt: '',
        secretsRedacted: true,
      } as T;
    }
    if (path.startsWith('/admin/config/stripe') && !options?.method) {
      return {
        category: 'stripe',
        config: this.paymentRailReady
          ? { enabled: true, publishable_key: 'pk_test_ready', secret_key: '[REDACTED]' }
          : { enabled: false },
        updatedAt: '',
        secretsRedacted: true,
      } as T;
    }
    if (path.startsWith('/admin/config/x402') && !options?.method) {
      return { category: 'x402', config: { enabled: false }, updatedAt: '', secretsRedacted: true } as T;
    }
    if (path.startsWith('/admin/config/cedros_login') && !options?.method) {
      return { category: 'cedros_login', config: { enabled: false }, updatedAt: '', secretsRedacted: true } as T;
    }
    if (path === '/admin/v1/status' && !options) {
      return {
        launchStatus: this.guardedActive ? 'ready' : 'blocked',
        guardedPolicy: { active: this.guardedActive },
        runtime: 'wasm',
        unsupportedRoutes: this.unsupportedRoutes,
      } as T;
    }
    if (path === '/admin/stats' && !options) {
      return this.stats as T;
    }
    if (path === '/admin/guarded-policy/enroll' && options?.method === 'POST') {
      if (this.failEnrollment) throw new Error('guarded policy enrollment failed');
      this.guardedActive = true;
      return {} as T;
    }
    if (path === '/admin/subscriptions/settings' && options?.method === 'PUT') {
      return {
        ...JSON.parse(String(options.body)),
        revision: 3,
        etag: '"subscription-settings:3"',
      } as T;
    }
    if (path.startsWith('/admin/config/shop') && options?.method === 'PATCH') {
      if (this.failShopWrite) throw new Error('shop config write failed');
      return { updated: true } as T;
    }
    if (options?.method === 'PATCH') {
      return { updated: true } as T;
    }
    throw new Error(`Unexpected path: ${path}`);
  }
}

async function openWorkflowEditor() {
  expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  expect(
    await screen.findByRole('switch', { name: 'Turn Subscriptions on or off' })
  ).toBeInTheDocument();
}

describe('PayHubOverviewSection', () => {
  const autosaveWait = { timeout: 2500 };

  it('reports the configured launch state without exposing completed internal setup', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({ stats: CLEAR_STATS })}
      />
    );

    expect(await screen.findByText('Checkout is enabled')).toBeInTheDocument();
    expect(screen.getByText('Stripe · 2 products')).toBeInTheDocument();
    // The steps stay reachable, but collapsed and unlabelled as work to do.
    expect(screen.getByRole('button', { name: /Setup steps/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    fireEvent.click(screen.getByRole('button', { name: /Setup steps/ }));
    expect(screen.getByText('Connect a payment method')).toBeInTheDocument();
    expect(screen.queryByText('Activate checkout')).not.toBeInTheDocument();
    expect(screen.queryByText(/guarded/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('reports which workflows are on before the editor is opened', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({ stats: CLEAR_STATS })}
      />
    );

    expect(
      await screen.findByText('On — Subscriptions, Refunds, Returns, Inventory, Shipping, Taxes')
    ).toBeInTheDocument();
    expect(screen.getByText('Off — Coupons')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows queue work only while a queue has work, with the count on the action', async () => {
    const { unmount } = render(
      <PayHubOverviewSection serverUrl="https://example.test" authManager={new FakeAuthManager()} />
    );

    expect(await screen.findByText('2 orders and 1 refund need attention.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review 2 orders' })).toHaveAttribute(
      'href',
      '/admin/cedros-pay:admin:cedros-pay:transactions/orders'
    );
    expect(screen.getByRole('link', { name: 'Review 1 refund' })).toBeInTheDocument();
    unmount();

    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({ stats: CLEAR_STATS })}
      />
    );

    expect(await screen.findByText('Checkout is enabled')).toBeInTheDocument();
    expect(screen.queryByText(/need attention/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Review/ })).not.toBeInTheDocument();
  });

  it('binds payment outcomes to their destination instead of a separate action row', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({ stats: CLEAR_STATS })}
      />
    );

    const revenue = await screen.findByRole('link', {
      name: /Revenue collected: \$240\.00\. View in transactions\./,
    });
    expect(revenue).toHaveAttribute(
      'href',
      '/admin/cedros-pay:admin:cedros-pay:transactions/transactions'
    );
    expect(
      screen.getByRole('link', { name: /Payments completed: 4\. View in transactions\./ })
    ).toBeInTheDocument();
  });

  it('turns an empty first use into a single next decision', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({
          guardedActive: false,
          paymentRailReady: false,
          stats: EMPTY_STATS,
        })}
      />
    );

    expect(await screen.findByText('Start taking payments')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up Stripe' })).toBeInTheDocument();
    // Later steps stay visible as progress, but carry no competing action.
    expect(screen.getByText('Add a product with a price')).toBeInTheDocument();
    expect(screen.getByText('Activate checkout')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add a product' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Activate checkout' })).not.toBeInTheDocument();
    // Checkout has never opened, so there are no outcomes worth a card yet.
    expect(screen.queryByText('Revenue collected')).not.toBeInTheDocument();
  });

  it('omits completed checkout activation while another setup step remains', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({
          guardedActive: true,
          paymentRailReady: false,
          stats: CLEAR_STATS,
        })}
      />
    );

    expect(await screen.findByText('Start taking payments')).toBeInTheDocument();
    expect(screen.getByText('Connect a payment method')).toBeInTheDocument();
    expect(screen.getByText('Add a product with a price')).toBeInTheDocument();
    expect(screen.queryByText('Activate checkout')).not.toBeInTheDocument();
    expect(screen.queryByText(/guarded/i)).not.toBeInTheDocument();
  });

  it('keeps recorded payments visible even when checkout is switched back off', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({ guardedActive: false, stats: CLEAR_STATS })}
      />
    );

    expect(await screen.findByText('Open checkout')).toBeInTheDocument();
    expect(screen.getByText('Revenue collected')).toBeInTheDocument();
  });

  it('asks for a live checkout once payment and product setup are done', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({ guardedActive: false, stats: CLEAR_STATS })}
      />
    );

    expect(await screen.findByText('Open checkout')).toBeInTheDocument();
    expect(screen.getByText('Stripe is ready for checkout.')).toBeInTheDocument();
    expect(screen.getByText('2 products can be sold at checkout.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate checkout' })).toBeEnabled();
  });

  it('keeps an unsupported workflow visible and disabled with a user-facing reason', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({
          stats: CLEAR_STATS,
          unsupportedRoutes: ['cedros-pay:admin-returns-list'],
        })}
      />
    );

    expect(
      await screen.findByText('Off — Coupons · Unavailable — Returns')
    ).toBeInTheDocument();
    await openWorkflowEditor();
    expect(screen.getByRole('switch', { name: 'Turn Returns on or off' })).toBeDisabled();
    expect(screen.getByText('This workflow isn’t supported for this site yet.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Turn Refunds on or off' })).toBeEnabled();
  });

  it('requires an explicit confirmation before activating checkout', async () => {
    const authManager = new FakeAuthManager({ guardedActive: false, stats: CLEAR_STATS });
    render(<PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />);

    expect(await screen.findByText('Open checkout')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Activate checkout' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('one-time setup');
    expect(screen.getByRole('dialog')).not.toHaveTextContent(/guarded/i);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activate checkout' }));

    expect(await screen.findByText('Checkout is enabled')).toBeInTheDocument();
    expect(
      authManager.requests.some(
        (request) => request.path === '/admin/guarded-policy/enroll' && request.options?.method === 'POST'
      )
    ).toBe(true);
  });

  it('explains activation failure inside the dialog that is still open', async () => {
    const authManager = new FakeAuthManager({
      failEnrollment: true,
      guardedActive: false,
      stats: CLEAR_STATS,
    });
    render(<PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />);

    expect(await screen.findByText('Open checkout')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Activate checkout' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activate checkout' }));

    const dialog = await screen.findByRole('dialog');
    // The failure has to be readable where the operator is looking; behind the
    // overlay it is invisible.
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/Checkout activation failed/);
    expect(within(dialog).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
  });

  it('keeps a dismissed activation failure recoverable on the page', async () => {
    const authManager = new FakeAuthManager({
      failEnrollment: true,
      guardedActive: false,
      stats: CLEAR_STATS,
    });
    render(<PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />);

    expect(await screen.findByText('Open checkout')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Activate checkout' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activate checkout' }));
    await screen.findByRole('alert');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Checkout activation failed/);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('says so when the ledger scan behind the totals was truncated', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({ stats: { ...CLEAR_STATS, truncated: true } })}
      />
    );

    expect(await screen.findAllByText('Partial — scan limit reached')).toHaveLength(2);
    expect(
      screen.getByText(/Payment stats may be partial because the ledger scan hit the admin row limit/)
    ).toBeInTheDocument();
    expect(screen.queryByText('All time')).not.toBeInTheDocument();
  });

  it('keeps the settled page on screen while activation refreshes it', async () => {
    const authManager = new FakeAuthManager({ guardedActive: false, stats: CLEAR_STATS });
    render(<PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />);

    expect(await screen.findByText('Open checkout')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Activate checkout' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activate checkout' }));

    expect(await screen.findByText('Checkout is enabled')).toBeInTheDocument();
    // The reload must not be mistaken for a workflow edit and written back.
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(
      authManager.requests.filter((request) => request.path === '/admin/config/shop' && request.options?.method)
    ).toHaveLength(0);
  });

  it('tells a live but untested checkout to run one buyer payment', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({
          stats: { ...EMPTY_STATS, activeProducts: 1, sellableProducts: 1 },
        })}
      />
    );

    expect(await screen.findByText('Checkout is enabled')).toBeInTheDocument();
    expect(
      screen.getByText('No payments yet — run one buyer checkout to confirm the setup end to end.')
    ).toBeInTheDocument();
  });

  it('writes only the shop flags the change actually named', async () => {
    const authManager = new FakeAuthManager({ stats: CLEAR_STATS });
    render(
      <PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />
    );

    await openWorkflowEditor();
    expect(
      screen.queryByRole('button', { name: /Save feature visibility/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Turn Coupons on or off' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Turn Returns on or off' }));

    await waitFor(() => {
      expect(
        authManager.requests.some((request) => request.path === '/admin/config/shop' && request.options?.method)
      ).toBe(true);
    }, autosaveWait);

    const shopConfigSave = authManager.requests.find(
      (request) => request.path === '/admin/config/shop' && request.options?.method
    );
    expect(JSON.parse(String(shopConfigSave?.options?.body))).toEqual({
      updates: { returns_enabled: false, coupons_enabled: true },
      description: 'Updated via Pay hub overview',
      expectedRevision: null,
      mutationId: expect.any(String),
    });
  });

  it('never rewrites subscription settings for an unrelated workflow toggle', async () => {
    const authManager = new FakeAuthManager({ stats: CLEAR_STATS });
    render(
      <PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />
    );

    await openWorkflowEditor();
    fireEvent.click(screen.getByRole('switch', { name: 'Turn Coupons on or off' }));

    await waitFor(() => {
      expect(
        authManager.requests.some((request) => request.path === '/admin/config/shop' && request.options?.method)
      ).toBe(true);
    }, autosaveWait);

    // Toggling Coupons must not push this page's loaded copy of `plans` back
    // over whatever Catalog has saved since the overview loaded.
    expect(
      authManager.requests.filter(
        (request) =>
          request.path === '/admin/subscriptions/settings' && request.options?.method === 'PUT'
      )
    ).toHaveLength(0);
    expect(
      authManager.requests.filter((request) => request.path === '/admin/config/subscriptions')
    ).toHaveLength(0);
  });

  it('offers retry and discard when a workflow save fails, and keeps the choice', async () => {
    const authManager = new FakeAuthManager({ failShopWrite: true, stats: CLEAR_STATS });
    render(
      <PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />
    );

    await openWorkflowEditor();
    fireEvent.click(screen.getByRole('switch', { name: 'Turn Coupons on or off' }));

    const failure = await screen.findByRole('alert', {}, autosaveWait);
    expect(failure).toHaveTextContent('Cedros couldn’t save your workflow changes.');
    // The operator's choice survives the failure — nothing is silently reverted.
    expect(screen.getByRole('switch', { name: 'Turn Coupons on or off' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    fireEvent.click(within(failure).getByRole('button', { name: 'Discard' }));

    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Turn Coupons on or off' })).toHaveAttribute(
        'aria-checked',
        'false'
      )
    );
    // Discarding must settle: no queued replay may resurface the failure after
    // the debounce window has passed.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Turn Coupons on or off' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('does not let a reload overwrite a workflow edit that has not saved yet', async () => {
    const authManager = new FakeAuthManager({ failShopWrite: true, stats: CLEAR_STATS });
    render(
      <PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />
    );

    await openWorkflowEditor();
    fireEvent.click(screen.getByRole('switch', { name: 'Turn Coupons on or off' }));
    const failure = await screen.findByRole('alert', {}, autosaveWait);

    // Retry re-reads nothing, but a Discard/Reload path does; either way the
    // pending choice must survive until the operator resolves it.
    fireEvent.click(within(failure).getByRole('button', { name: 'Retry' }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.getByRole('switch', { name: 'Turn Coupons on or off' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('refreshes queue counts in the background without touching the editor', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const authManager = new FakeAuthManager({ stats: CLEAR_STATS });
      render(
        <PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />
      );

      await screen.findByText('Checkout is enabled');
      expect(screen.queryByText(/need attention/)).not.toBeInTheDocument();

      authManager.setStats({
        ...CLEAR_STATS,
        pendingRefunds: 1,
        orders: { total: 4, paid: 2, refunded: 0, pending: 1, failed: 1, revenue: 240 },
      });
      await vi.advanceTimersByTimeAsync(31000);

      expect(await screen.findByText('2 orders and 1 refund need attention.')).toBeInTheDocument();
      // The poll must not re-read or rewrite the settings half.
      expect(
        authManager.requests.filter((request) => request.path.startsWith('/admin/config/shop'))
      ).toHaveLength(1);
    } finally {
      random.mockRestore();
      vi.useRealTimers();
    }
  });

  it('keeps a failed workflow save visible after the editor is closed', async () => {
    const authManager = new FakeAuthManager({ failShopWrite: true, stats: CLEAR_STATS });
    render(
      <PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />
    );

    await openWorkflowEditor();
    fireEvent.click(screen.getByRole('switch', { name: 'Turn Coupons on or off' }));
    await screen.findByRole('alert', {}, autosaveWait);

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Cedros couldn’t save your workflow changes.');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('enrolls guarded writes before enabling subscriptions', async () => {
    const authManager = new FakeAuthManager({
      stats: CLEAR_STATS,
      subscriptionResponse: {
        enabled: false,
        plans: [],
        revision: 1,
        etag: '"subscription-settings:1"',
      },
    });
    render(<PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />);

    await openWorkflowEditor();
    fireEvent.click(screen.getByRole('switch', { name: 'Turn Subscriptions on or off' }));

    await waitFor(() => {
      expect(
        authManager.requests.some(
          (request) =>
            request.path === '/admin/config/subscriptions' &&
            request.options?.method === 'PATCH'
        )
      ).toBe(true);
    });

    const paths = authManager.requests.map((request) => request.path);
    const enrollmentIndex = paths.indexOf('/admin/guarded-policy/enroll');
    const firstSettingsWriteIndex = paths.lastIndexOf('/admin/subscriptions/settings');
    const subscriptionConfigIndex = paths.indexOf('/admin/config/subscriptions');
    expect(enrollmentIndex).toBeGreaterThan(-1);
    expect(authManager.requests[enrollmentIndex]?.options).toMatchObject({
      method: 'POST',
      body: '{}',
    });
    expect(enrollmentIndex).toBeLessThan(firstSettingsWriteIndex);
    expect(enrollmentIndex).toBeLessThan(subscriptionConfigIndex);
  });

  it('does not persist subscription visibility when guarded enrollment fails', async () => {
    const authManager = new FakeAuthManager({
      failEnrollment: true,
      stats: CLEAR_STATS,
      subscriptionResponse: {
        enabled: false,
        plans: [],
        revision: 1,
        etag: '"subscription-settings:1"',
      },
    });
    render(<PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />);

    await openWorkflowEditor();
    fireEvent.click(screen.getByRole('switch', { name: 'Turn Subscriptions on or off' }));

    expect(await screen.findByRole('alert', {}, autosaveWait)).toHaveTextContent(
      'Cedros couldn’t save your workflow changes.'
    );
    const writePaths = authManager.requests
      .filter((request) => ['PATCH', 'PUT'].includes(String(request.options?.method)))
      .map((request) => request.path);
    expect(writePaths).not.toContain('/admin/subscriptions/settings');
    expect(writePaths).not.toContain('/admin/config/subscriptions');
    expect(writePaths).not.toContain('/admin/config/shop');
  });

  it('does not autosave immediately after loading the overview', async () => {
    const authManager = new FakeAuthManager({ stats: CLEAR_STATS });
    render(
      <PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />
    );

    await openWorkflowEditor();

    await new Promise((resolve) => setTimeout(resolve, 900));

    expect(
      authManager.requests.filter((request) => request.options?.method === 'PUT')
    ).toHaveLength(0);
    expect(
      authManager.requests.filter((request) => request.options?.method === 'PATCH')
    ).toHaveLength(0);
  });

  it('keeps a labelled path to the surface that owns subscription plans and copy', async () => {
    window.history.replaceState(
      null,
      '',
      '/admin/settings/hub?cedrosPaySectionId=cedros-pay%3Asettings-hub&cedrosPayTabId=cedros-pay%3Aoverview#overview'
    );
    const authManager = new FakeAuthManager({ stats: CLEAR_STATS });
    render(
      <PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />
    );

    await openWorkflowEditor();

    const catalogLink = screen.getByRole('link', { name: 'Catalog' });
    expect(catalogLink).toHaveAttribute(
      'href',
      '/admin/cedros-pay:admin:cedros-pay:catalog/subscriptions'
    );
    expect(catalogLink.getAttribute('href')).not.toContain('cedrosPaySectionId');
  });

  it('defaults subscriptions to enabled when the server omits the enabled flag', async () => {
    const authManager = new FakeAuthManager({
      shopConfig: {},
      stats: CLEAR_STATS,
      subscriptionResponse: {
        plans: [],
        pageTitle: 'Choose Your Plan',
        pageSubtitle: 'Pick a tier.',
      },
    });

    render(
      <PayHubOverviewSection serverUrl="https://example.test" authManager={authManager} />
    );

    await openWorkflowEditor();
    expect(screen.getByRole('switch', { name: 'Turn Subscriptions on or off' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('surfaces load failures explicitly', async () => {
    render(
      <PayHubOverviewSection
        serverUrl="https://example.test"
        authManager={new FakeAuthManager({ failLoad: true })}
      />
    );

    expect(await screen.findByText('Failed to load Pay hub overview settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
