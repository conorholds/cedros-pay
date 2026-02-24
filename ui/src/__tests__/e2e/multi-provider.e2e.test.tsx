/**
 * E2E Tests: Multi-Provider Scenarios
 *
 * Tests critical multi-provider use cases:
 * 1. Manager sharing (same config)
 * 2. Manager isolation (different configs)
 * 3. Wallet pool isolation
 * 4. Nested providers
 * 5. Memory cleanup on unmount
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import { act } from 'react';
import { CedrosProvider, useCedrosContext } from '../../context';
import { StripeButton } from '../../components/StripeButton';
import { mockBackendAPIs, cleanupE2E } from './setup';
import { getManagerCacheStats } from '../../managers/ManagerCache';
import type { CedrosConfig } from '../../types';

// Mock Stripe instance
const mockStripeInstance = {
  redirectToCheckout: vi.fn().mockResolvedValue({ error: null }),
};

// Hoisted mocks - these run before any imports
vi.mock('@solana/web3.js', () => ({
  clusterApiUrl: vi.fn(() => 'https://api.devnet.solana.com'),
  Connection: class {
    async getLatestBlockhash() {
      return { blockhash: 'mock-blockhash', lastValidBlockHeight: 1000000 };
    }
    async getBalance() {
      return 1000000000;
    }
    async getSignatureStatus() {
      return { value: { confirmationStatus: 'confirmed' } };
    }
    async getAccountInfo() {
      return null;
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
      return new Uint8Array([1, 2, 3]);
    }
  },
  LAMPORTS_PER_SOL: 1_000_000_000,
  PublicKey: class {
    constructor(public value: string | Uint8Array) {}
    toString() {
      return typeof this.value === 'string' ? this.value : 'mockPublicKey';
    }
    toBase58() {
      return this.toString();
    }
  },
}));

vi.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: vi.fn(async () => ({
    toBase58: () => 'mockTokenAddress',
  })),
  createTransferInstruction: vi.fn(() => ({})),
}));

vi.mock('@solana/wallet-adapter-react', () => ({
  ConnectionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useWallet: () => ({
    connected: false,
    connecting: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    publicKey: null,
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
    select: vi.fn(),
    wallets: [],
    wallet: null,
  }),
  useConnection: () => ({
    connection: {
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'mock-blockhash',
        lastValidBlockHeight: 1000000,
      }),
    },
  }),
}));

vi.mock('@solana/wallet-adapter-wallets', () => ({
  PhantomWalletAdapter: class {
    name = 'Phantom';
  },
  SolflareWalletAdapter: class {
    name = 'Solflare';
  },
  BackpackWalletAdapter: class {
    name = 'Backpack';
  },
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(async () => mockStripeInstance),
}));

describe('E2E: Multi-Provider Scenarios', () => {
  let cleanupFetch: () => void;

  const config1: CedrosConfig = {
    stripePublicKey: 'pk_test_123',
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
  };

  const config2: CedrosConfig = {
    stripePublicKey: 'pk_test_456', // Different key
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
  };

  beforeEach(() => {
    cleanupFetch = mockBackendAPIs();
  });

  afterEach(() => {
    cleanup();
    cleanupFetch();
    cleanupE2E();
  });

  describe('Manager Sharing (Same Config)', () => {
    it('shares managers between providers with identical config', async () => {
      let manager1: unknown;
      let manager2: unknown;

      function Consumer1() {
        const { stripeManager } = useCedrosContext();
        manager1 = stripeManager;
        return <div>Provider 1</div>;
      }

      function Consumer2() {
        const { stripeManager } = useCedrosContext();
        manager2 = stripeManager;
        return <div>Provider 2</div>;
      }

      // Render two providers with identical config SEQUENTIALLY to avoid race condition
      let unmount1!: () => void;
      let unmount2!: () => void;

      await act(async () => {
        ({ unmount: unmount1 } = render(
          <CedrosProvider config={config1}>
            <Consumer1 />
          </CedrosProvider>
        ));
      });

      // Wait for first provider to finish initialization
      await waitFor(() => {
        expect(screen.getByText('Provider 1')).toBeInTheDocument();
      });

      // Now render second provider (should reuse cached managers)
      await act(async () => {
        ({ unmount: unmount2 } = render(
          <CedrosProvider config={config1}>
            <Consumer2 />
          </CedrosProvider>
        ));
      });

      // Wait for second provider to render
      await waitFor(() => {
        expect(screen.getByText('Provider 2')).toBeInTheDocument();
      });

      // Should share the same manager instance (wait for async initialization)
      await waitFor(() => {
        expect(manager1).toBeTruthy();
        expect(manager2).toBeTruthy();
        expect(manager1).toBe(manager2);
      }, { timeout: 2000 });

      // Cache should have 1 entry with refCount 2 (check before unmount)
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(2);

      // Cleanup
      unmount1();
      unmount2();
    });

    it('prevents duplicate Stripe.js loads for same public key', async () => {
      // Render 3 providers with same config (sequentially to ensure all mount)
      let unmount1!: () => void;
      let unmount2!: () => void;
      let unmount3!: () => void;

      await act(async () => {
        ({ unmount: unmount1 } = render(
          <CedrosProvider config={config1}>
            <StripeButton resource="product-1" />
          </CedrosProvider>
        ));
      });

      await act(async () => {
        ({ unmount: unmount2 } = render(
          <CedrosProvider config={config1}>
            <StripeButton resource="product-2" />
          </CedrosProvider>
        ));
      });

      await act(async () => {
        ({ unmount: unmount3 } = render(
          <CedrosProvider config={config1}>
            <StripeButton resource="product-3" />
          </CedrosProvider>
        ));
      });

      // Wait for all buttons to render (meaning managers are loaded)
      await waitFor(() => {
        expect(screen.getAllByRole('button').length).toBe(3);
      });

      // Cache stats confirm sharing (check before unmount)
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(3);

      // Cleanup
      unmount1();
      unmount2();
      unmount3();
    });
  });

  describe('Manager Isolation (Different Configs)', () => {
    it('creates separate managers for different Stripe keys', async () => {
      let manager1: unknown;
      let manager2: unknown;

      function Consumer1() {
        const { stripeManager } = useCedrosContext();
        manager1 = stripeManager;
        return <div>Provider 1</div>;
      }

      function Consumer2() {
        const { stripeManager } = useCedrosContext();
        manager2 = stripeManager;
        return <div>Provider 2</div>;
      }

      // Render two providers with different configs
      await act(async () => {
        render(
          <CedrosProvider config={config1}>
            <Consumer1 />
          </CedrosProvider>
        );

        render(
          <CedrosProvider config={config2}>
            <Consumer2 />
          </CedrosProvider>
        );
      });

      // Should have different manager instances (wait for async initialization)
      await waitFor(() => {
        expect(manager1).not.toBe(manager2);
      });

      // Cache should have 2 separate entries
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(2);
      expect(stats.details[0].refCount).toBe(1);
      expect(stats.details[1].refCount).toBe(1);
    });

    it('isolates managers for multi-tenant SaaS scenario', async () => {
      const tenant1Config: CedrosConfig = {
        stripePublicKey: 'pk_test_tenant1',
        serverUrl: 'https://api.tenant1.com',
        solanaCluster: 'mainnet-beta',
      };

      const tenant2Config: CedrosConfig = {
        stripePublicKey: 'pk_test_tenant2',
        serverUrl: 'https://api.tenant2.com',
        solanaCluster: 'mainnet-beta',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tenant1Managers: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tenant2Managers: any;

      function Tenant1() {
        tenant1Managers = useCedrosContext();
        return <StripeButton resource="product-1" />;
      }

      function Tenant2() {
        tenant2Managers = useCedrosContext();
        return <StripeButton resource="product-1" />;
      }

      await act(async () => {
        render(
          <CedrosProvider config={tenant1Config}>
            <Tenant1 />
          </CedrosProvider>
        );

        render(
          <CedrosProvider config={tenant2Config}>
            <Tenant2 />
          </CedrosProvider>
        );
      });

      // Tenants should have completely isolated managers (wait for async initialization)
      await waitFor(() => {
        expect(tenant1Managers.stripeManager).not.toBe(tenant2Managers.stripeManager);
        expect(tenant1Managers.x402Manager).not.toBe(tenant2Managers.x402Manager);
        expect(tenant1Managers.walletManager).not.toBe(tenant2Managers.walletManager);
      });

      // Each tenant has separate cache entry
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(2);
    });
  });

  describe('Wallet Pool Isolation', () => {
    it('isolates wallet pools between providers (security)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pool1: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pool2: any;

      function Consumer1() {
        const { walletPool } = useCedrosContext();
        pool1 = walletPool;
        return <div>User 1</div>;
      }

      function Consumer2() {
        const { walletPool } = useCedrosContext();
        pool2 = walletPool;
        return <div>User 2</div>;
      }

      // Even with same config, wallet pools must be isolated - render SEQUENTIALLY
      let unmount1!: () => void;
      let unmount2!: () => void;

      await act(async () => {
        ({ unmount: unmount1 } = render(
          <CedrosProvider config={config1}>
            <Consumer1 />
          </CedrosProvider>
        ));
      });

      // Wait for first consumer to fully render
      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
      });

      await act(async () => {
        ({ unmount: unmount2 } = render(
          <CedrosProvider config={config1}>
            <Consumer2 />
          </CedrosProvider>
        ));
      });

      // Wait for second consumer to render
      await waitFor(() => {
        expect(screen.getByText('User 2')).toBeInTheDocument();
      });

      // Wallet pools must be different (security requirement) - wait for async initialization
      await waitFor(() => {
        expect(pool1).toBeTruthy();
        expect(pool2).toBeTruthy();
        expect(pool1).not.toBe(pool2);
        expect(pool1.getId()).not.toBe('stub');
        expect(pool2.getId()).not.toBe('stub');
        expect(pool1.getId()).not.toBe(pool2.getId());
      }, { timeout: 2000 });

      // But managers should be shared (check before unmount)
      await waitFor(() => {
        const stats = getManagerCacheStats();
        expect(stats.entries).toBe(1);
        expect(stats.details[0].refCount).toBe(2);
      }, { timeout: 2000 });

      // Cleanup
      unmount1();
      unmount2();
    });
  });

  describe('Nested Providers', () => {
    it('supports nested providers with different configs', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let outerManagers: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let innerManagers: any;

      function OuterConsumer() {
        outerManagers = useCedrosContext();
        return (
          <div>
            Outer
            <CedrosProvider config={config2}>
              <InnerConsumer />
            </CedrosProvider>
          </div>
        );
      }

      function InnerConsumer() {
        innerManagers = useCedrosContext();
        return <div>Inner</div>;
      }

      await act(async () => {
        render(
          <CedrosProvider config={config1}>
            <OuterConsumer />
          </CedrosProvider>
        );
      });

      // Inner provider should use config2 managers (wait for async initialization)
      await waitFor(() => {
        expect(outerManagers.stripeManager).not.toBe(innerManagers.stripeManager);
      });

      // Cache should have 2 entries
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(2);
    });
  });

  describe('Memory Cleanup', () => {
    it('releases managers when providers unmount', async () => {
      function Consumer() {
        useCedrosContext();
        return <div>Consumer</div>;
      }

      // Mount 3 providers SEQUENTIALLY to avoid race condition in manager creation
      let unmount1!: () => void;
      let unmount2!: () => void;
      let unmount3!: () => void;

      await act(async () => {
        ({ unmount: unmount1 } = render(
          <CedrosProvider config={config1}>
            <Consumer />
          </CedrosProvider>
        ));
      });

      // Wait for first to render
      await waitFor(() => {
        expect(screen.getAllByText('Consumer').length).toBe(1);
      });

      await act(async () => {
        ({ unmount: unmount2 } = render(
          <CedrosProvider config={config1}>
            <Consumer />
          </CedrosProvider>
        ));
      });

      // Wait for second to render
      await waitFor(() => {
        expect(screen.getAllByText('Consumer').length).toBe(2);
      });

      await act(async () => {
        ({ unmount: unmount3 } = render(
          <CedrosProvider config={config1}>
            <Consumer />
          </CedrosProvider>
        ));
      });

      // Wait for all 3 consumers to render (managers fully loaded since children render only after managers ready)
      await waitFor(() => {
        expect(screen.getAllByText('Consumer').length).toBe(3);
      });

      // Cache should have refCount 3 (wait for async initialization)
      await waitFor(() => {
        const stats = getManagerCacheStats();
        expect(stats.entries).toBe(1);
        expect(stats.details[0].refCount).toBe(3);
      }, { timeout: 3000 });

      let stats = getManagerCacheStats();

      // Unmount first provider
      unmount1();

      // refCount should decrease to 2
      stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(2);

      // Unmount second provider
      unmount2();

      // refCount should decrease to 1
      stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(1);

      // Unmount third provider
      unmount3();

      // Cache should be empty (refCount reached 0)
      stats = getManagerCacheStats();
      expect(stats.entries).toBe(0);
    });

    it('prevents memory leaks in rapid mount/unmount cycles', async () => {
      function Consumer() {
        useCedrosContext();
        return <div>Consumer</div>;
      }

      // Rapidly mount and unmount 10 providers
      for (let i = 0; i < 10; i++) {
        let unmount: () => void;
        await act(async () => {
          ({ unmount } = render(
            <CedrosProvider config={config1}>
              <Consumer />
            </CedrosProvider>
          ));
        });
        await act(async () => {
          unmount();
        });
      }

      // Cache should be empty (no leaks)
      await waitFor(() => {
        const stats = getManagerCacheStats();
        expect(stats.entries).toBe(0);
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('handles dashboard with multiple payment components', async () => {
      // Scenario: User dashboard with multiple product purchase buttons
      await act(async () => {
        render(
          <CedrosProvider config={config1}>
            <div>
              <h1>Products</h1>
              <StripeButton resource="product-1" label="Buy Product 1" />
              <StripeButton resource="product-2" label="Buy Product 2" />
              <StripeButton resource="product-3" label="Buy Product 3" />
            </div>
          </CedrosProvider>
        );
      });

      // All buttons share same managers (wait for async initialization)
      await waitFor(() => {
        const stats = getManagerCacheStats();
        expect(stats.entries).toBe(1);
        expect(stats.details[0].refCount).toBe(1); // Single provider
      });
    });

    it('handles multi-user admin panel', async () => {
      // Scenario: Admin viewing payments for multiple users
      // Each user dashboard has separate provider (different serverUrls)

      const user1Config = { ...config1, serverUrl: 'http://localhost:8080/user1' };
      const user2Config = { ...config1, serverUrl: 'http://localhost:8080/user2' };

      await act(async () => {
        render(
          <div>
            <CedrosProvider config={user1Config}>
              <StripeButton resource="subscription" label="User 1 Payment" />
            </CedrosProvider>

            <CedrosProvider config={user2Config}>
              <StripeButton resource="subscription" label="User 2 Payment" />
            </CedrosProvider>
          </div>
        );
      });

      // Different serverUrls = different cache entries (wait for async initialization)
      await waitFor(() => {
        const stats = getManagerCacheStats();
        expect(stats.entries).toBe(2);
      });
    });
  });
});
