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

  sections: [
    // Store group (main cedros-pay sections)
    { id: 'transactions', label: 'Transactions', icon: AdminPluginIcons.transactions, group: 'Store', order: 0 },
    { id: 'products', label: 'Products', icon: AdminPluginIcons.products, group: 'Store', order: 1 },
    { id: 'subscriptions', label: 'Subscriptions', icon: AdminPluginIcons.products, group: 'Store', order: 2 },
    { id: 'coupons', label: 'Coupons', icon: AdminPluginIcons.coupons, group: 'Store', order: 3 },
    { id: 'refunds', label: 'Refunds', icon: AdminPluginIcons.refunds, group: 'Store', order: 4 },
    { id: 'compliance', label: 'Compliance', icon: AdminPluginIcons.settings, group: 'Store', order: 5 },
    // Configuration group
    { id: 'storefront', label: 'Storefront', icon: AdminPluginIcons.products, group: 'Configuration', order: 10 },
    { id: 'ai-settings', label: 'Store AI', icon: AdminPluginIcons.settings, group: 'Configuration', order: 11 },
    { id: 'faqs', label: 'Knowledge Base', icon: AdminPluginIcons.settings, group: 'Configuration', order: 12 },
    { id: 'payment-settings', label: 'Payment Options', icon: AdminPluginIcons.wallet, group: 'Configuration', order: 13 },
    { id: 'messaging', label: 'Store Messages', icon: AdminPluginIcons.settings, group: 'Configuration', order: 14 },
    { id: 'settings', label: 'Store Server', icon: AdminPluginIcons.settings, group: 'Configuration', order: 15 },
  ],

  groups: [
    { id: 'Store', label: 'Store', order: 1 },
    { id: 'Configuration', label: 'Configuration', order: 2, defaultCollapsed: true },
  ],

  components: {
    'products': wrapSection(() => import('../components/admin/sections').then(m => ({ default: m.ProductsSection }))),
    'subscriptions': wrapSection(() => import('../components/admin/SubscriptionsSection').then(m => ({ default: m.SubscriptionsSection }))),
    'transactions': wrapSection(() => import('../components/admin/sections').then(m => ({ default: m.TransactionsSection }))),
    'coupons': wrapSection(() => import('../components/admin/sections').then(m => ({ default: m.CouponsSection }))),
    'refunds': wrapSection(() => import('../components/admin/sections').then(m => ({ default: m.RefundsSection }))),
    'compliance': wrapSection(() => import('../components/admin/ComplianceSection').then(m => ({ default: m.ComplianceSection }))),
    'storefront': wrapSection(() => import('../components/admin/StorefrontSection').then(m => ({ default: m.StorefrontSection }))),
    'ai-settings': wrapSection(() => import('../components/admin/AISettingsSection').then(m => ({ default: m.AISettingsSection }))),
    'faqs': wrapSection(() => import('../components/admin/FAQSection').then(m => ({ default: m.FAQSection }))),
    'payment-settings': wrapSection(() => import('../components/admin/PaymentSettingsSection').then(m => ({ default: m.PaymentSettingsSection }))),
    'messaging': wrapSection(() => import('../components/admin/MessagingSection').then(m => ({ default: m.MessagingSection }))),
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
