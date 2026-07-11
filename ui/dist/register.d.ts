import { ComponentType } from 'react';
import { ReactNode } from 'react';

declare interface AdminGroupConfig {
    id: string;
    label: string;
    order?: number;
    defaultCollapsed?: boolean;
}

declare interface AdminHostContext {
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
        user?: {
            id?: string;
            email?: string;
            name?: string;
        };
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

declare interface AdminHostServiceBag {
    [serviceId: string]: unknown;
}

declare type AdminModule = AdminPlugin;

declare interface AdminModuleContributions {
    dashboardCards?: DashboardCardContribution[];
    custom?: Record<string, unknown>;
}

declare interface AdminModuleManifest {
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
    slots?: string[];
    contributions?: {
        contentEditorPanels?: CedrosExtensionAdminPanelContribution[];
        dashboardCards?: CedrosExtensionDashboardCardManifest[];
        custom?: Record<string, unknown>;
    };
}

declare interface AdminPlugin {
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

declare interface AdminRouteHint {
    moduleId?: string;
    sectionId?: string;
    tabId?: string;
    defaultTabId?: string;
}

declare interface AdminSectionConfig {
    id: SectionId;
    label: string;
    icon?: ComponentType<{
        className?: string;
    }>;
    group?: string;
    order?: number;
    requiredPermission?: string;
    requiredExtensionId?: string;
    disabled?: boolean;
    disabledReason?: string;
}

declare interface AdminSectionProps {
    pluginContext: PluginContext;
}

declare type CedrosDocumentBlockDefinition = Record<string, unknown>;

declare type CedrosDocumentTemplateDefinition = Record<string, unknown>;

/**
 * Admin module manifest types.
 *
 * Extracted into a leaf module so both `extension/types.ts` and
 * `admin/types.ts` can depend on it without creating a circular import.
 * This module must not import from `admin/`.
 */
declare interface CedrosExtensionAdminPanelContribution {
    id: string;
    displayName?: string;
    description?: string;
    contentTypes?: Array<'page' | 'docs' | 'blog'>;
    order?: number;
}

declare interface CedrosExtensionAdminSurface {
    packageRef: 'react';
    required?: boolean;
    moduleIds?: string[];
    slotIds?: string[];
    editorSurfaceIds?: string[];
}

declare interface CedrosExtensionAiCapability {
    id: string;
    name: string;
    description: string;
    kind: 'tool' | 'action';
    tags?: string[];
    visibility: CedrosExtensionAiVisibility;
    endpoint: CedrosExtensionAiCapabilityEndpoint;
    auth?: CedrosExtensionAiCapabilityAuth;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
}

declare interface CedrosExtensionAiCapabilityAuth {
    schemes?: Array<'bearer-token'>;
}

declare interface CedrosExtensionAiCapabilityEndpoint {
    method: 'POST' | 'PUT' | 'PATCH';
    path: string;
}

declare interface CedrosExtensionAiSkill {
    id: string;
    name: string;
    description: string;
    category: string;
    tags?: string[];
    visibility: CedrosExtensionAiVisibility;
    docs: CedrosExtensionAiSkillDocs;
}

declare interface CedrosExtensionAiSkillDocs {
    markdown: string;
}

declare interface CedrosExtensionAiSurface {
    packageRef: 'server';
    skills?: CedrosExtensionAiSkill[];
    capabilities?: CedrosExtensionAiCapability[];
}

declare type CedrosExtensionAiVisibility = 'public' | 'authenticated' | 'admin';

declare interface CedrosExtensionAnalyticsEventManifest {
    id: string;
    displayName: string;
    description: string;
    category: string;
    kind?: string;
    visibility: 'public' | 'authenticated' | 'admin';
}

declare interface CedrosExtensionAnalyticsManifest {
    events?: CedrosExtensionAnalyticsEventManifest[];
}

declare interface CedrosExtensionAuthoredSurfaceManifest {
    id: string;
    displayName: string;
    description?: string;
    eyebrow?: string;
    templateIds?: string[];
}

declare interface CedrosExtensionBlockManifest {
    type: string;
    displayName: string;
    description?: string;
    category: string;
    order: number;
}

declare interface CedrosExtensionBlockRenderer {
    type: string;
    render: (props: CedrosExtensionBlockRenderProps) => unknown;
}

declare interface CedrosExtensionBlockRenderProps {
    block: {
        type: string;
        props?: Record<string, unknown>;
    };
    /** Host-resolved color mode. Undefined during SSR and on older hosts. */
    colorMode?: CedrosResolvedColorMode;
    themeVariant?: string;
    onNavigate?: (route: string) => void;
    siteData?: unknown;
}

declare interface CedrosExtensionBootstrap {
    manifest: CedrosExtensionManifest;
    modules?: AdminModule[];
    contentBlocks?: CedrosDocumentBlockDefinition[];
    contentTemplates?: CedrosDocumentTemplateDefinition[];
    contentBlockRenderers?: CedrosExtensionBlockRenderer[];
}

declare interface CedrosExtensionCapability {
    id: string;
    displayName: string;
    description?: string;
    category: CedrosExtensionCapabilityCategory;
    active?: boolean;
    registered?: boolean;
    requestedScopes: CedrosExtensionCapabilityScope[];
}

declare type CedrosExtensionCapabilityCategory = 'admin' | 'editor' | 'content' | 'runtime' | 'commerce';

declare interface CedrosExtensionCapabilityDependency extends CedrosExtensionDependencyRef {
    capabilityId: string;
}

declare interface CedrosExtensionCapabilityScope {
    verb: CedrosExtensionCapabilityScopeVerb;
    resource: string;
    summary: string;
}

declare type CedrosExtensionCapabilityScopeVerb = 'read' | 'write' | 'trigger' | 'send' | 'call' | 'invoke' | 'expose';

declare interface CedrosExtensionCompatibility {
    platformApiVersion: string;
    minCedrosDataVersion?: string;
    maxCedrosDataVersion?: string;
}

declare interface CedrosExtensionCrmSourceAccessManifest {
    id: string;
    sourceKind: string;
    displayName: string;
    description: string;
    scopes: Array<'write'>;
    eventTypes: string[];
    tags?: string[];
}

declare interface CedrosExtensionCustomerTagAccessManifest {
    id: string;
    displayName: string;
    description: string;
    scopes: Array<'assign' | 'unassign' | 'read'>;
    managedTagSlugs: string[];
    tags?: string[];
}

declare interface CedrosExtensionDashboardCardManifest {
    id: string;
    displayName: string;
    description?: string;
    order?: number;
}

declare interface CedrosExtensionDatabaseAccessManifest {
    id: string;
    displayName: string;
    description: string;
    contentModels?: string[];
    migrations?: string[];
    tags?: string[];
    scopes: CedrosExtensionDatabaseAccessScope[];
}

declare interface CedrosExtensionDatabaseAccessScope {
    verb: 'read' | 'count' | 'write' | 'delete' | 'migrate';
    resource: string;
    summary: string;
}

declare interface CedrosExtensionDependencies {
    services?: CedrosExtensionServiceDependency[];
    capabilities?: CedrosExtensionCapabilityDependency[];
    extensions?: CedrosExtensionFamilyDependency[];
}

declare interface CedrosExtensionDependencyRef {
    required?: boolean;
    reason?: string;
}

declare interface CedrosExtensionDocsArticleManifest {
    id: string;
    displayName: string;
    title: string;
    slug: string;
    routePath?: string;
    excerpt?: string;
    bodyMarkdown: string;
    category?: string;
    tags?: string[];
    productSlug?: string;
    productLabel?: string;
    sectionKey?: string;
    sectionLabel?: string;
    sectionOrder?: number;
    navLabel?: string;
    readingMinutes?: number;
    order?: number;
    aliases?: string[];
    seo?: CedrosExtensionSeoMetadata;
}

declare interface CedrosExtensionFamilyDependency extends CedrosExtensionDependencyRef {
    extensionId: string;
    minVersion?: string;
    maxVersion?: string;
}

declare interface CedrosExtensionFormFieldManifest {
    key: string;
    label: string;
    type: 'text' | 'email' | 'textarea' | 'tel' | 'select' | 'checkbox';
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    options?: CedrosExtensionFormFieldOption[];
}

declare interface CedrosExtensionFormFieldOption {
    label: string;
    value: string;
}

declare interface CedrosExtensionFormTemplateManifest {
    id: string;
    displayName: string;
    title: string;
    description?: string;
    defaultKey?: string;
    status?: 'active' | 'draft';
    scope?: 'contact' | 'other';
    submitLabel?: string;
    successTitle?: string;
    successMessage?: string;
    fields: CedrosExtensionFormFieldManifest[];
}

declare interface CedrosExtensionJobScheduleManifest {
    id: string;
    jobId: string;
    label: string;
    cron: string;
    enabled?: boolean;
    timeoutSeconds?: number;
    maxRetries?: number;
    concurrency?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    autoCreateOnEnable?: boolean;
}

declare interface CedrosExtensionManifest {
    schemaVersion: 1;
    extensionId: string;
    displayName: string;
    version: string;
    description?: string;
    compatibility: CedrosExtensionCompatibility;
    platformApiVersion: string;
    packageFamily: CedrosExtensionPackageFamily;
    dependencies?: CedrosExtensionDependencies;
    surfaces: CedrosExtensionSurfaces;
    registration: CedrosExtensionRegistration;
    adminModules?: AdminModuleManifest[];
    contentBlocks?: CedrosExtensionBlockManifest[];
    contentTemplates?: CedrosExtensionTemplateManifest[];
    authoredSurfaces?: CedrosExtensionAuthoredSurfaceManifest[];
    authoredTemplateUtilities?: CedrosExtensionTemplateUtilityManifest[];
    pageSeeds?: CedrosExtensionPageSeedManifest[];
    formTemplates?: CedrosExtensionFormTemplateManifest[];
    docsArticles?: CedrosExtensionDocsArticleManifest[];
    policies?: CedrosExtensionPolicyManifest[];
    capabilities?: CedrosExtensionCapability[];
    analytics?: CedrosExtensionAnalyticsManifest;
    jobSchedules?: CedrosExtensionJobScheduleManifest[];
    setupSeeds?: CedrosExtensionSetupSeedsManifest;
    providerAccess?: CedrosExtensionProviderAccessManifest[];
    databaseAccess?: CedrosExtensionDatabaseAccessManifest[];
    customerTagAccess?: CedrosExtensionCustomerTagAccessManifest[];
    crmSourceAccess?: CedrosExtensionCrmSourceAccessManifest[];
    onboardingPages?: CedrosExtensionOnboardingPageManifest[];
    requiredServices?: string[];
    requiredCapabilities?: string[];
}

declare interface CedrosExtensionNativeSurface {
    packageRef: 'reactNative';
    required?: boolean;
    screenIds?: string[];
    stackIds?: string[];
    providerIds?: string[];
}

declare type CedrosExtensionNotificationAudience = 'team' | 'personal';

declare type CedrosExtensionNotificationChannelKind = 'email' | 'discord' | 'slack' | 'telegram';

declare interface CedrosExtensionNotificationSeedManifest {
    id: string;
    displayName: string;
    title: string;
    description?: string;
    eventId: string;
    audience: CedrosExtensionNotificationAudience;
    severity?: CedrosExtensionNotificationSeverity;
    defaultChannels?: CedrosExtensionNotificationChannelKind[];
    subjectTemplate?: string;
    bodyTemplate: string;
    tags?: string[];
}

declare type CedrosExtensionNotificationSeverity = 'info' | 'warning' | 'error';

declare interface CedrosExtensionOnboardingPageManifest {
    id: string;
    displayName: string;
    moduleId: string;
    sectionId: string;
    description?: string;
}

declare interface CedrosExtensionPackageFamily {
    server: CedrosExtensionPackageSurface;
    react: CedrosExtensionPackageSurface;
    reactNative: CedrosExtensionPackageSurface;
}

declare interface CedrosExtensionPackageSurface {
    packageName: string;
    version: string;
    subpath?: string;
    required?: boolean;
}

declare interface CedrosExtensionPageSeedManifest {
    id: string;
    displayName: string;
    title: string;
    routePath: string;
    description?: string;
    slug?: string;
    templateId?: string;
    autoCreateOnEnable?: boolean;
    publishOnEnable?: boolean;
    seo?: CedrosExtensionSeoMetadata;
}

declare interface CedrosExtensionPolicyManifest {
    id: string;
    kind: string;
    displayName: string;
    title: string;
    slug: string;
    routePath: string;
    footerLabel: string;
    excerpt: string;
    bodyMarkdown: string;
    category: string;
    tags?: string[];
    seo?: CedrosExtensionSeoMetadata;
}

declare interface CedrosExtensionPriceManifest {
    amountCents: number;
    currency: string;
    billingInterval?: string;
}

declare interface CedrosExtensionProductSeedManifest {
    id: string;
    displayName: string;
    title: string;
    productType: CedrosExtensionProductSeedType;
    description?: string;
    slug?: string;
    variants?: CedrosExtensionProductVariantSeedManifest[];
    tags?: string[];
    lifecycle?: CedrosExtensionSetupSeedLifecycleManifest;
}

declare type CedrosExtensionProductSeedType = 'standard' | 'service' | 'ticket' | 'eventSession' | 'campSession' | 'pass' | 'addon';

declare interface CedrosExtensionProductVariantSeedManifest {
    id: string;
    displayName: string;
    sku?: string;
    price?: CedrosExtensionPriceManifest;
    attributes?: Record<string, string>;
}

declare interface CedrosExtensionProviderAccessManifest {
    id: string;
    provider: CedrosExtensionProviderKind;
    displayName: string;
    description: string;
    scopes: string[];
    tags?: string[];
}

declare type CedrosExtensionProviderKind = 'intelligence' | 'imageGeneration' | 'voice' | 'storage' | 'email' | 'blockchain';

declare interface CedrosExtensionRegistration {
    server: CedrosExtensionSurfaceRegistration;
    admin: CedrosExtensionSurfaceRegistration;
    web: CedrosExtensionSurfaceRegistration;
    native: CedrosExtensionSurfaceRegistration;
}

/** Initial SEO metadata copied into generated content; site owners may override it later. */
declare interface CedrosExtensionSeoMetadata {
    title?: string;
    description?: string;
    canonicalPath?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    noindex?: boolean;
}

declare interface CedrosExtensionServerSurface {
    packageRef: 'server';
    required?: boolean;
    migrations?: string[];
    settingsSchemas?: string[];
    contentModels?: string[];
    routes?: string[];
    jobs?: string[];
    events?: string[];
}

declare interface CedrosExtensionServiceDependency extends CedrosExtensionDependencyRef {
    serviceId: string;
}

declare type CedrosExtensionSetupSeedDisablePolicy = 'leaveCreated' | 'disableIfUnmodified';

declare type CedrosExtensionSetupSeedInstallMode = 'createIfMissing' | 'referenceOnly';

declare interface CedrosExtensionSetupSeedLifecycleManifest {
    installMode?: CedrosExtensionSetupSeedInstallMode;
    updatePolicy?: CedrosExtensionSetupSeedUpdatePolicy;
    disablePolicy?: CedrosExtensionSetupSeedDisablePolicy;
}

declare interface CedrosExtensionSetupSeedsManifest {
    products?: CedrosExtensionProductSeedManifest[];
    notifications?: CedrosExtensionNotificationSeedManifest[];
}

declare type CedrosExtensionSetupSeedUpdatePolicy = 'preserveOperatorEdits' | 'replaceIfUnmodified';

declare interface CedrosExtensionSurfaceRegistration {
    entrypoint: string;
}

declare interface CedrosExtensionSurfaces {
    server: CedrosExtensionServerSurface;
    admin: CedrosExtensionAdminSurface;
    web: CedrosExtensionWebSurface;
    native: CedrosExtensionNativeSurface;
    ai?: CedrosExtensionAiSurface;
}

declare interface CedrosExtensionTemplateManifest {
    id: string;
    displayName: string;
    description?: string;
    order: number;
    contentTypes: Array<'page' | 'docs' | 'blog'>;
    surfaceId?: string;
}

declare interface CedrosExtensionTemplateUtilityManifest {
    id: string;
    displayName: string;
    description?: string;
    order?: number;
    templateIds: string[];
    contentTypes?: Array<'page' | 'docs' | 'blog'>;
    surfaceIds?: string[];
    suggestedBlockTypes?: string[];
}

declare interface CedrosExtensionWebSurface {
    packageRef: 'react';
    required?: boolean;
    routeIds?: string[];
    blockTypes?: string[];
    templateIds?: string[];
    authoredSurfaceIds?: string[];
    templateUtilityIds?: string[];
}

export declare const cedrosPayWebExtensionBootstrap: CedrosExtensionBootstrap;

declare type CedrosResolvedColorMode = 'light' | 'dark';

declare interface DashboardCardContribution {
    id: string;
    Component: ComponentType<DashboardCardContributionProps>;
    order?: number;
}

declare interface DashboardCardContributionProps {
    hostContext: AdminHostContext;
    pluginContext: PluginContext;
    extensionId: string;
    refreshInterval: number;
    isLoading: boolean;
    analyticsSnapshot: unknown;
    analyticsError?: string;
}

declare type HostContext = AdminHostContext;

declare interface PluginContext {
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

declare type PluginId = string;

declare function registerCedrosPayWebSurface(): CedrosExtensionBootstrap;
export default registerCedrosPayWebSurface;
export { registerCedrosPayWebSurface }

export declare function registerCedrosWebSurface(): CedrosExtensionBootstrap;

declare type SectionId = string;

export { }
