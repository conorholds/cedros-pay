import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import React from 'react';
import { CedrosProvider } from '../context';
import { useCedrosTheme } from '../context';

vi.mock('@solana/web3.js', () => ({
  clusterApiUrl: vi.fn(() => 'https://api.devnet.solana.com'),
  Connection: class {
    async getLatestBlockhash() {
      return { blockhash: 'abc' };
    }

    async getBalance() {
      return 0;
    }

    async getSignatureStatus() {
      return { value: null };
    }

    async getAccountInfo() {
      return {};
    }
  },
  SystemProgram: {
    transfer: vi.fn(() => ({})),
  },
  Transaction: class {
    recentBlockhash?: string;
    feePayer?: unknown;
    instructions: unknown[] = [];

    add(instruction: unknown) {
      this.instructions.push(instruction);
      return this;
    }

    serialize() {
      return new Uint8Array();
    }
  },
  LAMPORTS_PER_SOL: 1_000_000_000,
  PublicKey: class {
    constructor(public value: string) {}
  },
}));

vi.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: vi.fn(async () => ({})),
  createTransferInstruction: vi.fn(() => ({})),
}));

vi.mock('@solana/wallet-adapter-react', () => ({
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useWallet: () => ({
    connected: false,
    connecting: false,
    connect: vi.fn(),
    publicKey: null,
    signTransaction: vi.fn(),
  }),
}));

vi.mock('@solana/wallet-adapter-wallets', () => ({
  PhantomWalletAdapter: class {},
  SolflareWalletAdapter: class {},
  BackpackWalletAdapter: class {},
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(async () => ({
    redirectToCheckout: vi.fn(async () => ({})),
  })),
}));

function ThemeProbe() {
  const { style, className, mode, tokens } = useCedrosTheme();
  return (
    <div
      data-testid="theme-probe"
      data-mode={mode}
      data-classname={className}
      style={style}
    >
      {tokens.stripeBackground}
    </div>
  );
}

function ThemeToggle() {
  const { mode, setMode } = useCedrosTheme();
  return (
    <button type="button" onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
      toggle
    </button>
  );
}

const baseConfig = {
  stripePublicKey: 'pk_test_123',
  serverUrl: 'https://api.example.com',
  solanaCluster: 'devnet' as const,
};

describe('Cedros theme system', () => {
  it('provides light theme defaults when no configuration is given', async () => {
    await act(async () => {
      render(
        <CedrosProvider config={baseConfig}>
          <ThemeProbe />
        </CedrosProvider>
      );
    });

    const probe = await waitFor(() => screen.getByTestId('theme-probe'));
    expect(probe).toHaveAttribute('data-mode', 'light');
    expect(probe.getAttribute('data-classname')).toContain('cedros-theme--light');
    expect(probe.style.getPropertyValue('--cedros-stripe-bg')).toContain('#635bff');
  });

  it('applies dark theme with overrides from configuration', async () => {
    await act(async () => {
      render(
        <CedrosProvider
          config={{
            ...baseConfig,
            theme: 'dark',
            themeOverrides: {
              stripeBackground: 'linear-gradient(90deg, #000 0%, #fff 100%)',
            },
          }}
        >
          <ThemeProbe />
        </CedrosProvider>
      );
    });

    const probe = await waitFor(() => screen.getByTestId('theme-probe'));
    expect(probe).toHaveAttribute('data-mode', 'dark');
    expect(probe.style.getPropertyValue('--cedros-stripe-bg')).toBe(
      'linear-gradient(90deg, #000 0%, #fff 100%)'
    );
  });

  it('allows toggling theme mode at runtime', async () => {
    await act(async () => {
      render(
        <CedrosProvider config={baseConfig}>
          <ThemeToggle />
          <ThemeProbe />
        </CedrosProvider>
      );
    });

    const probe = await waitFor(() => screen.getByTestId('theme-probe'));
    const toggle = await waitFor(() => screen.getByRole('button', { name: /toggle/i }));

    expect(probe).toHaveAttribute('data-mode', 'light');

    fireEvent.click(toggle);

    expect(await screen.findByTestId('theme-probe')).toHaveAttribute('data-mode', 'dark');
  });
});
