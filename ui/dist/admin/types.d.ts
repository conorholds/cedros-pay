import { ComponentType, ReactNode } from 'react';
/**
 * Configuration for an admin section (sidebar item).
 */
export interface AdminSectionConfig {
    /** Unique section identifier */
    id: string;
    /** Display label in sidebar */
    label: string;
    /** Icon element (SVG) */
    icon: ReactNode;
    /** Sidebar group: 'Users', 'Store', 'Configuration' */
    group?: string;
    /** Sort order within group (lower = first) */
    order?: number;
    /** Required permission to view this section */
    requiredPermission?: string;
}
/**
 * Sidebar group configuration.
 */
export interface AdminGroupConfig {
    /** Group identifier */
    id: string;
    /** Display label */
    label: string;
    /** Sort order (lower = first) */
    order?: number;
    /** If true, group can be collapsed (default expanded) */
    collapsible?: boolean;
}
/**
 * Props passed to section components by the shell.
 */
export interface AdminSectionProps {
    /** Plugin context with auth and config */
    context: PluginContext;
}
/**
 * Host context aggregated from all providers.
 * The AdminShell collects this from the environment.
 */
export interface HostContext {
    /** cedros-login auth state (if available) */
    cedrosLogin?: {
        user: {
            id: string;
            email?: string;
        } | null;
        getAccessToken: () => string | null;
        serverUrl: string;
    };
    /** cedros-pay auth state (if available) */
    cedrosPay?: {
        walletAddress?: string;
        jwtToken?: string;
        serverUrl: string;
    };
    /** Organization context (if available) */
    org?: {
        orgId: string;
        role: string;
        permissions: string[];
    };
}
/**
 * Plugin-specific context passed to section components.
 * Each plugin's createPluginContext converts HostContext to this.
 */
export interface PluginContext {
    /** Backend server URL */
    serverUrl: string;
    /** Current user ID (if authenticated) */
    userId?: string;
    /** Get access token for API requests */
    getAccessToken: () => string | null;
    /** Check if user has a permission */
    hasPermission: (permission: string) => boolean;
    /** Organization ID (if in org context) */
    orgId?: string;
    /** Plugin-specific data */
    pluginData?: Record<string, unknown>;
}
/**
 * Admin plugin definition.
 * Each package (cedros-login, cedros-pay) exports one of these.
 */
export interface AdminPlugin {
    /** Unique plugin identifier */
    id: string;
    /** Display name */
    name: string;
    /** Plugin version (semver) */
    version: string;
    /** Section configurations for sidebar */
    sections: AdminSectionConfig[];
    /** Optional group configurations */
    groups?: AdminGroupConfig[];
    /** Lazy-loaded section components keyed by section id */
    components: Record<string, ComponentType<AdminSectionProps>>;
    /**
     * Convert host context to plugin-specific context.
     * Called when rendering a section from this plugin.
     */
    createPluginContext: (hostContext: HostContext) => PluginContext;
    /**
     * Check if user has permission for a plugin-specific action.
     */
    checkPermission: (permission: string, hostContext: HostContext) => boolean;
    /** CSS namespace for style isolation (e.g., 'cedros-admin') */
    cssNamespace: string;
    /** Optional CSS to inject or loader function */
    styles?: string | (() => Promise<void>);
}
//# sourceMappingURL=types.d.ts.map