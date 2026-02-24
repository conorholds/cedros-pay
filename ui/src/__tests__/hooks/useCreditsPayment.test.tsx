import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreditsPayment } from '../../hooks/useCreditsPayment';

const mockCreditsManager = {
  requestQuote: vi.fn(),
  requestCartQuote: vi.fn(),
  createHold: vi.fn(),
  createCartHold: vi.fn(),
  authorizePayment: vi.fn(),
  authorizeCartPayment: vi.fn(),
  releaseHold: vi.fn(),
  processPayment: vi.fn(),
};

vi.mock('../../context', () => ({
  useCedrosContext: () => ({
    creditsManager: mockCreditsManager,
  }),
}));

describe('useCreditsPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('releases hold when cart authorization fails after hold creation', async () => {
    mockCreditsManager.requestCartQuote.mockResolvedValue({
      cartId: 'cart_123',
      credits: { amount: 500, currency: 'USDC', available: 1000 },
    });
    mockCreditsManager.createCartHold.mockResolvedValue({
      holdId: 'hold_abc',
      resource: 'cart_123',
      amount: 500,
      currency: 'USDC',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    mockCreditsManager.authorizeCartPayment.mockRejectedValue(new Error('authorization failed'));
    mockCreditsManager.releaseHold.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCreditsPayment());

    await act(async () => {
      const response = await result.current.processCartPayment(
        [{ resource: 'item-1', quantity: 1 }],
        'auth-token'
      );
      expect(response.success).toBe(false);
    });

    expect(mockCreditsManager.releaseHold).toHaveBeenCalledTimes(1);
    expect(mockCreditsManager.releaseHold).toHaveBeenCalledWith('hold_abc', 'auth-token');
  });

  it('does not release hold on successful cart authorization', async () => {
    mockCreditsManager.requestCartQuote.mockResolvedValue({
      cartId: 'cart_123',
      credits: { amount: 500, currency: 'USDC', available: 1000 },
    });
    mockCreditsManager.createCartHold.mockResolvedValue({
      holdId: 'hold_abc',
      resource: 'cart_123',
      amount: 500,
      currency: 'USDC',
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    mockCreditsManager.authorizeCartPayment.mockResolvedValue({
      success: true,
      transactionId: 'tx_1',
    });

    const { result } = renderHook(() => useCreditsPayment());

    await act(async () => {
      const response = await result.current.processCartPayment(
        [{ resource: 'item-1', quantity: 1 }],
        'auth-token'
      );
      expect(response.success).toBe(true);
      expect(response.transactionId).toBe('tx_1');
    });

    expect(mockCreditsManager.releaseHold).not.toHaveBeenCalled();
  });
});
