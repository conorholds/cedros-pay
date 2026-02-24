/**
 * Tests for testing provider utilities
 *
 * Regression test for TEST-001/TEST-002:
 * - Verify createMockCedrosProvider provides functional context
 * - Verify useCedrosContext() works inside mock provider
 * - Verify mock config is applied correctly
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { createMockCedrosProvider } from '../providers';
import { useCedrosContext } from '../../context/CedrosContext';

// Test component that uses Cedros context
function TestComponent() {
  const context = useCedrosContext();

  return (
    <div>
      <div data-testid="has-context">{context ? 'Has context' : 'No context'}</div>
      <div data-testid="stripe-key">{context.config.stripePublicKey}</div>
      <div data-testid="server-url">{context.config.serverUrl}</div>
      <div data-testid="solana-cluster">{context.config.solanaCluster}</div>
    </div>
  );
}

describe('createMockCedrosProvider', () => {
  it('should provide functional Cedros context', async () => {
    const MockProvider = createMockCedrosProvider();

    await act(async () => {
      render(
        <MockProvider>
          <TestComponent />
        </MockProvider>
      );
    });

    // Verify context is provided (wait for async initialization)
    await waitFor(() => {
      expect(screen.getByTestId('has-context')).toHaveTextContent('Has context');
    });
  });

  it('should apply default config values', async () => {
    const MockProvider = createMockCedrosProvider();

    await act(async () => {
      render(
        <MockProvider>
          <TestComponent />
        </MockProvider>
      );
    });

    // Verify default values (wait for async initialization)
    await waitFor(() => {
      expect(screen.getByTestId('stripe-key')).toHaveTextContent('pk_test_mock_key_for_testing');
      expect(screen.getByTestId('server-url')).toHaveTextContent('http://localhost:8080');
      expect(screen.getByTestId('solana-cluster')).toHaveTextContent('devnet');
    });
  });

  it('should apply custom config values', async () => {
    const MockProvider = createMockCedrosProvider({
      stripePublicKey: 'pk_test_custom',
      serverUrl: 'https://api.example.com',
      solanaCluster: 'mainnet-beta',
    });

    await act(async () => {
      render(
        <MockProvider>
          <TestComponent />
        </MockProvider>
      );
    });

    // Verify custom values (wait for async initialization)
    await waitFor(() => {
      expect(screen.getByTestId('stripe-key')).toHaveTextContent('pk_test_custom');
      expect(screen.getByTestId('server-url')).toHaveTextContent('https://api.example.com');
      expect(screen.getByTestId('solana-cluster')).toHaveTextContent('mainnet-beta');
    });
  });

  it('should not throw when useCedrosContext is called', async () => {
    const MockProvider = createMockCedrosProvider();

    // This should not throw "useCedrosContext must be used within CedrosProvider"
    await act(async () => {
      expect(() => {
        render(
          <MockProvider>
            <TestComponent />
          </MockProvider>
        );
      }).not.toThrow();
    });
  });
});
