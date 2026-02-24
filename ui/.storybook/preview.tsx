// Import polyfills FIRST before anything else
import './polyfills';

import type { Decorator, Preview } from '@storybook/react';
import React, { useState, useEffect } from 'react';
import { Title, Subtitle, Description, Primary, Controls, Stories } from '@storybook/addon-docs/blocks';
import { CedrosProvider } from '../src';
import './tailwind.css';
import './preview.css';
import '../src/styles.css';
import { getEffectiveRpcEndpoint, getEffectiveServerUrl } from '../stories/utils/storybookSettings';

const withCedrosProvider: Decorator = (Story, context) => {
  const {
    themeMode,
    themeOverrides,
  } = context.parameters as {
    themeMode?: 'light' | 'dark';
    themeOverrides?: Record<string, string>;
  };

  const storyArgs = context.args as { themeOverrides?: Record<string, string> };
  const overridesFromArgs = storyArgs?.themeOverrides;

  // State to force re-render when settings change
  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettingsVersion(v => v + 1);
    };

    window.addEventListener('storybook-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('storybook-settings-changed', handleSettingsChange);
  }, []);

  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};

  const stripePublicKey: string = env.VITE_STRIPE_PUBLIC_KEY ?? 'pk_test_placeholder';

  // Use settings utility functions that check localStorage first, then env vars
  const serverUrl: string = getEffectiveServerUrl();
  const solanaEndpoint: string = getEffectiveRpcEndpoint();
  const solanaCluster = (env.VITE_SOLANA_CLUSTER as 'mainnet-beta' | 'devnet' | 'testnet') ?? 'mainnet-beta';

  return (
    <CedrosProvider
      key={settingsVersion} // Force re-mount when settings change
      config={{
        stripePublicKey,
        serverUrl,
        solanaCluster,
        solanaEndpoint,
        theme: themeMode ?? 'light',
        themeOverrides: overridesFromArgs ?? themeOverrides,
      }}
    >
      <Story metadata={{ userId: 'demo-user', email: 'demo@cedros.app' }} />
    </CedrosProvider>
  );
};

const preview: Preview = {
  decorators: [withCedrosProvider],

  globalTypes: {
    themeMode: {
      description: 'Global theme for Cedros components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },

  parameters: {
    actions: { argTypesRegex: '^on.*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      page: () => (
        <>
          <Title />
          <Subtitle />
          <Description />
          <Primary />
          <Controls />
          <Stories includePrimary={false} />
        </>
      ),
    },
    options: {
      storySort: (a, b) => {
        // Define desired order for Components stories
        const componentsOrder = [
          'Overview',
          'Links',
          'Payment Options',
          'Card Only',
          'Crypto Only',
          'Credits Only',
          'Purchase Button',
          'Multi Item Cart',
          'Custom Styling',
          'Coupons',
          'Refunds',
          'Refund Demo',
        ];

        // Define desired order for Server stories
        const serverOrder = [
          'Overview',
          'Configuration',
          'Integration Patterns',
          'API Reference',
        ];

        // Define desired order for Templates stories
        const templatesOrder = [
          'Shop',
          'Category',
          'Product',
          'Cart',
          'Checkout',
          'PurchaseHistory',
          'Subscription',
        ];

        // Top-level section order (supports nested titles like "Ecommerce/Templates")
        const sectionOrder = ['Components', 'Templates', 'Admin', 'Server', 'Settings'];

        const aTop = a.title.split('/')[0];
        const bTop = b.title.split('/')[0];

        // Sort by top-level section first
        if (aTop !== bTop) {
          const aSectionIdx = sectionOrder.indexOf(aTop);
          const bSectionIdx = sectionOrder.indexOf(bTop);

          if (aSectionIdx !== -1 && bSectionIdx !== -1) {
            return aSectionIdx - bSectionIdx;
          }
          if (aSectionIdx !== -1) return -1;
          if (bSectionIdx !== -1) return 1;
          return aTop.localeCompare(bTop);
        }

        // Within the same top-level section, keep folder ordering stable
        if (a.title !== b.title) {
          return a.title.localeCompare(b.title);
        }

        // Within "Components" section, use custom order
        if (aTop === 'Components') {
          // Autodocs pages come first
          const aIsAutodocs = a.name === 'Docs' || a.id?.endsWith('--docs');
          const bIsAutodocs = b.name === 'Docs' || b.id?.endsWith('--docs');

          if (aIsAutodocs && !bIsAutodocs) return -1;
          if (!aIsAutodocs && bIsAutodocs) return 1;

          const aIdx = componentsOrder.indexOf(a.name);
          const bIdx = componentsOrder.indexOf(b.name);

          if (aIdx !== -1 && bIdx !== -1) {
            return aIdx - bIdx;
          }
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
        }

        // Within "Server" section, use custom order
        if (aTop === 'Server') {
          // Autodocs pages come first
          const aIsAutodocs = a.name === 'Docs' || a.id?.endsWith('--docs');
          const bIsAutodocs = b.name === 'Docs' || b.id?.endsWith('--docs');

          if (aIsAutodocs && !bIsAutodocs) return -1;
          if (!aIsAutodocs && bIsAutodocs) return 1;

          const aIdx = serverOrder.indexOf(a.name);
          const bIdx = serverOrder.indexOf(b.name);

          if (aIdx !== -1 && bIdx !== -1) {
            return aIdx - bIdx;
          }
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
        }

        // Within "Templates" section, use custom order
        if (aTop === 'Templates') {
          const aIsAutodocs = a.name === 'Docs' || a.id?.endsWith('--docs');
          const bIsAutodocs = b.name === 'Docs' || b.id?.endsWith('--docs');

          if (aIsAutodocs && !bIsAutodocs) return -1;
          if (!aIsAutodocs && bIsAutodocs) return 1;

          const aIdx = templatesOrder.indexOf(a.name);
          const bIdx = templatesOrder.indexOf(b.name);

          if (aIdx !== -1 && bIdx !== -1) {
            return aIdx - bIdx;
          }
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
        }

        // Default alphabetical for other sections
        return a.name.localeCompare(b.name);
      },
    },
  },

  tags: ['autodocs']
};

export default preview;
