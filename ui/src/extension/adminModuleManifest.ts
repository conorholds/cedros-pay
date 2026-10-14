/**
 * Admin module manifest types.
 *
 * Extracted into a leaf module so both `extension/types.ts` and
 * `admin/types.ts` can depend on it without creating a circular import.
 * This module must not import from `admin/`.
 */

export interface CedrosExtensionAdminPanelContribution {
  id: string;
  displayName?: string;
  description?: string;
  contentTypes?: Array<'page' | 'docs' | 'blog'>;
  order?: number;
}

export interface CedrosExtensionDashboardCardManifest {
  id: string;
  displayName: string;
  description?: string;
  order?: number;
}

export interface AdminModuleNavigationSection {
  id: string;
  label: string;
  group: string;
  order: number;
  labelKey?: string;
  groupKey?: string;
  hideFromNavigation?: boolean;
  requiredPermission?: string;
  requiredExtensionId?: string;
  replacesSectionIds?: string[];
  disabledReason?: string;
  disabledReasonKey?: string;
  disabled?: boolean;
  adminPageAccess?: {
    configurable?: boolean;
    protected?: boolean;
    routePath?: string;
  };
}

export interface AdminModuleNavigationGroup {
  id: string;
  label: string;
  order: number;
  labelKey?: string;
  defaultCollapsed?: boolean;
  hideLabel?: boolean;
}

export interface AdminModuleNavigation {
  sections: AdminModuleNavigationSection[];
  groups?: AdminModuleNavigationGroup[];
}

export interface AdminModuleManifest {
  moduleId: string;
  extensionId: string;
  displayName: string;
  version: string;
  packageName: string;
  packageSubpath?: string;
  description?: string;
  requiredServices?: string[];
  requiredCapabilities?: string[];
  sectionIds?: string[];
  sectionIcons?: Record<string, string>;
  navigation?: AdminModuleNavigation;
  slots?: string[];
  contributions?: {
    contentEditorPanels?: CedrosExtensionAdminPanelContribution[];
    dashboardCards?: CedrosExtensionDashboardCardManifest[];
  };
}
