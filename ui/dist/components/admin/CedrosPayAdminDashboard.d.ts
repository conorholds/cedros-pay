/** Available dashboard sections */
export type DashboardSection = 'products' | 'subscriptions' | 'transactions' | 'coupons' | 'refunds' | 'storefront' | 'ai-settings' | 'faqs' | 'payment-settings' | 'messaging' | 'settings';
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
export declare function CedrosPayAdminDashboard({ serverUrl, apiKey, title, sections, defaultSection, refreshInterval: _refreshInterval, pageSize, onSectionChange, className, cedrosLoginToken, isAdmin, theme, }: CedrosPayAdminDashboardProps): import("react/jsx-runtime").JSX.Element;
export default CedrosPayAdminDashboard;
//# sourceMappingURL=CedrosPayAdminDashboard.d.ts.map