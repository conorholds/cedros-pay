/**
 * Catalog Section
 *
 * Umbrella sidebar entry that consolidates catalog setup workflows behind tabs.
 */

import { useMemo } from 'react';
import { InventorySection } from './InventorySection';
import { SubscriptionsSection } from './SubscriptionsSection';
import { CouponsSection, ProductsSection } from './sections';
import { TabbedHubSection, resolveHubTabs, type HubTab } from './TabbedHubSection';
import { useCommerceFeatureFlags } from './commerceFeatureSettings';
import type { SectionProps } from './types';

/** Catalog tabs whose visibility depends on the async Pay hub feature read. */
const GATED_CATALOG_TABS = new Set(['inventory', 'subscriptions', 'coupons']);

const CATALOG_TABS: HubTab[] = [
  {
    id: 'products',
    label: 'Products',
    title: 'Products',
    description: 'Manage products, pricing, availability, and Stripe sync.',
    Component: ProductsSection,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    title: 'Inventory',
    description: 'Review stock levels and product inventory adjustments.',
    Component: InventorySection,
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    title: 'Subscriptions',
    description: 'Configure recurring plans and subscription availability.',
    Component: SubscriptionsSection,
  },
  {
    id: 'coupons',
    label: 'Coupons',
    title: 'Coupons',
    description: 'Create discounts for products, categories, and checkout.',
    Component: CouponsSection,
  },
];

export function CatalogSection(props: SectionProps) {
  const { flags, isLoading } = useCommerceFeatureFlags(props.serverUrl, props.authManager);
  const tabs = useMemo(
    () => resolveHubTabs(CATALOG_TABS, {
      pending: isLoading,
      routeSectionId: 'catalog',
      isGated: (tabId) => GATED_CATALOG_TABS.has(tabId),
      isVisible: (tabId) => {
        if (tabId === 'inventory') return flags.inventory;
        if (tabId === 'subscriptions') return flags.subscriptions;
        if (tabId === 'coupons') return flags.coupons;
        return true;
      },
    }),
    [flags, isLoading]
  );

  return (
    <TabbedHubSection
      {...props}
      tabs={tabs}
      title="Catalog"
      description="Manage products and enabled catalog workflows."
      routeSectionId="catalog"
    />
  );
}
