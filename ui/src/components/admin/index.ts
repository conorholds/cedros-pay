/**
 * Admin Dashboard Components
 *
 * Complete admin panel for managing Cedros Pay payments, products, and refunds.
 */

import {
  createElement,
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
  type ReactElement,
} from 'react';
import type { SectionProps } from './types';
import type { SettingsSectionProps } from './SettingsSection';

function lazySection<P>(
  loader: () => Promise<{ default: ComponentType<P> }>
): ComponentType<P> {
  const LazyComponent: LazyExoticComponent<ComponentType<P>> = lazy(loader);

  const WrappedSection = (props: P): ReactElement =>
    createElement(
      Suspense,
      { fallback: null },
      (createElement as (...args: unknown[]) => ReactElement)(LazyComponent, props)
    );

  WrappedSection.displayName = 'LazyAdminSection';
  return WrappedSection;
}

export {
  CedrosPayAdminDashboard,
  type CedrosPayAdminDashboardProps,
  type DashboardSection,
} from './CedrosPayAdminDashboard';

// Config API components for standalone use
export { ConfigEditor, type ConfigEditorProps } from './ConfigEditor';
export const SettingsSection = lazySection<SettingsSectionProps>(() =>
  import('./SettingsSection').then((module) => ({ default: module.SettingsSection }))
);
export { type SettingsSectionProps } from './SettingsSection';

export const SubscriptionsSection = lazySection<SectionProps>(() =>
  import('./SubscriptionsSection').then((module) => ({ default: module.SubscriptionsSection }))
);
export const StorefrontSection = lazySection<SectionProps>(() =>
  import('./StorefrontSection').then((module) => ({ default: module.StorefrontSection }))
);
export const FAQSection = lazySection<SectionProps>(() =>
  import('./FAQSection').then((module) => ({ default: module.FAQSection }))
);

// Subscription and storefront types
export type { SubscriptionPlan, SubscriptionSettings, ProductPageSettings, RelatedProductsMode } from './types';
export {
  ConfigApiClient,
  CONFIG_CATEGORIES,
  REDACTED_VALUE,
  isSecretField,
  type ConfigCategory,
  type CategoryMeta,
  type FieldMeta,
  type GetConfigResponse,
  type ValidateConfigResponse,
  type ConfigHistoryEntry,
  type AdminAuth,
} from './configApi';

// Admin auth for wallet + cedros-login integration
export {
  AdminAuthManager,
  ADMIN_NONCE_PURPOSES,
  type IAdminAuthManager,
  type AdminAuthMethod,
  type AdminCredentials,
  type WalletSigner,
  type AdminAuthHeaders,
  type JwtAuthHeaders,
} from './AdminAuthManager';
export {
  useAdminAuth,
  type AdminWalletState,
  type UseAdminAuthOptions,
  type UseAdminAuthResult,
} from './useAdminAuth';
