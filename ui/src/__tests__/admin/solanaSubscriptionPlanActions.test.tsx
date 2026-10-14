import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SolanaSubscriptionPlanActions } from '../../components/admin/SolanaSubscriptionPlanActions';
import type { SolanaSubscriptionPlanConfig } from '../../components/admin/types';

function config(): SolanaSubscriptionPlanConfig {
  return {
    enabled: true,
    planId: 42,
    annualPlanId: 43,
    merchantAddress: '8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR',
    tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    tokenProgramAddress: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    monthlyAmountAtomic: 1_000_000,
    annualAmountAtomic: 10_000_000,
    monthlyPeriodHours: 720,
    annualPeriodHours: 8760,
    status: 'active',
  };
}

describe('SolanaSubscriptionPlanActions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('preserves saved plan references without connecting or signing with an injected wallet', () => {
    const connect = vi.fn();
    const signTransaction = vi.fn();
    const fetch = vi.fn();
    vi.stubGlobal('solana', { connect, signTransaction });
    vi.stubGlobal('fetch', fetch);
    const current = { ...config(), monthlyPlanAddress: 'saved-monthly-plan' };
    render(<SolanaSubscriptionPlanActions config={current} />);
    expect(screen.getByText('saved-monthly-plan')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cedros Wallet');
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(connect).not.toHaveBeenCalled();
    expect(signTransaction).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(current.monthlyPlanAddress).toBe('saved-monthly-plan');
  });

  it('fails closed with incomplete plan configuration too', () => {
    render(<SolanaSubscriptionPlanActions config={{ ...config(), merchantAddress: '' }} />);
    expect(screen.getAllByText('No plan address saved')).toHaveLength(2);
    expect(screen.getAllByRole('button')).toHaveLength(6);
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});
