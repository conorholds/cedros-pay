import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionChangeManager } from '../managers/SubscriptionChangeManager';

// Mock dependencies
vi.mock('../utils/fetchWithTimeout', () => ({
  fetchWithTimeout: vi.fn(),
}));

import { fetchWithTimeout } from '../utils/fetchWithTimeout';

describe('SubscriptionChangeManager', () => {
  let manager: SubscriptionChangeManager;
  const mockRouteDiscovery = {
    buildUrl: vi.fn((path: string) => Promise.resolve(`https://api.example.com${path}`)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager = new SubscriptionChangeManager(mockRouteDiscovery as any);
  });

  describe('changeSubscription', () => {
    it('successfully changes subscription plan', async () => {
      const mockResponse = {
        success: true,
        subscriptionId: 'sub_123',
        previousResource: 'plan-pro',
        status: 'active',
        newResource: 'plan-enterprise',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
        prorationBehavior: 'create_prorations',
      };

      vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await manager.changeSubscription({
        subscriptionId: 'sub_123',
        newResource: 'plan-enterprise',
        prorationBehavior: 'create_prorations',
      });

      expect(result).toEqual(mockResponse);
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://api.example.com/paywall/v1/subscription/change',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Idempotency-Key': expect.any(String),
          }),
          body: JSON.stringify({
            subscriptionId: 'sub_123',
            newResource: 'plan-enterprise',
            prorationBehavior: 'create_prorations',
          }),
        })
      );
    });

    it('handles change failure', async () => {
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid plan transition'),
      } as Response);

      await expect(
        manager.changeSubscription({
          subscriptionId: 'sub_123',
          newResource: 'invalid-plan',
        })
      ).rejects.toThrow();
    });
  });

  describe('previewChange', () => {
    it('returns proration preview', async () => {
      const mockPreview = {
        success: true,
        immediateAmount: 1500,
        currency: 'USD',
        currentPlanPrice: 1999,
        newPlanPrice: 4999,
        daysRemaining: 15,
        effectiveDate: '2025-01-15T00:00:00Z',
        prorationDetails: {
          unusedCredit: 1000,
          newPlanCost: 2500,
        },
      };

      vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPreview),
      } as Response);

      const result = await manager.previewChange({
        currentResource: 'plan-pro',
        newResource: 'plan-enterprise',
        userId: 'user@example.com',
      });

      expect(result).toEqual(mockPreview);
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://api.example.com/paywall/v1/subscription/change/preview',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('getDetails', () => {
    it('returns subscription details', async () => {
      const mockDetails = {
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
      };

      vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDetails),
      } as Response);

      const result = await manager.getDetails('plan-pro', 'user@example.com');

      expect(result).toEqual(mockDetails);
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/paywall/v1/subscription/details'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('cancel', () => {
    it('cancels subscription at period end', async () => {
      const mockResponse = {
        success: true,
        atPeriodEnd: true,
      };

      vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await manager.cancel({
        subscriptionId: 'sub_123',
        atPeriodEnd: true,
      });

      expect(result).toEqual(mockResponse);
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://api.example.com/paywall/v1/subscription/cancel',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            subscriptionId: 'sub_123',
            atPeriodEnd: true,
          }),
        })
      );
    });

    it('cancels subscription immediately', async () => {
      const mockResponse = {
        success: true,
        atPeriodEnd: false,
      };

      vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await manager.cancel({
        subscriptionId: 'sub_123',
        atPeriodEnd: false,
      });

      expect(result.atPeriodEnd).toBe(false);
    });
  });

  describe('getBillingPortalUrl', () => {
    it('returns billing portal URL', async () => {
      const mockResponse = {
        url: 'https://billing.stripe.com/p/session/test_abc123',
      };

      vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await manager.getBillingPortalUrl({
        customerId: 'cus_123',
        returnUrl: 'https://example.com/settings',
      });

      expect(result.url).toContain('billing.stripe.com');
      expect(fetchWithTimeout).toHaveBeenCalledWith(
        'https://api.example.com/paywall/v1/subscription/portal',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cus_123',
            returnUrl: 'https://example.com/settings',
          }),
        })
      );
    });
  });
});
