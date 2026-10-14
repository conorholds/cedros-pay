/**
 * Transactions Hub Section
 *
 * Umbrella sidebar entry that consolidates transaction history and related
 * order activity behind tabs.
 */

import { useMemo } from 'react';
import { DisputesSection } from './DisputesSection';
import { OrdersSection } from './OrdersSection';
import { ReturnsSection } from './ReturnsSection';
import { RefundsSection, TransactionsSection } from './sections';
import { TabbedHubSection, resolveHubTabs, type HubTab } from './TabbedHubSection';
import { useCommerceFeatureFlags } from './commerceFeatureSettings';
import type { SectionProps } from './types';

/** Hub tabs whose visibility depends on the async feature / runtime read. */
const GATED_TRANSACTIONS_TABS = new Set(['refunds', 'returns', 'disputes']);

const TRANSACTIONS_HUB_TABS: HubTab[] = [
  {
    id: 'transactions',
    label: 'Transactions',
    title: 'Transactions',
    description: 'Review payment attempts, confirmation state, and refunds across card, crypto, and credits.',
    Component: TransactionsSection,
  },
  {
    id: 'orders',
    label: 'Orders',
    title: 'Orders',
    description: 'Track purchase lifecycle, fulfillment status, and order revenue.',
    Component: OrdersSection,
  },
  {
    id: 'refunds',
    label: 'Refunds',
    title: 'Refunds',
    description: 'Review refund requests and outcomes across enabled payment methods.',
    Component: RefundsSection,
  },
  {
    id: 'returns',
    label: 'Returns',
    title: 'Returns',
    description: 'Manage return requests and their review status.',
    Component: ReturnsSection,
  },
  {
    id: 'disputes',
    label: 'Disputes',
    title: 'Disputes',
    description: 'Review chargebacks and customer payment disputes.',
    Component: DisputesSection,
  },
];

export function TransactionsHubSection(props: SectionProps) {
  const { availability, flags, isLoading } = useCommerceFeatureFlags(
    props.serverUrl,
    props.authManager
  );
  const tabs = useMemo(
    () => resolveHubTabs(TRANSACTIONS_HUB_TABS, {
      pending: isLoading,
      routeSectionId: 'transactions',
      isGated: (tabId) => GATED_TRANSACTIONS_TABS.has(tabId),
      isVisible: (tabId) => {
        if (tabId === 'refunds') return flags.refunds;
        if (tabId === 'returns') return flags.returns && availability.returns;
        if (tabId === 'disputes') return availability.disputes;
        return true;
      },
    }),
    [availability, flags, isLoading]
  );

  return (
    <TabbedHubSection
      {...props}
      tabs={tabs}
      routeSectionId="transactions"
    />
  );
}
