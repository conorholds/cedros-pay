import type { ComponentType, ReactNode } from 'react';
import type { AdminModuleManifest } from '../extension/adminModuleManifest';

export const HOST_SERVICE_IDS = {
  cedrosBalance: 'cedrosBalance',
  cedrosLogin: 'cedrosLogin',
  cedrosPay: 'cedrosPay',
  org: 'org',
} as const;

export type PluginId = string;
export type SectionId = string;
export type QualifiedSectionId = `${string}:${string}`;
export type PluginPermission = string;

export interface AdminHostServiceBag {
  [serviceId: string]: unknown;
}

export interface AdminRouteHint {
  moduleId?: string;
  sectionId?: string;
  tabId?: string;
  defaultTabId?: string;
}

export interface AdminHostContext {
  locale?: string;
  moduleId?: string;
  sectionId?: string;
  tabId?: string;
  defaultTabId?: string;
  route?: AdminRouteHint;
  currentRoute?: AdminRouteHint;
  routeState?: AdminRouteHint;
  navigationTarget?: AdminRouteHint;
  adminRoute?: AdminRouteHint;
  pluginData?: Record<string, unknown>;
  services?: AdminHostServiceBag;
  cedrosPay?: {
    serverUrl?: string;
    extensionBaseUrl?: string;
    runtimeBaseUrl?: string;
    apiBaseUrl?: string;
    jwtToken?: string;
    walletAddress?: string;
    locale?: string;
  };
  cedrosLogin?: {
    user?: { id?: string; email?: string; name?: string };
    getAccessToken?: () => string | null;
    serverUrl?: string;
    locale?: string;
  };
  cedrosBalance?: {
    enabled?: boolean;
    installed?: boolean;
  };
  org?: {
    orgId?: string;
    role?: string;
    permissions?: string[];
    capabilities?: string[];
  };
}

export type HostContext = AdminHostContext;

export interface PluginContext {
  serverUrl: string;
  locale?: string;
  userId?: string;
  orgId?: string;
  pluginData?: Record<string, unknown>;
  dependencies?: {
    cedrosBalanceInstalled?: boolean;
  };
  getAccessToken: () => string | null;
  hasPermission: (permission: string) => boolean;
}

export interface AdminSectionProps {
  pluginContext: PluginContext;
}

export interface DashboardCardContributionProps {
  hostContext: AdminHostContext;
  pluginContext: PluginContext;
  extensionId: string;
  refreshInterval: number;
  isLoading: boolean;
  analyticsSnapshot: unknown;
  analyticsError?: string;
}

export interface DashboardCardContribution {
  id: string;
  Component: ComponentType<DashboardCardContributionProps>;
  order?: number;
}

export interface AdminModuleContributions {
  dashboardCards?: DashboardCardContribution[];
  custom?: Record<string, unknown>;
}

export interface AdminSectionConfig {
  id: SectionId;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  group?: string;
  order?: number;
  requiredPermission?: string;
  requiredExtensionId?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface AdminGroupConfig {
  id: string;
  label: string;
  order?: number;
  defaultCollapsed?: boolean;
}

export interface ResolvedSection extends AdminSectionConfig {
  pluginId: PluginId;
  qualifiedId: QualifiedSectionId;
}

export interface AdminPlugin {
  id: PluginId;
  name: string;
  version?: string;
  /**
   * Module manifest the host uses to resolve a loaded runtime admin module.
   * The host filters bootstrap `modules` by `manifest.extensionId` +
   * `manifest.moduleId`; a plugin without it is dropped in favour of the
   * host's manifest-only "Admin bundle not loaded" fallback.
   */
  manifest?: AdminModuleManifest;
  sections: AdminSectionConfig[];
  groups?: AdminGroupConfig[];
  components: Record<string, ComponentType<AdminSectionProps> | ((props: AdminSectionProps) => ReactNode)>;
  cssNamespace?: string;
  contributions?: AdminModuleContributions;
  createPluginContext: (hostContext: HostContext) => PluginContext;
  checkPermission?: (permission: string, hostContext: HostContext) => boolean;
}

export interface PluginRegistry {
  plugins: AdminPlugin[];
}

export function getHostService<T>(hostContext: HostContext, serviceId: string): T | undefined {
  const service = hostContext.services?.[serviceId] as T | undefined;
  if (service) return service;
  return (hostContext as unknown as Record<string, T | undefined>)[serviceId];
}
