/**
 * Cedros Pay Admin Dashboard
 *
 * A complete, ready-to-use admin panel for managing payments, products, and refunds.
 * Follows shadcn/ui dashboard patterns.
 *
 * @example
 * ```tsx
 * // Minimal setup - everything included
 * function AdminPage() {
 *   return <CedrosPayAdminDashboard serverUrl="https://api.example.com" />;
 * }
 *
 * // Customized sections
 * function AdminPage() {
 *   return (
 *     <CedrosPayAdminDashboard
 *       serverUrl="https://api.example.com"
 *       sections={['overview', 'products', 'transactions', 'refunds']}
 *       title="Payment Admin"
 *     />
 *   );
 * }
 * ```
 */

import { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Icons } from './icons';
import {
  ProductsSection,
  TransactionsSection,
  CouponsSection,
  RefundsSection,
  SettingsSection,
} from './sections';
import { useAdminAuth } from './useAdminAuth';
import { useCedrosThemeOptional } from '../../context/ThemeContext';
import './CedrosPayAdminDashboard.css';

const LazySubscriptionsSection = lazy(() =>
  import('./SubscriptionsSection').then((module) => ({ default: module.SubscriptionsSection }))
);
const LazyStorefrontSection = lazy(() =>
  import('./StorefrontSection').then((module) => ({ default: module.StorefrontSection }))
);
const LazyAISettingsSection = lazy(() =>
  import('./AISettingsSection').then((module) => ({ default: module.AISettingsSection }))
);
const LazyPaymentSettingsSection = lazy(() =>
  import('./PaymentSettingsSection').then((module) => ({ default: module.PaymentSettingsSection }))
);
const LazyMessagingSection = lazy(() =>
  import('./MessagingSection').then((module) => ({ default: module.MessagingSection }))
);
const LazyFAQSection = lazy(() =>
  import('./FAQSection').then((module) => ({ default: module.FAQSection }))
);

/** Available dashboard sections */
export type DashboardSection =
  | 'products'
  | 'subscriptions'
  | 'transactions'
  | 'coupons'
  | 'refunds'
  | 'storefront'
  | 'ai-settings'
  | 'faqs'
  | 'payment-settings'
  | 'messaging'
  | 'settings';

/** Theme mode for the dashboard */
export type AdminThemeMode = 'light' | 'dark' | 'system';

export interface CedrosPayAdminDashboardProps {
  /** Backend server URL */
  serverUrl: string;
  /** @deprecated Use wallet connection or cedrosLoginToken instead */
  apiKey?: string;
  /** Dashboard title */
  title?: string;
  /** Sections to display (defaults to all) */
  sections?: DashboardSection[];
  /** Initial active section */
  defaultSection?: DashboardSection;
  /**
   * @deprecated Stats are now embedded in individual sections
   * Auto-refresh interval for stats in ms (0 to disable)
   */
  refreshInterval?: number;
  /** Items per page for lists */
  pageSize?: number;
  /** Callback when section changes */
  onSectionChange?: (section: DashboardSection) => void;
  /** Additional CSS class */
  className?: string;
  /** JWT token from cedros-login for admin authentication */
  cedrosLoginToken?: string;
  /** Whether the cedros-login user is an admin (required if using cedrosLoginToken) */
  isAdmin?: boolean;
  /**
   * Theme mode: 'light', 'dark', or 'system' (default: 'system')
   * - If inside CedrosProvider: 'system' follows provider theme, explicit values override
   * - If outside CedrosProvider: 'system' follows OS preference
   */
  theme?: AdminThemeMode;
}

interface SectionConfig {
  id: DashboardSection;
  label: string;
  icon: React.ReactNode;
}

interface SectionGroup {
  label: string;
  sections: SectionConfig[];
  /** If true, group can be collapsed (default expanded) */
  collapsible?: boolean;
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    label: 'Menu',
    sections: [
      { id: 'transactions', label: 'Transactions', icon: Icons.transactions },
      { id: 'products', label: 'Products', icon: Icons.products },
      { id: 'subscriptions', label: 'Subscriptions', icon: Icons.calendarRepeat },
      { id: 'coupons', label: 'Coupons', icon: Icons.coupons },
      { id: 'refunds', label: 'Refunds', icon: Icons.refunds },
    ],
  },
  {
    label: 'Configuration',
    collapsible: true,
    sections: [
      { id: 'storefront', label: 'Storefront', icon: Icons.storefront },
      { id: 'ai-settings', label: 'Store AI', icon: Icons.brain },
      { id: 'faqs', label: 'Knowledge Base', icon: Icons.faq },
      { id: 'payment-settings', label: 'Payment Options', icon: Icons.creditCard },
      { id: 'messaging', label: 'Store Messages', icon: Icons.mail },
      { id: 'settings', label: 'Store Server', icon: Icons.server },
    ],
  },
];

// Flat list for backwards compatibility
const ALL_SECTIONS: SectionConfig[] = SECTION_GROUPS.flatMap((g) => g.sections);

/**
 * Cedros Pay Admin Dashboard
 *
 * Provides a complete admin interface with sidebar navigation.
 * Follows shadcn/ui dashboard patterns.
 */
/** Hook to detect system color scheme preference (fallback when not in CedrosProvider) */
function useSystemTheme(): 'light' | 'dark' {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return systemTheme;
}

/**
 * Resolve theme mode with priority:
 * 1. Explicit theme prop (if not 'system')
 * 2. CedrosProvider theme (if available)
 * 3. System preference
 */
function useResolvedTheme(
  themeProp: AdminThemeMode,
  providerMode: 'light' | 'dark' | null,
  systemTheme: 'light' | 'dark'
): 'light' | 'dark' {
  // Explicit prop takes priority (unless 'system')
  if (themeProp !== 'system') {
    return themeProp;
  }
  // Use provider theme if available
  if (providerMode) {
    return providerMode;
  }
  // Fall back to system preference
  return systemTheme;
}

export function CedrosPayAdminDashboard({
  serverUrl,
  apiKey,
  title = 'Cedros Pay',
  sections = ['transactions', 'products', 'subscriptions', 'coupons', 'refunds', 'storefront', 'ai-settings', 'faqs', 'payment-settings', 'messaging', 'settings'],
  defaultSection = 'transactions',
  refreshInterval: _refreshInterval = 30000,
  pageSize = 20,
  onSectionChange,
  className = '',
  cedrosLoginToken,
  isAdmin = false,
  theme = 'system',
}: CedrosPayAdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<DashboardSection>(defaultSection);
  const [isLoading] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroupCollapse = useCallback((groupLabel: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupLabel)) {
        next.delete(groupLabel);
      } else {
        next.add(groupLabel);
      }
      return next;
    });
  }, []);

  // Theme detection: provider > prop > system
  const providerTheme = useCedrosThemeOptional();
  const systemTheme = useSystemTheme();
  const resolvedTheme = useResolvedTheme(theme, providerTheme?.mode ?? null, systemTheme);
  const themeClass = resolvedTheme === 'dark' ? 'cedros-admin--dark' : '';

  // Initialize admin auth with wallet + cedros-login support
  const wallet = useWallet();
  const { authManager, isAuthenticated } = useAdminAuth({
    serverUrl,
    cedrosLoginToken,
    isAdmin,
    wallet,
  });

  const handleSectionChange = useCallback(
    (section: DashboardSection) => {
      setActiveSection(section);
      onSectionChange?.(section);
    },
    [onSectionChange]
  );

  const enabledSections = ALL_SECTIONS.filter((s) => sections.includes(s.id));
  const currentSection = enabledSections.find((s) => s.id === activeSection);

  if (isLoading) {
    return (
      <div className={`cedros-admin cedros-admin--loading ${themeClass} ${className}`}>
        {Icons.loading}
        <span className="cedros-admin__loading-text">Loading dashboard...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`cedros-admin cedros-admin--unauthenticated ${themeClass} ${className}`}>
        <p className="cedros-admin__auth-prompt">Please connect a wallet or sign in as admin to access the dashboard.</p>
      </div>
    );
  }

  return (
    <div className={`cedros-admin ${themeClass} ${className}`}>
        {/* Sidebar */}
        <aside className="cedros-admin__sidebar">
        <div className="cedros-admin__sidebar-header">
          <div className="cedros-admin__logo">
            {Icons.wallet}
            <span className="cedros-admin__logo-text">{title}</span>
          </div>
        </div>

        <nav className="cedros-admin__nav">
          {SECTION_GROUPS.map((group) => {
            // Filter to only show sections that are enabled
            const groupSections = group.sections.filter((s) => sections.includes(s.id));
            if (groupSections.length === 0) return null;

            const isCollapsed = group.collapsible && collapsedGroups.has(group.label);

            return (
              <div key={group.label} className="cedros-admin__nav-group">
                {group.collapsible ? (
                  <button
                    type="button"
                    className="cedros-admin__nav-label cedros-admin__nav-label--collapsible"
                    onClick={() => toggleGroupCollapse(group.label)}
                    aria-expanded={!isCollapsed}
                  >
                    {group.label}
                    <span className={`cedros-admin__nav-label-icon ${isCollapsed ? '' : 'cedros-admin__nav-label-icon--expanded'}`}>
                      {Icons.chevronRight}
                    </span>
                  </button>
                ) : (
                  <span className="cedros-admin__nav-label">{group.label}</span>
                )}
                {!isCollapsed && groupSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`cedros-admin__nav-item ${activeSection === section.id ? 'cedros-admin__nav-item--active' : ''}`}
                    onClick={() => handleSectionChange(section.id)}
                    aria-current={activeSection === section.id ? 'page' : undefined}
                  >
                    <span className="cedros-admin__nav-icon">{section.icon}</span>
                    <span className="cedros-admin__nav-text">{section.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="cedros-admin__main">
        <header className="cedros-admin__header">
          <div className="cedros-admin__breadcrumb">
            <span className="cedros-admin__breadcrumb-root">{title}</span>
            <span className="cedros-admin__breadcrumb-sep">{Icons.chevronRight}</span>
            <span className="cedros-admin__breadcrumb-current">{currentSection?.label}</span>
          </div>
        </header>

        <div className="cedros-admin__content">
          {activeSection === 'products' && (
            <ProductsSection
              serverUrl={serverUrl}
              apiKey={apiKey}
              pageSize={pageSize}
              authManager={authManager}
            />
          )}
          {activeSection === 'subscriptions' && (
            <Suspense fallback={<div className="cedros-admin__loading-text">Loading section...</div>}>
              <LazySubscriptionsSection
                serverUrl={serverUrl}
                apiKey={apiKey}
                authManager={authManager}
              />
            </Suspense>
          )}
          {activeSection === 'transactions' && (
            <TransactionsSection
              serverUrl={serverUrl}
              apiKey={apiKey}
              pageSize={pageSize}
              authManager={authManager}
            />
          )}
          {activeSection === 'coupons' && (
            <CouponsSection
              serverUrl={serverUrl}
              apiKey={apiKey}
              pageSize={pageSize}
              authManager={authManager}
            />
          )}
          {activeSection === 'refunds' && (
            <RefundsSection
              serverUrl={serverUrl}
              apiKey={apiKey}
              pageSize={pageSize}
              authManager={authManager}
            />
          )}
          {activeSection === 'storefront' && (
            <Suspense fallback={<div className="cedros-admin__loading-text">Loading section...</div>}>
              <LazyStorefrontSection
                serverUrl={serverUrl}
                apiKey={apiKey}
                authManager={authManager}
              />
            </Suspense>
          )}
          {activeSection === 'ai-settings' && (
            <Suspense fallback={<div className="cedros-admin__loading-text">Loading section...</div>}>
              <LazyAISettingsSection
                serverUrl={serverUrl}
                apiKey={apiKey}
                authManager={authManager}
              />
            </Suspense>
          )}
          {activeSection === 'faqs' && (
            <Suspense fallback={<div className="cedros-admin__loading-text">Loading section...</div>}>
              <LazyFAQSection
                serverUrl={serverUrl}
                apiKey={apiKey}
                pageSize={pageSize}
                authManager={authManager}
              />
            </Suspense>
          )}
          {activeSection === 'payment-settings' && (
            <Suspense fallback={<div className="cedros-admin__loading-text">Loading section...</div>}>
              <LazyPaymentSettingsSection
                serverUrl={serverUrl}
                apiKey={apiKey}
                authManager={authManager}
              />
            </Suspense>
          )}
          {activeSection === 'messaging' && (
            <Suspense fallback={<div className="cedros-admin__loading-text">Loading section...</div>}>
              <LazyMessagingSection
                serverUrl={serverUrl}
                apiKey={apiKey}
                authManager={authManager}
              />
            </Suspense>
          )}
          {activeSection === 'settings' && (
            <SettingsSection
              serverUrl={serverUrl}
              apiKey={apiKey}
              authManager={authManager}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default CedrosPayAdminDashboard;
