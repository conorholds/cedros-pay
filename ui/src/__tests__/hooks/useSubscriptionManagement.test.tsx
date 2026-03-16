import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSubscriptionManagement } from '../../hooks/useSubscriptionManagement';

const mockSubscriptionChangeManager = {
  getDetails: vi.fn(),
  previewChange: vi.fn(),
  changeSubscription: vi.fn(),
  cancel: vi.fn(),
  getBillingPortalUrl: vi.fn(),
};

vi.mock('../../context', () => ({
  useCedrosContext: () => ({
    subscriptionChangeManager: mockSubscriptionChangeManager,
  }),
}));

describe('useSubscriptionManagement', () => {
  const subscriptionDetails = {
    id: 'sub_123',
    resource: 'plan-pro',
    status: 'active',
    interval: 'monthly',
    pricePerPeriod: 1999,
    currency: 'USD',
    cancelAtPeriodEnd: false,
    currentPeriodStart: '2025-01-01T00:00:00Z',
    currentPeriodEnd: '2025-02-01T00:00:00Z',
    createdAt: '2024-06-01T00:00:00Z',
    paymentMethod: 'stripe',
    customerId: 'cus_123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionChangeManager.getDetails.mockResolvedValue(subscriptionDetails);
    mockSubscriptionChangeManager.changeSubscription.mockResolvedValue({
      success: true,
      subscriptionId: 'sub_123',
      previousResource: 'plan-pro',
      newResource: 'plan-enterprise',
      status: 'active',
      currentPeriodEnd: '2025-03-01T00:00:00Z',
      prorationBehavior: 'create_prorations',
    });
    mockSubscriptionChangeManager.cancel.mockResolvedValue({
      success: true,
      atPeriodEnd: true,
    });
    mockSubscriptionChangeManager.getBillingPortalUrl.mockResolvedValue({
      url: 'https://billing.stripe.com/p/session/test_123',
    });
  });

  it('sends subscription ids for change and cancel operations', async () => {
    const { result } = renderHook(() => useSubscriptionManagement());

    await act(async () => {
      await result.current.loadSubscription('plan-pro', 'user@example.com');
    });

    await act(async () => {
      await result.current.changeSubscription({
        newResource: 'plan-enterprise',
        prorationBehavior: 'create_prorations',
      });
    });

    await act(async () => {
      await result.current.cancelSubscription(false);
    });

    expect(mockSubscriptionChangeManager.changeSubscription).toHaveBeenCalledWith({
      subscriptionId: 'sub_123',
      newResource: 'plan-enterprise',
      prorationBehavior: 'create_prorations',
    });
    expect(result.current.subscription?.interval).toBe('monthly');
    expect(mockSubscriptionChangeManager.cancel).toHaveBeenCalledWith({
      subscriptionId: 'sub_123',
      atPeriodEnd: true,
    });
  });

  it('uses the loaded Stripe customer id for billing portal requests', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'https://example.com/current' },
    });

    const { result } = renderHook(() => useSubscriptionManagement());

    await act(async () => {
      await result.current.loadSubscription('plan-pro', 'user@example.com');
    });

    await act(async () => {
      await result.current.openBillingPortal('user@example.com', 'https://example.com/settings');
    });

    expect(mockSubscriptionChangeManager.getBillingPortalUrl).toHaveBeenCalledWith({
      customerId: 'cus_123',
      returnUrl: 'https://example.com/settings',
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
