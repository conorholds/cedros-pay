import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createMockCommerceAdapter } from '../adapters/mock/mockAdapter';
import { CedrosShopProvider, useCedrosShop } from '../config/context';

function FeatureFlagProbe() {
  const { featureFlags } = useCedrosShop();
  return <div data-testid="compliance-check">{String(featureFlags.complianceCheck)}</div>;
}

describe('CedrosShopProvider feature flags', () => {
  const baseConfig = {
    currency: 'USD',
    checkout: {
      mode: 'minimal' as const,
    },
    adapter: createMockCommerceAdapter(),
  };

  it('exposes default resolved feature flags in context', () => {
    render(
      <CedrosShopProvider config={baseConfig}>
        <FeatureFlagProbe />
      </CedrosShopProvider>
    );

    expect(screen.getByTestId('compliance-check')).toHaveTextContent('false');
  });

  it('applies config-based feature flag overrides in context', () => {
    render(
      <CedrosShopProvider
        config={{
          ...baseConfig,
          featureFlags: {
            complianceCheck: true,
          },
        }}
      >
        <FeatureFlagProbe />
      </CedrosShopProvider>
    );

    expect(screen.getByTestId('compliance-check')).toHaveTextContent('true');
  });
});
