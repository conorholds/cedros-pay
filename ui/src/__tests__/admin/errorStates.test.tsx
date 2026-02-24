import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBanner } from '../../components/admin/ErrorBanner';
import { OverviewSection } from '../../components/admin/OverviewSection';
import { ProductsSection } from '../../components/admin/ProductsSection';
import { FAQSection } from '../../components/admin/FAQSection';

// ─── ErrorBanner unit tests ─────────────────────────────────────────────────

describe('ErrorBanner', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<ErrorBanner message={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders error message without retry button when no onRetry', () => {
    render(<ErrorBanner message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('renders retry button that calls onRetry when clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Network error" onRetry={onRetry} />);

    expect(screen.getByText('Network error')).toBeInTheDocument();
    const retryButton = screen.getByRole('button');
    expect(retryButton).toHaveTextContent('Retry');

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

// ─── Section error-state tests ──────────────────────────────────────────────

const SECTION_PROPS = { serverUrl: 'http://localhost:9999' };

describe('OverviewSection error state', () => {
  it('shows error banner with retry on API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<OverviewSection {...SECTION_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load payment stats')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});

describe('ProductsSection error state', () => {
  it('shows error banner with retry on API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<ProductsSection {...SECTION_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});

describe('FAQSection error state', () => {
  it('shows error banner with retry on API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<FAQSection {...SECTION_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load FAQs')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
