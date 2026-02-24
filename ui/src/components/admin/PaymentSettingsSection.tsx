/**
 * Payment Settings Section
 *
 * Combined settings page for all payment methods:
 * - Stripe (card payments)
 * - Crypto (x402/Solana payments)
 * - Credits (cedros-login credits)
 */

import { useState, type ReactNode } from 'react';
import { SingleCategorySettings } from './SingleCategorySettings';
import type { SectionProps } from './types';

type PaymentTab = 'stripe' | 'crypto' | 'credits';

/** External link component */
function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'inherit', textDecoration: 'underline' }}
    >
      {children}
    </a>
  );
}

const TABS: { id: PaymentTab; label: string; category: string; description: ReactNode }[] = [
  {
    id: 'stripe',
    label: 'Stripe',
    category: 'stripe',
    description: (
      <>
        Configure your Stripe integration for card payments. Get your API keys from the{' '}
        <ExtLink href="https://dashboard.stripe.com/apikeys">Stripe Dashboard</ExtLink>.
      </>
    ),
  },
  {
    id: 'crypto',
    label: 'Crypto',
    category: 'x402',
    description: (
      <>
        Configure Solana wallet and token settings for crypto payments. Get a fast RPC endpoint from{' '}
        <ExtLink href="https://www.helius.dev">Helius</ExtLink> or{' '}
        <ExtLink href="https://www.quicknode.com/chains/sol">QuickNode</ExtLink>. Set up a payment address using{' '}
        <ExtLink href="https://phantom.app">Phantom</ExtLink> or{' '}
        <ExtLink href="https://solflare.com">Solflare</ExtLink> wallet.
      </>
    ),
  },
  {
    id: 'credits',
    label: 'Credits',
    category: 'cedros_login',
    description: (
      <>
        Configure Cedros Login integration for credits payments. See the{' '}
        <ExtLink href="https://docs.cedros.dev/credits">Credits API documentation</ExtLink>.
      </>
    ),
  },
];

export function PaymentSettingsSection({ serverUrl, apiKey, authManager }: SectionProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('stripe');

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="cedros-admin__payment-settings">
      {/* Page Header */}
      <div className="cedros-admin__page-header">
        <h2 className="cedros-admin__page-title">Payment Options</h2>
        <p className="cedros-admin__page-description">
          Configure payment methods including Stripe, crypto, and credits.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="cedros-admin__tabs cedros-admin__tabs--line">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`cedros-admin__tab ${activeTab === tab.id ? 'cedros-admin__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: '1rem' }}>
        <SingleCategorySettings
          key={currentTab.category}
          serverUrl={serverUrl}
          apiKey={apiKey}
          authManager={authManager}
          category={currentTab.category}
          title={`${currentTab.label} Settings`}
          description={currentTab.description}
          showEnabledToggle={true}
        />
      </div>
    </div>
  );
}
