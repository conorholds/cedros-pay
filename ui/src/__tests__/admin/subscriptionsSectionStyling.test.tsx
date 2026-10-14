import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionsSection } from '../../components/admin/SubscriptionsSection';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';

function buildAuthManager(
  fetchWithAuth: IAdminAuthManager['fetchWithAuth']
): IAdminAuthManager {
  return {
    getAuthMethod: () => 'cedros-login',
    isAuthenticated: () => true,
    setCedrosLoginAuth: () => {},
    createAuthHeaders: async () => ({ Authorization: 'Bearer token' }),
    fetchWithAuth,
  };
}

describe('SubscriptionsSection styling', () => {
  it('shows a retryable load error without rendering default settings', async () => {
    let settingsAttempts = 0;
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/subscriptions/settings') {
        settingsAttempts += 1;
        if (settingsAttempts <= 2) throw new Error('offline');
        return { enabled: true, plans: [] };
      }
      if (path.startsWith('/admin/config/shop')) {
        return { category: 'shop', config: { inventory_enabled: true } };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(<SubscriptionsSection serverUrl="https://api.example.com" authManager={buildAuthManager(fetchWithAuth)} />);

    expect(await screen.findByText('Failed to load subscription settings')).toBeInTheDocument();
    expect(screen.queryByText('Enable subscriptions')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No active public plans')).toBeInTheDocument();
    expect(settingsAttempts).toBeGreaterThanOrEqual(3);
  });

  it('renders an operator action when subscriptions have no active public plans', async () => {
    const fetchWithAuth = vi.fn(async () => ({
      enabled: true,
      plans: [],
    })) as IAdminAuthManager['fetchWithAuth'];

    render(<SubscriptionsSection serverUrl="https://api.example.com" authManager={buildAuthManager(fetchWithAuth)} />);

    await waitFor(() => {
      expect(screen.getByText('No active public plans')).toBeInTheDocument();
    });
    expect(screen.getByText(/before Portal can offer plan selection/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|refresh/i })).not.toBeInTheDocument();
  });

  it('does not report an active private plan as Portal-ready', async () => {
    const fetchWithAuth = vi.fn(async () => ({
      enabled: true,
      plans: [
        {
          id: 'private',
          title: 'Private',
          description: 'Invite only',
          priceMonthlyUsd: 10,
          priceAnnualUsd: 100,
          features: [],
          isActive: true,
          public: false,
        },
      ],
    })) as IAdminAuthManager['fetchWithAuth'];

    render(
      <SubscriptionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('No active public plans')).toBeInTheDocument();
    expect(screen.getByText('Active public plans')).toBeInTheDocument();
  });

  it('renders the setup notice when subscriptions are turned off', async () => {
    const fetchWithAuth = vi.fn(async () => ({
      enabled: false,
      plans: [],
    })) as IAdminAuthManager['fetchWithAuth'];

    render(<SubscriptionsSection serverUrl="https://api.example.com" authManager={buildAuthManager(fetchWithAuth)} />);

    await waitFor(() => {
      expect(screen.getByText('Enable subscriptions')).toBeInTheDocument();
    });
    expect(screen.getByText(/Turn on subscriptions in Pay hub/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Pay hub' })).toHaveAttribute(
      'href',
      '/admin/settings/hub'
    );
  });

  it('does not autosave a cleared subscription plan price as free', async () => {
    const requests: Array<{ path: string; options?: RequestInit }> = [];
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      requests.push({ path, options });
      if (path === '/admin/subscriptions/settings' && !options) {
        return {
          enabled: true,
          plans: [
            {
              id: 'pro',
              title: 'Pro',
              description: 'For teams',
              priceMonthlyUsd: 10,
              priceAnnualUsd: 100,
              features: [],
              isPopular: false,
              isActive: true,
              sortOrder: 0,
            },
          ],
        };
      }
      if (path.startsWith('/admin/config/shop')) {
        return { category: 'shop', config: { inventory_enabled: true } };
      }
      if (path === '/admin/subscriptions/settings' && options?.method === 'PUT') {
        return JSON.parse(String(options.body));
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <SubscriptionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    const proLabels = await screen.findAllByText('Pro');
    fireEvent.click(proLabels[proLabels.length - 1]);
    const monthlyPriceInput = screen.getByDisplayValue('10') as HTMLInputElement;
    fireEvent.change(monthlyPriceInput, { target: { value: '' } });
    expect(monthlyPriceInput.value).toBe('');

    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(
      requests.some(
        (request) =>
          request.path === '/admin/subscriptions/settings' &&
          request.options?.method === 'PUT'
      )
    ).toBe(false);
    fireEvent.blur(monthlyPriceInput);
    expect(monthlyPriceInput.value).toBe('10');
  });

  it('autosaves subscription plan changes', async () => {
    const requests: Array<{ path: string; options?: RequestInit }> = [];
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      requests.push({ path, options });
      if (path === '/admin/subscriptions/settings' && !options) {
        return {
          enabled: true,
          plans: [
            {
              id: 'pro',
              title: 'Pro',
              description: 'For teams',
              priceMonthlyUsd: 10,
              priceAnnualUsd: 100,
              features: [],
              isPopular: false,
              isActive: true,
              sortOrder: 0,
            },
          ],
        };
      }
      if (path.startsWith('/admin/config/shop')) {
        return { category: 'shop', config: { inventory_enabled: true } };
      }
      if (path === '/admin/subscriptions/settings' && options?.method === 'PUT') {
        return JSON.parse(String(options.body));
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <SubscriptionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    const proLabels = await screen.findAllByText('Pro');
    expect(
      screen.queryByRole('button', { name: /Save plan changes/i })
    ).not.toBeInTheDocument();

    fireEvent.click(proLabels[proLabels.length - 1]);
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '12' } });

    await waitFor(() => {
      expect(
        requests.some(
          (request) =>
            request.path === '/admin/subscriptions/settings' &&
            request.options?.method === 'PUT'
        )
      ).toBe(true);
    });

    const saveRequest = requests.find(
      (request) =>
        request.path === '/admin/subscriptions/settings' &&
        request.options?.method === 'PUT'
    );
    const body = JSON.parse(String(saveRequest?.options?.body));
    expect(body.plans[0].priceMonthlyUsd).toBe(12);
  });

  it('names the plan and impact before a permanent delete', async () => {
    const requests: Array<{ path: string; options?: RequestInit }> = [];
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      requests.push({ path, options });
      if (path === '/admin/subscriptions/settings' && !options) {
        return {
          enabled: true,
          plans: [{
            id: 'pro',
            title: 'Pro',
            description: 'For teams',
            priceMonthlyUsd: 10,
            priceAnnualUsd: 100,
            features: ['Priority support'],
            isPopular: false,
            isActive: true,
            sortOrder: 0,
          }],
        };
      }
      if (path.startsWith('/admin/config/shop')) {
        return { category: 'shop', config: { inventory_enabled: true } };
      }
      if (path === '/admin/subscriptions/settings' && options?.method === 'PUT') {
        return JSON.parse(String(options.body));
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(<SubscriptionsSection serverUrl="https://api.example.com" authManager={buildAuthManager(fetchWithAuth)} />);
    const deleteButton = await screen.findByRole('button', { name: 'Delete Pro plan' });

    fireEvent.click(deleteButton);
    expect(screen.getByRole('heading', { name: 'Delete “Pro”?' })).toBeInTheDocument();
    expect(screen.getByText(/permanently removes the plan and its configured features/)).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Delete Pro plan' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Pro plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan' }));
    await waitFor(() => {
      const save = requests.find((request) => request.options?.method === 'PUT');
      expect(JSON.parse(String(save?.options?.body)).plans).toEqual([]);
    });
  });
});
