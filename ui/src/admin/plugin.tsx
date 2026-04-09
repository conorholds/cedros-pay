/**
 * Cedros Pay Admin Plugin
 *
 * Exports the cedrosPayPlugin for use with the unified AdminShell.
 * When used with cedros-login's plugin, provides a combined admin interface.
 */

import { lazy, useMemo, type ComponentType, type ReactNode } from 'react';
import { HOST_SERVICE_IDS, getHostService } from '@cedros/admin-react';
import type { AdminPlugin, AdminSectionProps, HostContext, PluginContext } from './types';
import type { SectionProps } from '../components/admin/types';
import { AdminAuthManager } from '../components/admin/AdminAuthManager';
import { AdminPluginIcons } from '../components/admin/icons';
import { CEDROS_PAY_GROUPS, CEDROS_PAY_SECTIONS } from './sectionIds';

// Lazy-load section components wrapped with AdminSectionProps adapter
const wrapSection = (
  importFn: () => Promise<{ default: ComponentType<SectionProps> }>
): ((props: AdminSectionProps) => ReactNode) => {
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    const OriginalComponent = module.default;

    // Return a wrapper that converts AdminSectionProps to SectionProps
    const WrappedComponent = ({ pluginContext }: AdminSectionProps) => {
      const token = pluginContext.getAccessToken();
      const hasVerifiedAdminPermission =
        pluginContext.hasPermission('cedros-pay:admin') ||
        pluginContext.hasPermission('admin');

      const authManager = useMemo(() => {
        const mgr = new AdminAuthManager(pluginContext.serverUrl);
        mgr.setCedrosLoginAuth(token ?? null, hasVerifiedAdminPermission);
        return mgr;
      }, [hasVerifiedAdminPermission, pluginContext.serverUrl, token]);

      const sectionProps: SectionProps = {
        serverUrl: pluginContext.serverUrl,
        authManager,
      };
      return <OriginalComponent {...sectionProps} />;
    };

    return { default: WrappedComponent };
  });

  return LazyComponent;
};

/**
 * Cedros Pay admin plugin definition.
 *
 * Registers all cedros-pay admin sections for use in the unified AdminShell.
 */
export const cedrosPayPlugin: AdminPlugin = {
  id: 'cedros-pay',
  name: 'Cedros Pay',
  version: '1.0.0',

  sections: CEDROS_PAY_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    icon: {
      transactions: AdminPluginIcons.transactions,
      orders: AdminPluginIcons.transactions,
      products: AdminPluginIcons.products,
      subscriptions: AdminPluginIcons.products,
      coupons: AdminPluginIcons.coupons,
      refunds: AdminPluginIcons.refunds,
      compliance: AdminPluginIcons.settings,
      'chat-logs': AdminPluginIcons.settings,
      customers: AdminPluginIcons.settings,
      disputes: AdminPluginIcons.settings,
      returns: AdminPluginIcons.refunds,
      images: AdminPluginIcons.products,
      inventory: AdminPluginIcons.products,
      storefront: AdminPluginIcons.products,
      'ai-settings': AdminPluginIcons.settings,
      faqs: AdminPluginIcons.settings,
      'payment-settings': AdminPluginIcons.wallet,
      token22: AdminPluginIcons.wallet,
      messaging: AdminPluginIcons.settings,
      webhooks: AdminPluginIcons.settings,
      shipping: AdminPluginIcons.products,
      tax: AdminPluginIcons.transactions,
      settings: AdminPluginIcons.settings,
    }[section.id],
    group: section.group,
    order: section.order,
  })),

  groups: CEDROS_PAY_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    order: group.order,
    defaultCollapsed: group.defaultCollapsed,
  })),

  components: {
    'products': wrapSection(() => import('../components/admin/sections').then(m => ({ default: m.ProductsSection }))),
    'subscriptions': wrapSection(() => import('../components/admin/SubscriptionsSection').then(m => ({ default: m.SubscriptionsSection }))),
    'transactions': wrapSection(() => import('../components/admin/sections').then(m => ({ default: m.TransactionsSection }))),
    'orders': wrapSection(() => import('../components/admin/OrdersSection').then(m => ({ default: m.OrdersSection }))),
    'coupons': wrapSection(() => import('../components/admin/sections').then(m => ({ default: m.CouponsSection }))),
    'refunds': wrapSection(() => import('../components/admin/sections').then(m => ({ default: m.RefundsSection }))),
    'compliance': wrapSection(() => import('../components/admin/ComplianceSection').then(m => ({ default: m.ComplianceSection }))),
    'chat-logs': wrapSection(() => import('../components/admin/ChatLogsSection').then(m => ({ default: m.ChatLogsSection }))),
    'customers': wrapSection(() => import('../components/admin/CustomersSection').then(m => ({ default: m.CustomersSection }))),
    'disputes': wrapSection(() => import('../components/admin/DisputesSection').then(m => ({ default: m.DisputesSection }))),
    'returns': wrapSection(() => import('../components/admin/ReturnsSection').then(m => ({ default: m.ReturnsSection }))),
    'images': wrapSection(() => import('../components/admin/ImagesSection').then(m => ({ default: m.ImagesSection }))),
    'inventory': wrapSection(() => import('../components/admin/InventorySection').then(m => ({ default: m.InventorySection }))),
    'storefront': wrapSection(() => import('../components/admin/StorefrontSection').then(m => ({ default: m.StorefrontSection }))),
    'ai-settings': wrapSection(() => import('../components/admin/AISettingsSection').then(m => ({ default: m.AISettingsSection }))),
    'faqs': wrapSection(() => import('../components/admin/FAQSection').then(m => ({ default: m.FAQSection }))),
    'payment-settings': wrapSection(() => import('../components/admin/PaymentSettingsSection').then(m => ({ default: m.PaymentSettingsSection }))),
    'token22': wrapSection(() => import('../components/admin/Token22Section').then(m => ({ default: m.Token22Section }))),
    'messaging': wrapSection(() => import('../components/admin/MessagingSection').then(m => ({ default: m.MessagingSection }))),
    'webhooks': wrapSection(() => import('../components/admin/WebhooksSection').then(m => ({ default: m.WebhooksSection }))),
    'shipping': wrapSection(() => import('../components/admin/ShippingSection').then(m => ({ default: m.ShippingSection }))),
    'tax': wrapSection(() => import('../components/admin/TaxSection').then(m => ({ default: m.TaxSection }))),
    'settings': wrapSection(() => import('../components/admin/SettingsSection').then(m => ({ default: m.SettingsSection }))),
  },

  createPluginContext(hostContext: HostContext): PluginContext {
    const payContext = getHostService<NonNullable<HostContext['cedrosPay']>>(
      hostContext,
      HOST_SERVICE_IDS.cedrosPay
    );
    const loginContext = getHostService<NonNullable<HostContext['cedrosLogin']>>(
      hostContext,
      HOST_SERVICE_IDS.cedrosLogin
    );
    const orgContext = getHostService<NonNullable<HostContext['org']>>(hostContext, HOST_SERVICE_IDS.org);

    // Prefer cedros-pay serverUrl, fall back to cedros-login
    const serverUrl = payContext?.serverUrl || loginContext?.serverUrl || '';

    return {
      serverUrl,
      userId: loginContext?.user?.id,
      getAccessToken: () => {
        // Prefer JWT from cedros-login, fall back to cedros-pay JWT
        return loginContext?.getAccessToken?.() || payContext?.jwtToken || null;
      },
      hasPermission: (permission: string) => this.checkPermission(permission, hostContext),
      orgId: orgContext?.orgId,
      pluginData: {
        walletAddress: payContext?.walletAddress,
      },
    };
  },

  checkPermission(permission: string, hostContext: HostContext): boolean {
    // Only treat explicitly granted org permissions as UI authorization hints.
    // The server remains authoritative for all admin actions.
    const orgContext = getHostService<NonNullable<HostContext['org']>>(hostContext, HOST_SERVICE_IDS.org);
    if (orgContext?.permissions) {
      return orgContext.permissions.includes(permission);
    }
    return false;
  },

  cssNamespace: 'cedros-dashboard',
};

export default cedrosPayPlugin;
