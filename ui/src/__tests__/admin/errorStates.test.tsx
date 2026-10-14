import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ErrorBanner } from '../../components/admin/ErrorBanner';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import { ProductsSection } from '../../components/admin/ProductsSection';

// ─── ErrorBanner unit tests ─────────────────────────────────────────────────

describe('ErrorBanner', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<ErrorBanner message={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the error message with no retry/refresh control', () => {
    render(<ErrorBanner message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // Recovery happens in the background, so the banner exposes no button.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('runs an explicit safe retry when provided', () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Something went wrong" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

// ─── Section error-state tests ──────────────────────────────────────────────

const SECTION_PROPS = { serverUrl: 'http://localhost:9999' };

describe('ProductsSection error state', () => {
  it('surfaces a first-load error with a retry button', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    render(<ProductsSection {...SECTION_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it('ignores an older failed load after a newer load succeeds', async () => {
    let rejectInitialLoad: ((reason?: unknown) => void) | undefined;
    let productFetches = 0;
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path.startsWith('/admin/config/shop')) {
        return { config: {} };
      }
      if (path === '/admin/subscriptions/settings') {
        return { enabled: true, plans: [] };
      }
      if (path === '/admin/v1/status') {
        return {};
      }

      productFetches += 1;
      if (productFetches === 1) {
        return new Promise((_, reject) => {
          rejectInitialLoad = reject;
        });
      }
      return {
        products: [{ id: 'developer', title: 'Developer', active: true }],
      };
    }) as unknown as IAdminAuthManager['fetchWithAuth'];
    const authManager: IAdminAuthManager = {
      getAuthMethod: () => 'cedros-login',
      isAuthenticated: () => true,
      setCedrosLoginAuth: () => {},
      createAuthHeaders: async () => ({ Authorization: 'Bearer token' }),
      fetchWithAuth,
    };

    render(<ProductsSection {...SECTION_PROPS} authManager={authManager} />);
    await waitFor(() => expect(productFetches).toBe(1));

    window.dispatchEvent(new Event('cedros-pay:data-invalidated'));
    expect(await screen.findByText('Developer')).toBeInTheDocument();

    rejectInitialLoad?.(new Error('Admin data changed during request'));
    await waitFor(() => expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false'));
    expect(screen.queryByText('Failed to load products')).not.toBeInTheDocument();
  });
});
