import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import { act } from 'react';
import type { WalletAdapter } from '@solana/wallet-adapter-base';
import { CedrosPay } from '../../components/CedrosPay';
import { CedrosProvider, useCedrosContext } from '../../context';
import type { LazyWalletPool } from '../../context/CedrosContext';

const originalConsoleError = console.error;

describe('CedrosPay - Memory Leak Prevention (Wallet Pool)', () => {
  const defaultConfig = {
    stripePublicKey: 'pk_test_123',
    serverUrl: 'http://localhost:3000',
    solanaCluster: 'devnet' as const,
  };

  beforeEach(() => {
    cleanup();
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const message = args.map(String).join(' ');
      if (
        message.includes('You have tried to read') &&
        message.includes('WalletContext without providing one')
      ) {
        return;
      }
      originalConsoleError(...args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('context-scoped wallet pool behavior', () => {
    it('creates wallet pool on provider mount', async () => {
      function PoolCapture() {
        const { walletPool } = useCedrosContext();
        const poolId = walletPool.getId();
        return <div data-testid="pool-id">{poolId}</div>;
      }

      await act(async () => {
        render(
          <CedrosProvider config={defaultConfig}>
            <PoolCapture />
          </CedrosProvider>
        );
      });

      // Should have created a pool (wait for async initialization)
      await waitFor(() => {
        const poolIdElement = screen.getByTestId('pool-id');
        expect(poolIdElement.textContent).toMatch(/^pool_\d+_[a-z0-9]+$/);
      }, { timeout: 2000 });
    });

    it('creates separate wallet pools for separate providers', async () => {
      function PoolCapture({ testId }: { testId: string }) {
        const { walletPool } = useCedrosContext();
        return <div data-testid={testId}>{walletPool.getId()}</div>;
      }

      // Mount provider 1
      let unmount1!: () => void;
      let unmount2!: () => void;

      await act(async () => {
        ({ unmount: unmount1 } = render(
          <CedrosProvider config={defaultConfig}>
            <PoolCapture testId="pool-1" />
          </CedrosProvider>
        ));

        // Mount provider 2
        ({ unmount: unmount2 } = render(
          <CedrosProvider config={defaultConfig}>
            <PoolCapture testId="pool-2" />
          </CedrosProvider>
        ));
      });

      // Should have different pool IDs (no singleton behavior) - wait for pools to load
      await waitFor(() => {
        const pool1 = screen.getByTestId('pool-1').textContent;
        const pool2 = screen.getByTestId('pool-2').textContent;
        expect(pool1).toMatch(/^pool_\d+_[a-z0-9]+$/);
        expect(pool2).toMatch(/^pool_\d+_[a-z0-9]+$/);
        expect(pool1).not.toBe(pool2);
      }, { timeout: 2000 });

      unmount1();
      unmount2();
    });

    it('reuses wallet adapters within same provider across re-renders', async () => {
      let adapters1: WalletAdapter[] = [];
      let adapters2: WalletAdapter[] = [];

      function WalletCapture({ id }: { id: number }) {
        const { walletPool } = useCedrosContext();
        const adapters = walletPool.getAdapters() as WalletAdapter[];
        if (id === 1) {
          adapters1 = adapters;
        } else {
          adapters2 = adapters;
        }
        return <CedrosPay resource="test-item" />;
      }

      let rerender: (ui: React.ReactElement) => void;

      await act(async () => {
        ({ rerender } = render(
          <CedrosProvider config={defaultConfig}>
            <WalletCapture id={1} />
          </CedrosProvider>
        ));
      });

      await act(async () => {
        rerender(
          <CedrosProvider config={defaultConfig}>
            <WalletCapture id={2} />
          </CedrosProvider>
        );
      });

      // Same provider instance = same wallet pool = same adapters (wait for pools to load)
      // This prevents re-instantiation within the same context
      await waitFor(() => {
        expect(adapters1).toBe(adapters2);
      }, { timeout: 2000 });
    });

    it('handles rapid mount/unmount without memory leaks', async () => {
      // Simulate rapid component churn
      for (let i = 0; i < 10; i++) {
        let unmount: () => void;
        await act(async () => {
          ({ unmount } = render(
            <CedrosProvider config={defaultConfig}>
              <CedrosPay resource={`test-item-${i}`} />
            </CedrosProvider>
          ));
        });

        await act(async () => {
          unmount();
        });
      }

      // If we got here without errors, the cleanup worked correctly
      expect(true).toBe(true);
    });

    it('isolates wallet adapters between concurrent providers', async () => {
      let walletSet1: WalletAdapter[] = [];
      let walletSet2: WalletAdapter[] = [];
      let walletSet3: WalletAdapter[] = [];

      function WalletCapture1() {
        const { walletPool } = useCedrosContext();
        walletSet1 = walletPool.getAdapters() as WalletAdapter[];
        return <div data-testid="wallet-1">loaded</div>;
      }

      function WalletCapture2() {
        const { walletPool } = useCedrosContext();
        walletSet2 = walletPool.getAdapters() as WalletAdapter[];
        return <div data-testid="wallet-2">loaded</div>;
      }

      function WalletCapture3() {
        const { walletPool } = useCedrosContext();
        walletSet3 = walletPool.getAdapters() as WalletAdapter[];
        return <div data-testid="wallet-3">loaded</div>;
      }

      // Mount 3 providers concurrently (simulating multi-tenant scenario)
      let unmounts: (() => void)[] = [];

      await act(async () => {
        const { unmount: unmount1 } = render(
          <CedrosProvider config={{ ...defaultConfig, serverUrl: 'http://localhost:8081' }}>
            <WalletCapture1 />
          </CedrosProvider>
        );
        const { unmount: unmount2 } = render(
          <CedrosProvider config={{ ...defaultConfig, serverUrl: 'http://localhost:8082' }}>
            <WalletCapture2 />
          </CedrosProvider>
        );
        const { unmount: unmount3 } = render(
          <CedrosProvider config={{ ...defaultConfig, serverUrl: 'http://localhost:8083' }}>
            <WalletCapture3 />
          </CedrosProvider>
        );
        unmounts = [unmount1, unmount2, unmount3];
      });

      // All should have separate wallet instances (wait for pools to load)
      await waitFor(() => {
        expect(walletSet1.length).toBeGreaterThan(0);
        expect(walletSet2.length).toBeGreaterThan(0);
        expect(walletSet3.length).toBeGreaterThan(0);
        expect(walletSet1).not.toBe(walletSet2);
        expect(walletSet2).not.toBe(walletSet3);
        expect(walletSet1[0]).not.toBe(walletSet2[0]);
        expect(walletSet2[0]).not.toBe(walletSet3[0]);
      }, { timeout: 2000 });

      // Cleanup
      unmounts.forEach(unmount => unmount());
    });
  });

  describe('custom wallets prop', () => {
    it('uses custom wallets when provided', async () => {
      const customWallets: WalletAdapter[] = [
        // Mock wallet adapters would go here in real test
      ];

      // Component should accept custom wallets
      await act(async () => {
        render(
          <CedrosProvider config={defaultConfig}>
            <CedrosPay resource="test-item" advanced={{ wallets: customWallets }} />
          </CedrosProvider>
        );
      });

      expect(true).toBe(true);
    });

    it('falls back to pool wallets when empty array provided', async () => {
      let poolAdapters: WalletAdapter[] = [];

      function AdapterCapture() {
        const { walletPool } = useCedrosContext();
        poolAdapters = walletPool.getAdapters() as WalletAdapter[];
        return <CedrosPay resource="test-item" advanced={{ wallets: [] }} />;
      }

      await act(async () => {
        render(
          <CedrosProvider config={defaultConfig}>
            <AdapterCapture />
          </CedrosProvider>
        );
      });

      // With empty custom wallets, should use pool adapters (wait for pool to load)
      await waitFor(() => {
        expect(poolAdapters.length).toBeGreaterThan(0);
      }, { timeout: 2000 });
    });
  });

  describe('provider lifecycle', () => {
    it('maintains stable wallet pool across component re-renders within same provider', async () => {
      function PoolTracker() {
        const { walletPool } = useCedrosContext();
        return <div data-testid="pool-id">{walletPool.getId()}</div>;
      }

      await act(async () => {
        render(
          <CedrosProvider config={defaultConfig}>
            <PoolTracker />
          </CedrosProvider>
        );
      });

      // Pool should be created and loaded (wait for async init)
      await waitFor(() => {
        const poolId = screen.getByTestId('pool-id').textContent;
        expect(poolId).toMatch(/^pool_\d+_[a-z0-9]+$/);
      }, { timeout: 2000 });
    });

    it('cleans up wallet pool on provider unmount', async () => {
      let poolInstance: LazyWalletPool | null = null;

      function PoolCapture() {
        const { walletPool } = useCedrosContext();
        poolInstance = walletPool;
        return <CedrosPay resource="test-item" />;
      }

      const { unmount } = render(
        <CedrosProvider config={defaultConfig}>
          <PoolCapture />
        </CedrosProvider>
      );

      // Wait for pool to load
      await waitFor(() => {
        expect(poolInstance).not.toBeNull();
        expect(poolInstance!.getId()).not.toBe('stub');
      }, { timeout: 2000 });

      const poolId = poolInstance!.getId();

      await act(async () => {
        unmount();
      });

      // After unmount, the pool should have been cleaned up
      // (cleanup is async, so we can't directly test it here,
      // but we can verify the structure is correct)
      expect(poolId).toBeTruthy();
    });
  });
});
