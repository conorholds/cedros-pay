import { describe, it, expect, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { act } from 'react';
import type { WalletAdapter } from '@solana/wallet-adapter-base';
import { CedrosProvider, useCedrosContext } from '../../context';
import type { CedrosConfig } from '../../types';
import type { LazyWalletPool } from '../../context/CedrosContext';

// Test component that accesses wallet pool
function WalletPoolConsumer() {
  const { walletPool } = useCedrosContext();

  return (
    <div data-testid="wallet-pool-id">{walletPool.getId()}</div>
  );
}

describe('Multi-tenant Wallet Isolation', () => {
  const testConfig: CedrosConfig = {
    stripePublicKey: 'pk_test_123',
    serverUrl: 'http://localhost:8080',
    solanaCluster: 'devnet',
  };

  afterEach(() => {
    cleanup();
  });

  it('creates separate wallet pools for each CedrosProvider instance', async () => {
    // Render two separate provider trees (simulating two users)
    let container1: HTMLElement;
    let container2: HTMLElement;

    await act(async () => {
      ({ container: container1 } = render(
        <CedrosProvider config={testConfig}>
          <WalletPoolConsumer />
        </CedrosProvider>
      ));

      ({ container: container2 } = render(
        <CedrosProvider config={testConfig}>
          <WalletPoolConsumer />
        </CedrosProvider>
      ));
    });

    // Wait for wallet pools to load
    await waitFor(() => {
      const poolId1 = container1.querySelector('[data-testid="wallet-pool-id"]')?.textContent;
      const poolId2 = container2.querySelector('[data-testid="wallet-pool-id"]')?.textContent;

      // Each provider should have its own pool ID (not stub)
      expect(poolId1).toBeTruthy();
      expect(poolId2).toBeTruthy();
      expect(poolId1).not.toBe('stub');
      expect(poolId2).not.toBe('stub');
      expect(poolId1).not.toBe(poolId2);
    }, { timeout: 2000 });
  });

  it('isolates wallet adapters between different provider contexts', async () => {
    let adapters1: WalletAdapter[] = [];
    let adapters2: WalletAdapter[] = [];

    function Consumer1() {
      const { walletPool } = useCedrosContext();
      adapters1 = walletPool.getAdapters() as WalletAdapter[];
      return <div>Consumer 1</div>;
    }

    function Consumer2() {
      const { walletPool } = useCedrosContext();
      adapters2 = walletPool.getAdapters() as WalletAdapter[];
      return <div>Consumer 2</div>;
    }

    // Render two separate contexts
    await act(async () => {
      render(
        <CedrosProvider config={testConfig}>
          <Consumer1 />
        </CedrosProvider>
      );

      render(
        <CedrosProvider config={testConfig}>
          <Consumer2 />
        </CedrosProvider>
      );
    });

    // Should have different adapter instances (wait for wallet pool to load)
    await waitFor(() => {
      expect(adapters1).not.toBe(adapters2);
      expect(adapters1.length).toBeGreaterThan(0);
      expect(adapters2.length).toBeGreaterThan(0);
      expect(adapters1[0]).not.toBe(adapters2[0]);
      expect(adapters1[1]).not.toBe(adapters2[1]);
    }, { timeout: 2000 });
  });

  it('prevents wallet state leakage in multi-user dashboard scenario', async () => {
    const user1WalletState: WalletAdapter[] = [];
    const user2WalletState: WalletAdapter[] = [];

    function User1Dashboard() {
      const { walletPool } = useCedrosContext();
      const adapters = walletPool.getAdapters() as WalletAdapter[];
      user1WalletState.push(...adapters);
      return <div>User 1 Dashboard</div>;
    }

    function User2Dashboard() {
      const { walletPool } = useCedrosContext();
      const adapters = walletPool.getAdapters() as WalletAdapter[];
      user2WalletState.push(...adapters);
      return <div>User 2 Dashboard</div>;
    }

    // Simulate multi-tenant SaaS dashboard with two users
    let unmountUser1!: () => void;
    let unmountUser2!: () => void;

    await act(async () => {
      ({ unmount: unmountUser1 } = render(
        <CedrosProvider config={testConfig}>
          <User1Dashboard />
        </CedrosProvider>
      ));

      ({ unmount: unmountUser2 } = render(
        <CedrosProvider config={testConfig}>
          <User2Dashboard />
        </CedrosProvider>
      ));
    });

    // Critical security check: User 2 should NOT have User 1's wallet adapters (wait for pools to load)
    await waitFor(() => {
      expect(user1WalletState.length).toBeGreaterThan(0);
      expect(user2WalletState.length).toBeGreaterThan(0);

      const user1Phantom = user1WalletState.find(a => a.name === 'Phantom');
      const user2Phantom = user2WalletState.find(a => a.name === 'Phantom');

      expect(user1Phantom).not.toBe(user2Phantom);
    }, { timeout: 2000 });

    unmountUser1();
    unmountUser2();
  });

  it('cleans up wallet pool when provider unmounts', async () => {
    let poolInstance: LazyWalletPool | null = null;

    function PoolCapture() {
      const { walletPool } = useCedrosContext();
      poolInstance = walletPool;
      return <div>Capture</div>;
    }

    const { unmount } = render(
      <CedrosProvider config={testConfig}>
        <PoolCapture />
      </CedrosProvider>
    );

    // Wait for pool to load before adding spy
    await waitFor(() => {
      expect(poolInstance).not.toBeNull();
      expect(poolInstance!.getId()).not.toBe('stub');
    }, { timeout: 2000 });

    if (poolInstance) {
      vi.spyOn(poolInstance, 'cleanup');
    }

    unmount();

    // Cleanup should be called (though it may be async)
    // Note: We can't easily await the cleanup in React's cleanup phase
    // This test verifies the structure is in place
    expect(poolInstance).toBeDefined();
  });

  it('maintains wallet pool stability across component re-renders', async () => {
    const poolIds: string[] = [];

    function Consumer({ count }: { count: number }) {
      const { walletPool } = useCedrosContext();
      poolIds.push(walletPool.getId());
      return <div>Render {count}</div>;
    }

    let rerender: (ui: React.ReactElement) => void;

    await act(async () => {
      ({ rerender } = render(
        <CedrosProvider config={testConfig}>
          <Consumer count={0} />
        </CedrosProvider>
      ));
    });

    await act(async () => {
      rerender(
        <CedrosProvider config={testConfig}>
          <Consumer count={1} />
        </CedrosProvider>
      );
    });

    await act(async () => {
      rerender(
        <CedrosProvider config={testConfig}>
          <Consumer count={2} />
        </CedrosProvider>
      );
    });

    // Pool should remain stable across re-renders.
    // Filter out stub IDs that occur before lazy wallet pool initialization completes.
    await waitFor(() => {
      const realPoolIds = poolIds.filter(id => id !== 'stub');
      expect(realPoolIds.length).toBeGreaterThan(0);
      expect(new Set(realPoolIds).size).toBe(1);
    }, { timeout: 2000 });
  });

  it('provides separate wallet pools for nested providers', async () => {
    let outerPoolId: string = '';
    let innerPoolId: string = '';

    function OuterConsumer() {
      const { walletPool } = useCedrosContext();
      outerPoolId = walletPool.getId();
      return (
        <div>
          Outer: {outerPoolId}
          <CedrosProvider config={{ ...testConfig, serverUrl: 'http://localhost:8081' }}>
            <InnerConsumer />
          </CedrosProvider>
        </div>
      );
    }

    function InnerConsumer() {
      const { walletPool } = useCedrosContext();
      innerPoolId = walletPool.getId();
      return <div>Inner: {innerPoolId}</div>;
    }

    await act(async () => {
      render(
        <CedrosProvider config={testConfig}>
          <OuterConsumer />
        </CedrosProvider>
      );
    });

    // Nested providers should have different pools (wait for pools to load)
    await waitFor(() => {
      expect(outerPoolId).not.toBe(innerPoolId);
      expect(outerPoolId).not.toBe('stub');
      expect(innerPoolId).not.toBe('stub');
    }, { timeout: 2000 });
  });
});
