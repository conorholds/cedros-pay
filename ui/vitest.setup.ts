import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

class MockWalletAdapter {
  name: string;
  url = '';
  icon = '';
  connected = false;
  connecting = false;
  readyState = 'Installed';
  publicKey: { toBase58: () => string; toString: () => string } | null = null;
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  constructor(name: string) {
    this.name = name;
  }

  async connect() {
    this.connecting = true;
    this.emit('connecting');
    this.connected = true;
    this.connecting = false;
    this.publicKey = {
      toBase58: () => `${this.name.toLowerCase()}-public-key`,
      toString: () => `${this.name.toLowerCase()}-public-key`,
    };
    this.emit('connect', this.publicKey);
  }

  async disconnect() {
    this.connected = false;
    this.publicKey = null;
    this.emit('disconnect');
  }

  on(event: string, listener: (...args: unknown[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  off(event: string, listener: (...args: unknown[]) => void) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  once(event: string, listener: (...args: unknown[]) => void) {
    const wrapped = (...args: unknown[]) => {
      this.off(event, wrapped);
      listener(...args);
    };
    return this.on(event, wrapped);
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
    return this;
  }
}

vi.mock('@solana/wallet-adapter-phantom', () => ({
  PhantomWalletAdapter: class MockPhantomWalletAdapter extends MockWalletAdapter {
    constructor() {
      super('Phantom');
    }
  },
}));

vi.mock('@solana/wallet-adapter-solflare', () => ({
  SolflareWalletAdapter: class MockSolflareWalletAdapter extends MockWalletAdapter {
    constructor() {
      super('Solflare');
    }
  },
}));

// Provide minimal mocks for browser-only globals used by wallet adapters.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
