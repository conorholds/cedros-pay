/**
 * Cedros Pay Admin Plugin
 *
 * Exports the cedrosPayPlugin for use with the unified AdminShell.
 * When used with cedros-login's plugin, provides a combined admin interface.
 */

import { lazy, useMemo, type ComponentType } from 'react';
import { useCedrosLogin } from '@cedros/login-react';
import type { AdminPlugin, AdminSectionProps, HostContext, PluginContext } from './types';
import type { SectionProps } from '../components/admin/types';
import { AdminAuthManager } from '../components/admin/AdminAuthManager';
import { Icons } from '../components/admin/icons';

// Lazy-load section components wrapped with AdminSectionProps adapter
const wrapSection = (
  importFn: () => Promise<{ default: ComponentType<SectionProps> }>
): ComponentType<AdminSectionProps> => {
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    const OriginalComponent = module.default;

    // Return a wrapper that converts AdminSectionProps to SectionProps
    const WrappedComponent = ({ pluginContext }: AdminSectionProps) => {
      // Read JWT directly from cedros-login React context (same approach
      // as cedros-login's own sections). pluginContext.getAccessToken() depends
      // on the consuming app correctly wiring hostContext.cedrosLogin.getAccessToken,
      // which may not include _internal.getAccessToken from the context.
      const loginCtx = useCedrosLogin();
      const token = loginCtx?._internal?.getAccessToken() ?? pluginContext.getAccessToken();

      const authManager = useMemo(() => {
        const mgr = new AdminAuthManager(pluginContext.serverUrl);
        mgr.setCedrosLoginAuth(token ?? null, !!token);
        return mgr;
      }, [pluginContext.serverUrl, token]);

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
    { id: 'transactions', label: 'Transactions', icon: Icons.transactions, group: 'Store', order: 0 },
    { id: 'products', label: 'Products', icon: Icons.products, group: 'Store', order: 1 },
    { id: 'subscriptions', label: 'Subscriptions', icon: Icons.subscriptions, group: 'Store', order: 2 },
    { id: 'coupons', label: 'Coupons', icon: Icons.coupons, group: 'Store', order: 3 },
    { id: 'refunds', label: 'Refunds', icon: Icons.refunds, group: 'Store', order: 4 },
    // Configuration group
    { id: 'storefront', label: 'Storefront', icon: Icons.storefront, group: 'Configuration', order: 10 },
    { id: 'ai-settings', label: 'Store AI', icon: Icons.ai, group: 'Configuration', order: 11 },
    { id: 'faqs', label: 'Knowledge Base', icon: Icons.faq, group: 'Configuration', order: 12 },
    { id: 'payment-settings', label: 'Payment Options', icon: Icons.wallet, group: 'Configuration', order: 13 },
    { id: 'messaging', label: 'Store Messages', icon: Icons.notifications, group: 'Configuration', order: 14 },
    { id: 'settings', label: 'Store Server', icon: Icons.settings, group: 'Configuration', order: 15 },
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
    'storefront': wrapSection(() => import('../components/admin/StorefrontSection').then(m => ({ default: m.StorefrontSection }))),
    'ai-settings': wrapSection(() => import('../components/admin/AISettingsSection').then(m => ({ default: m.AISettingsSection }))),
    'faqs': wrapSection(() => import('../components/admin/FAQSection').then(m => ({ default: m.FAQSection }))),
    'payment-settings': wrapSection(() => import('../components/admin/PaymentSettingsSection').then(m => ({ default: m.PaymentSettingsSection }))),
    'messaging': wrapSection(() => import('../components/admin/MessagingSection').then(m => ({ default: m.MessagingSection }))),
    'settings': wrapSection(() => import('../components/admin/SettingsSection').then(m => ({ default: m.SettingsSection }))),
  },

  createPluginContext(hostContext: HostContext): PluginContext {
    const payContext = hostContext.cedrosPay;
    const loginContext = hostContext.cedrosLogin;

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
      orgId: hostContext.org?.orgId,
      pluginData: {
        walletAddress: payContext?.walletAddress,
      },
    };
  },

  checkPermission(permission: string, hostContext: HostContext): boolean {
    // cedros-pay uses simpler permission model
    // If org context exists, check org.permissions
    if (hostContext.org?.permissions) {
      return hostContext.org.permissions.includes(permission);
    }
    // Otherwise, assume admin access if authenticated
    return !!(hostContext.cedrosLogin?.user || hostContext.cedrosPay?.jwtToken || hostContext.cedrosPay?.walletAddress);
  },

  cssNamespace: 'cedros-dashboard',
};

export default cedrosPayPlugin;
