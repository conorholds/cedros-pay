import { ComponentType } from 'react';
import { JSX as JSX_2 } from 'react/jsx-runtime';
import { ReactNode } from 'react';

export declare interface AdminGroupConfig {
    id: string;
    label: string;
    order?: number;
    defaultCollapsed?: boolean;
}

export declare interface AdminHostContext {
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

export declare interface AdminHostServiceBag {
    [serviceId: string]: unknown;
}

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

export declare interface AdminPlugin {
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

export declare interface AdminSectionConfig {
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

export declare interface AdminSectionProps {
    pluginContext: PluginContext;
}

export declare function AutosaveConflictDialog({ children, onDiscard, onReview, open, title, }: AutosaveConflictDialogProps): JSX_2.Element | null;

declare interface AutosaveConflictDialogProps {
    open: boolean;
    title?: string;
    children?: ReactNode;
    onReview: () => void;
    onDiscard: () => void;
}

export declare const autosaveFailureFixtures: {
    staleEtag: () => AutosaveProblemError;
    inProgress: () => AutosaveProblemError;
    invalidPatch: () => AutosaveProblemError;
    rateLimited: () => AutosaveProblemError;
    serverFailure: () => AutosaveProblemError;
};

export declare interface AutosavePersistedDraft<TResource = unknown> {
    resourceType: string;
    resourceId: string;
    extensionId?: string;
    draft: TResource;
    baseRevision?: number | string;
    etag?: string;
    updatedAt: string;
}

export declare interface AutosavePersistenceAdapter {
    load<TResource>(key: string): Promise<AutosavePersistedDraft<TResource> | null>;
    save<TResource>(key: string, draft: AutosavePersistedDraft<TResource>): Promise<void>;
    remove(key: string): Promise<void>;
}

export declare interface AutosaveProblemError extends Error {
    status: number;
    problem: {
        type: string;
        title: string;
        status: number;
        detail: string;
    };
}

export declare interface AutosaveResourceDefinition<TPatch = unknown> {
    extensionId: string;
    resourceType: string;
    deriveResourceId: (resource: unknown) => string;
    patchSchema: unknown;
    allowedAutosaveFields: string[];
    blockedFields: string[];
    debounceProfile: CedrosAutosaveDebounceProfile;
    optimisticUi: boolean;
    conflictStrategy: CedrosAutosaveConflictStrategy;
    validatePatch: (patch: TPatch) => CedrosAutosavePatchValidation;
    authzRequirements: string[];
    dataSensitivity: 'low' | 'moderate' | 'high' | 'restricted';
    payloadSizeExpectation: string;
    localPersistence: boolean;
    telemetryLabels: Record<string, string>;
    migrationNotes: string;
}

export declare function AutosaveRetryBanner({ error, onRetry, status, }: AutosaveRetryBannerProps): JSX_2.Element | null;

declare interface AutosaveRetryBannerProps {
    status: CedrosAutosaveState;
    error?: unknown;
    onRetry: () => void;
}

export declare function AutosaveStatusIndicator({ className, status, }: AutosaveStatusIndicatorProps): JSX_2.Element | null;

export declare interface AutosaveStatusIndicatorProps {
    status: CedrosAutosaveState;
    className?: string;
    lastSavedAt?: string | null;
    error?: unknown;
}

export declare function autosaveStatusLabel(status: CedrosAutosaveState): string;

/** Group metadata owned by Cedros Pay. Host-owned Settings group defaults are not redefined here. */
export declare const CEDROS_PAY_GROUPS: readonly [{
    readonly id: "Monetization";
    readonly label: "Monetization";
    readonly order: 1;
    readonly defaultCollapsed: false;
}, {
    readonly id: "Extension Settings";
    readonly label: "Extension Settings";
    readonly order: 8;
    readonly defaultCollapsed: false;
}];

/** All qualified sidebar section IDs as a flat array — useful for allowlist generation */
export declare const CEDROS_PAY_SECTION_IDS: string[];

/**
 * Cedros Pay admin sidebar sections — what the AdminShell renders.
 *
 * Source of truth — kept in sync with `cedrosPayPlugin.sections` in plugin.tsx.
 */
export declare const CEDROS_PAY_SECTIONS: readonly SectionReference[];

/**
 * Tab-level subsections living inside the umbrella sections.
 * Retained for endpoint documentation and to keep stable identifiers
 * for backend telemetry, even though the host sidebar only renders the
 * umbrella parents.
 */
export declare const CEDROS_PAY_SUBSECTIONS: readonly SubsectionReference[];

export declare type CedrosAutosaveConflictStrategy = 'reject' | 'fieldMerge' | 'lastWriterWinsApproved' | 'customReview' | 'field-level-merge' | 'last-writer-wins-approved' | 'custom-review';

export declare interface CedrosAutosaveController<TResource = unknown> {
    status: CedrosAutosaveState;
    retryCount: number;
    isDirty: boolean;
    lastSavedAt: string | null;
    lastError: unknown;
    restoredDraft: TResource | null;
    flush: () => Promise<void>;
    retry: () => Promise<void>;
    discard: () => Promise<void>;
}

export declare type CedrosAutosaveDebounceProfile = 'text' | 'longDraft' | 'selectToggle' | 'background' | 'control' | 'none';

export declare interface CedrosAutosaveDebounceProfiles {
    text: number;
    longDraft: number;
    selectToggle: number;
    background: number;
    control: number;
    none: number;
}

export declare interface CedrosAutosaveOptions<TPatch, TResource> {
    resourceType: string;
    resourceId: string;
    extensionId?: string;
    baseRevision?: number | string;
    etag?: string;
    draft: TResource;
    makePatch: (previous: TResource, current: TResource) => TPatch | null | undefined;
    validatePatch?: (patch: TPatch) => void | string | CedrosAutosavePatchValidation | Promise<void | string | CedrosAutosavePatchValidation>;
    save: (patch: TPatch, metadata: CedrosAutosaveSaveMetadata) => Promise<CedrosAutosaveSaveResult<TResource>>;
    debounceProfile?: CedrosAutosaveDebounceProfile | number;
    conflictStrategy?: CedrosAutosaveConflictStrategy;
    persistenceKey?: string;
    enabled?: boolean;
    blockedFields?: string[];
    getUpdateMask?: (patch: TPatch) => string[];
    isRetryableError?: (error: unknown) => boolean;
    maxRetries?: number;
    retryDelayMs?: number;
    onSaved?: (result: CedrosAutosaveSaveResult<TResource>, draft: TResource) => void;
    onConflict?: (error: unknown, draft: TResource) => void;
    onPermanentFailure?: (error: unknown, draft: TResource) => void;
    onRestore?: (draft: TResource) => void;
    onStatusChange?: (status: CedrosAutosaveState) => void;
    flushOnBlur?: boolean;
    flushOnPageLifecycle?: boolean;
    warnOnUnload?: boolean;
}

export declare type CedrosAutosavePatchValidation = {
    ok: true;
} | {
    ok: false;
    message: string;
} | CedrosAutosaveValidationResult;

export declare function CedrosAutosaveProvider({ children, debounceProfiles, editingSessionId, persistence, telemetry, }: {
    children: ReactNode;
    debounceProfiles?: Partial<CedrosAutosaveDebounceProfiles>;
    editingSessionId?: string;
    persistence?: AutosavePersistenceAdapter;
    telemetry?: CedrosAutosaveTelemetryHook;
}): JSX_2.Element;

export declare interface CedrosAutosaveProviderValue {
    debounceProfiles: CedrosAutosaveDebounceProfiles;
    editingSessionId: string;
    persistence?: AutosavePersistenceAdapter;
    telemetry?: CedrosAutosaveTelemetryHook;
    createId: () => string;
}

export declare interface CedrosAutosaveSaveMetadata {
    autosave: true;
    resourceType: string;
    resourceId: string;
    extensionId?: string;
    baseRevision?: number | string;
    etag?: string;
    clientMutationId: string;
    editingSessionId: string;
    clientSeq: number;
    updateMask: string[];
    idempotencyKey: string;
    signal: AbortSignal;
}

export declare interface CedrosAutosaveSaveResult<TResource = unknown> {
    resourceId?: string;
    revision?: number | string;
    etag?: string;
    savedAt?: string;
    canonicalPatchOrResource?: TResource;
    warnings?: string[];
    traceId?: string;
}

export declare type CedrosAutosaveState = 'idle' | 'dirty' | 'debouncing' | 'queued' | 'saving' | 'saved' | 'retrying' | 'offline' | 'conflict' | 'failed';

export declare interface CedrosAutosaveTelemetryEvent {
    event: 'autosave_dirty' | 'autosave_queued' | 'autosave_started' | 'autosave_succeeded' | 'autosave_failed' | 'autosave_retrying' | 'autosave_conflict' | 'autosave_offline_paused' | 'autosave_resumed' | 'autosave_discarded' | 'autosave_local_restore' | 'autosave_manual_flush';
    resourceType: string;
    resourceId: string;
    extensionId?: string;
    status: CedrosAutosaveState;
    durationMs?: number;
    retryCount: number;
    conflictType?: string;
    payloadSizeBucket?: string;
    queueDepth: number;
    networkState: 'online' | 'offline' | 'unknown';
    requestId?: string;
    traceId?: string;
}

export declare type CedrosAutosaveTelemetryHook = (event: CedrosAutosaveTelemetryEvent) => void;

export declare interface CedrosAutosaveValidationResult {
    valid: boolean;
    reason?: string;
}

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

declare interface CedrosExtensionDashboardCardManifest {
    id: string;
    displayName: string;
    description?: string;
    order?: number;
}

/**
 * Cedros Pay admin plugin definition.
 *
 * Registers cedros-pay admin sidebar sections for use in the unified AdminShell.
 * Closely related sub-workflows (products/inventory/subscriptions/coupons,
 * transactions/orders/refunds/returns/disputes and payment options)
 * are exposed as tabs inside their umbrella section rather than as separate sidebar pages.
 */
export declare const cedrosPayPlugin: AdminPlugin;

export declare function createAutosaveId(): string;

export declare function createAutosaveProblemError(status: number, detail: string, title?: string): AutosaveProblemError;

export declare function createAutosaveSaveResult<TResource = unknown>(overrides?: Partial<CedrosAutosaveSaveResult<TResource>>): CedrosAutosaveSaveResult<TResource>;

export declare function createCedrosAutosavePersistence(namespace?: string): AutosavePersistenceAdapter;

export declare function createIndexedDbAutosavePersistence(namespace?: string): AutosavePersistenceAdapter;

export declare function createLocalStorageAutosavePersistence(namespace?: string): AutosavePersistenceAdapter;

export declare function createMemoryAutosavePersistence(namespace?: string): AutosavePersistenceAdapter;

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

export declare const DEFAULT_AUTOSAVE_DEBOUNCE_PROFILES: CedrosAutosaveDebounceProfiles;

export declare type HostContext = AdminHostContext;

export declare interface PluginContext {
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

export declare type PluginId = string;

export declare type PluginPermission = string;

export declare interface PluginRegistry {
    plugins: AdminPlugin[];
}

export declare type QualifiedSectionId = `${string}:${string}`;

export declare type SectionId = string;

/** Section metadata for integrator reference */
export declare interface SectionReference {
    /** Unqualified ID (e.g. 'catalog') */
    id: string;
    /** Qualified ID with plugin prefix (e.g. 'cedros-pay:catalog') */
    qualifiedId: string;
    /** Human-readable label */
    label: string;
    /** Official Cedros AdminShell sidebar group merge key */
    group: 'Monetization' | 'Extension Settings';
    /** Sort order within the group */
    order: number;
    /**
     * Tabs rendered inside this section when it is a tabbed umbrella.
     * Empty array for sections that render a single workflow directly.
     */
    tabs: readonly SectionTabReference[];
}

/**
 * Exported section ID reference for integrators.
 *
 * Use CEDROS_PAY_SECTIONS for build-time allowlists, deep-link routing,
 * and integration tests — avoids grepping minified bundles.
 *
 * Sidebar shape follows Cedros AdminShell ownership: commerce operations live
 * under Monetization, while Pay-owned setup, credentials, and content payment
 * controls live under Extension Settings.
 */
/** Tab metadata embedded on umbrella SectionReferences */
export declare interface SectionTabReference {
    /** Unqualified tab ID (e.g. 'products') */
    id: string;
    /** Qualified tab ID (e.g. 'cedros-pay:products') */
    qualifiedId: string;
    /** Human-readable label rendered on the tab control */
    label: string;
}

/** Tab-level subsection metadata (rendered inside an umbrella SectionReference) */
export declare interface SubsectionReference {
    /** Unqualified tab ID (e.g. 'products') */
    id: string;
    /** Qualified ID with plugin prefix (e.g. 'cedros-pay:products') */
    qualifiedId: string;
    /** Human-readable label */
    label: string;
    /** Parent umbrella section's unqualified ID */
    parentId: string;
    /** Primary backend endpoints used by this subsection */
    endpoints: string[];
}

export declare function useCedrosAutosave<TPatch, TResource>(options: CedrosAutosaveOptions<TPatch, TResource>): CedrosAutosaveController<TResource>;

export { }
