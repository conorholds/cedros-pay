import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnimatedDisclosure } from '../../components/admin/AnimatedDisclosure';

describe('AnimatedDisclosure', () => {
  it('keeps closing content inert during the transition and unmounts it afterward', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <AnimatedDisclosure open>
        <button type="button">Hidden action</button>
      </AnimatedDisclosure>
    );

    expect(screen.getByRole('button', { name: 'Hidden action' })).toBeInTheDocument();
    rerender(
      <AnimatedDisclosure open={false}>
        <button type="button">Hidden action</button>
      </AnimatedDisclosure>
    );

    const disclosure = screen.getByText('Hidden action').closest('[data-state]');
    expect(disclosure).toHaveAttribute('aria-hidden', 'true');
    expect(disclosure?.querySelector('[inert]')).not.toBeNull();

    act(() => vi.advanceTimersByTime(260));
    expect(screen.queryByText('Hidden action')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('does not mount initially closed content', () => {
    render(
      <AnimatedDisclosure open={false}>
        <input aria-label="Private field" />
      </AnimatedDisclosure>
    );

    expect(screen.queryByLabelText('Private field')).not.toBeInTheDocument();
  });
});
