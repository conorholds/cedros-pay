import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CedrosPayStatusCard } from '../../admin/dashboardCards';
import { cedrosPayPlugin } from '../../admin/plugin';
import type { DashboardCardContributionProps } from '../../admin/types';
import { CEDROS_PAY_STATUS_CARD_ID } from '../../extension/constants';

const fetchMock = vi.fn<typeof fetch>();
const stats = { totalTransactions: 12, orders: { failed: 2 }, pendingRefunds: 3, truncated: false };
const response = (body: unknown = stats) => new Response(JSON.stringify(body), { status: 200 });
function props(overrides: Partial<DashboardCardContributionProps> = {}): DashboardCardContributionProps {
  return {
    hostContext: {}, extensionId: 'cedros-pay', refreshInterval: 60_000,
    isLoading: false, analyticsSnapshot: null,
    pluginContext: {
      serverUrl: 'https://pay.example.com', locale: 'en-US',
      getAccessToken: () => null, hasPermission: (permission) => permission === 'cedros-pay:admin',
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockImplementation(async () => response());
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('Cedros Pay dashboard card contributions', () => {
  it('aligns manifest and runtime dashboard card contributions', async () => {
    const bootstrap = (await import('../../admin/register')).default();
    const manifestCards = bootstrap.manifest.adminModules?.[0].contributions?.dashboardCards ?? [];
    const runtimeCards = cedrosPayPlugin.contributions?.dashboardCards ?? [];
    expect(manifestCards.map((card) => card.id)).toEqual([CEDROS_PAY_STATUS_CARD_ID]);
    expect(runtimeCards.map((card) => card.id)).toEqual([CEDROS_PAY_STATUS_CARD_ID]);
    expect(runtimeCards[0]?.Component).toBe(CedrosPayStatusCard);
    expect(runtimeCards[0]?.order).toBe(manifestCards[0]?.order);
  });

  it('loads Pay independently of host analytics with host-session credentials and working links', async () => {
    const { container } = render(<CedrosPayStatusCard {...props({
      isLoading: true, analyticsError: 'Traffic unavailable',
      analyticsSnapshot: { paymentSucceeded: 999, rawCustomerEmail: 'buyer@example.com' },
    })} />);
    expect(screen.getByText('Loading payments…')).toBeTruthy();
    await screen.findByText('12');
    expect(fetchMock).toHaveBeenCalledWith('https://pay.example.com/admin/stats', expect.objectContaining({ credentials: 'include' }));
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(container.textContent).not.toMatch(/999|buyer@example.com|Traffic unavailable/);
    expect(screen.getByRole('link', { name: 'Review refunds' }).getAttribute('href')).toBe('/admin/cedros-pay:admin:cedros-pay:transactions/refunds');
    expect(container.querySelectorAll('.cedros-data-card')).toHaveLength(1);
    expect(container.querySelector('.cedros-data-card__body')).toBeTruthy();
    expect(screen.getByText(/Last checked/)).toBeTruthy();
  });

  it('fails closed without permission or server configuration', () => {
    const context = props().pluginContext;
    const { rerender } = render(<CedrosPayStatusCard {...props({ pluginContext: { ...context, hasPermission: () => false } })} />);
    expect(screen.getByText('No access')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    rerender(<CedrosPayStatusCard {...props({ pluginContext: { ...context, serverUrl: '' } })} />);
    expect(screen.getByRole('link', { name: 'Open setup' }).getAttribute('href')).toBe('/admin/settings/hub');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('supports token authentication and the existing admin permission alias', async () => {
    render(<CedrosPayStatusCard {...props({ pluginContext: {
      ...props().pluginContext, getAccessToken: () => 'test-token', hasPermission: (permission) => permission === 'admin',
    } })} />);
    await screen.findByText('12');
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: { Authorization: 'Bearer test-token' }, credentials: 'same-origin',
    }));
  });

  it('offers a working retry after a redacted first-load failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('secret provider detail'));
    render(<CedrosPayStatusCard {...props()} />);
    expect((await screen.findByRole('alert')).textContent).toContain("Payment summary couldn't load");
    expect(document.body.textContent).not.toContain('secret provider detail');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('12');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the error and retry control mounted until a retry succeeds', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    let completeRetry!: (value: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { completeRetry = resolve; }));
    render(<CedrosPayStatusCard {...props()} />);
    const button = await screen.findByRole('button', { name: 'Retry' });
    fireEvent.click(button);
    await act(async () => {});
    expect(screen.getByRole('button', { name: 'Retrying…' })).toBe(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Loading payments…')).toBeNull();
    await act(async () => { completeRetry(response()); });
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([null, [], 'invalid', {}, { error: 'unexpected envelope' }, { totalTransactions: -1 }])('rejects malformed payment responses: %j', async (body) => {
    fetchMock.mockResolvedValueOnce(response(body));
    render(<CedrosPayStatusCard {...props()} />);
    expect((await screen.findByRole('alert')).textContent).toContain("Payment summary couldn't load");
    expect(screen.queryByText('0')).toBeNull();
  });

  it('retains the last good snapshot when a refresh returns an invalid object', async () => {
    vi.useFakeTimers();
    render(<CedrosPayStatusCard {...props()} />);
    await act(async () => {});
    fetchMock.mockResolvedValueOnce(response({ error: 'unexpected envelope' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Refresh failed')).toBeTruthy();
    expect(screen.queryByText('Partial data')).toBeNull();
    expect(document.body.textContent).not.toContain('unexpected envelope');
  });

  it.each([401, 403])('clears protected data and stops polling after HTTP %i', async (status) => {
    vi.useFakeTimers();
    const initial = props();
    const view = render(<CedrosPayStatusCard {...initial} />);
    await act(async () => {});
    expect(screen.getByText('12')).toBeTruthy();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'private detail' }), { status }));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(screen.queryByText('12')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(document.body.textContent).not.toContain('private detail');
    if (status === 401) {
      expect(screen.getByText('Session expired')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reload admin' })).toBeTruthy();
    } else {
      expect(screen.getByText('No access')).toBeTruthy();
      expect(screen.queryByRole('button')).toBeNull();
    }
    await act(async () => { await vi.advanceTimersByTimeAsync(600_000); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // A new authenticated context can recover without retaining the rejected identity's data.
    view.rerender(<CedrosPayStatusCard {...initial} pluginContext={{
      ...initial.pluginContext, getAccessToken: () => 'renewed-token',
    }} />);
    await act(async () => {});
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('schedules polling after completion and aborts an outstanding request on unmount', async () => {
    vi.useFakeTimers();
    let complete!: (value: Response) => void;
    fetchMock.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const view = render(<CedrosPayStatusCard {...props({ refreshInterval: 30_000 })} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(14_000); });
    await act(async () => { complete(response()); });
    await act(async () => { await vi.advanceTimersByTimeAsync(29_999); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const signal = fetchMock.mock.calls[1][1]?.signal;
    expect(signal?.aborted).toBe(false);
    view.unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => { complete(response()); });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('collapses measured zeroes into an honest empty state', async () => {
    fetchMock.mockResolvedValueOnce(response({ totalTransactions: 0, orders: { failed: 0 }, pendingRefunds: 0 }));
    render(<CedrosPayStatusCard {...props()} />);
    await screen.findByText(/No settled payments/);
    expect(screen.queryByText('Partial data')).toBeNull();
    expect(screen.getByRole('link', { name: 'View transactions' }).getAttribute('href')).toBe('/admin/cedros-pay:admin:cedros-pay:transactions/transactions');
  });

  it('does not fabricate zeroes or rates for missing, invalid, or truncated data', async () => {
    fetchMock.mockResolvedValueOnce(response({ totalTransactions: 12, orders: { failed: -1 }, truncated: true }));
    render(<CedrosPayStatusCard {...props()} />);
    await screen.findByText('Partial data');
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.queryByText('Success rate')).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('retains the last summary on refresh failure, respects the host floor, and stops on unmount', async () => {
    vi.useFakeTimers();
    const view = render(<CedrosPayStatusCard {...props({ refreshInterval: 90_000 })} />);
    await act(async () => {});
    expect(screen.getByText('12')).toBeTruthy();
    fetchMock.mockRejectedValue(new Error('offline'));
    await act(async () => { await vi.advanceTimersByTimeAsync(89_999); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Refresh failed')).toBeTruthy();
    expect(screen.queryByText('Stale')).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(180_000); });
    expect(screen.getByText('Stale')).toBeTruthy();
    const calls = fetchMock.mock.calls.length;
    view.unmount();
    await vi.advanceTimersByTimeAsync(180_000);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });

  it('does not poll when the host disables refresh', async () => {
    vi.useFakeTimers();
    render(<CedrosPayStatusCard {...props({ refreshInterval: 0 })} />);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(600_000); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Stale')).toBeTruthy();
  });

  it('discards old-site responses and clears data when access is revoked', async () => {
    let resolveOld!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const initial = props();
    const { rerender } = render(<CedrosPayStatusCard {...initial} />);
    await act(async () => {});
    rerender(<CedrosPayStatusCard {...initial} pluginContext={{ ...initial.pluginContext, orgId: 'other-site' }} />);
    await screen.findByText('12');
    await act(async () => { resolveOld(response({ ...stats, totalTransactions: 999 })); });
    expect(screen.queryByText('999')).toBeNull();
    rerender(<CedrosPayStatusCard {...initial} pluginContext={{ ...initial.pluginContext, hasPermission: () => false }} />);
    expect(screen.queryByText('12')).toBeNull();
    expect(screen.getByText('No access')).toBeTruthy();
  });
});
