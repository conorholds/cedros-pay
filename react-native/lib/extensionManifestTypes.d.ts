export type CedrosExtensionCapabilityCategory = 'admin' | 'editor' | 'content' | 'runtime' | 'commerce';
export type CedrosExtensionAiVisibility = 'public' | 'authenticated' | 'admin';
export interface CedrosExtensionBlockRenderProps {
    block: {
        type: string;
        props?: Record<string, unknown>;
    };
    themeVariant?: string;
    onNavigate?: (route: string) => void;
    siteData?: unknown;
}
export interface CedrosExtensionBlockRenderer {
    type: string;
    render: (props: CedrosExtensionBlockRenderProps) => unknown;
}
/** Initial SEO metadata copied into generated content; site owners may override it later. */
export interface CedrosExtensionSeoMetadata {
    title?: string;
    description?: string;
    canonicalPath?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    noindex?: boolean;
}
export interface CedrosExtensionManifest {
    schemaVersion: 1;
    extensionId: string;
    displayName: string;
    version: string;
    description?: string;
    compatibility: {
        platformApiVersion: string;
        minCedrosDataVersion?: string;
        maxCedrosDataVersion?: string;
    };
    platformApiVersion: string;
    packageFamily: {
        server: {
            packageName: string;
            version: string;
            subpath?: string;
            required?: boolean;
        };
        react: {
            packageName: string;
            version: string;
            subpath?: string;
            required?: boolean;
        };
        reactNative: {
            packageName: string;
            version: string;
            subpath?: string;
            required?: boolean;
        };
    };
    jobSchedules?: Array<{
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
    }>;
    dependencies?: {
        services?: Array<{
            serviceId: string;
            required?: boolean;
            reason?: string;
        }>;
        capabilities?: Array<{
            capabilityId: string;
            required?: boolean;
            reason?: string;
        }>;
        extensions?: Array<{
            extensionId: string;
            minVersion?: string;
            maxVersion?: string;
            required?: boolean;
            reason?: string;
        }>;
    };
    surfaces: {
        server: {
            packageRef: 'server';
            required?: boolean;
            migrations?: string[];
            settingsSchemas?: string[];
            contentModels?: string[];
            routes?: string[];
            jobs?: string[];
            events?: string[];
        };
        admin: {
            packageRef: 'react';
            required?: boolean;
            moduleIds?: string[];
            slotIds?: string[];
            editorSurfaceIds?: string[];
        };
        web: {
            packageRef: 'react';
            required?: boolean;
            routeIds?: string[];
            blockTypes?: string[];
            templateIds?: string[];
            authoredSurfaceIds?: string[];
            templateUtilityIds?: string[];
        };
        native: {
            packageRef: 'reactNative';
            required?: boolean;
            screenIds?: string[];
            stackIds?: string[];
            providerIds?: string[];
        };
        ai?: {
            packageRef: 'server';
            skills?: Array<{
                id: string;
                name: string;
                description: string;
                category: string;
                tags?: string[];
                visibility: CedrosExtensionAiVisibility;
                docs: {
                    markdown: string;
                };
            }>;
            capabilities?: Array<{
                id: string;
                name: string;
                description: string;
                kind: 'tool' | 'action';
                tags?: string[];
                visibility: CedrosExtensionAiVisibility;
                endpoint: {
                    method: 'POST' | 'PUT' | 'PATCH';
                    path: string;
                };
                auth?: {
                    schemes?: Array<'bearer-token'>;
                };
                inputSchema: Record<string, unknown>;
                outputSchema?: Record<string, unknown>;
            }>;
        };
    };
    registration: {
        server: {
            entrypoint: string;
        };
        admin: {
            entrypoint: string;
        };
        web: {
            entrypoint: string;
        };
        native: {
            entrypoint: string;
        };
    };
    adminModules?: Array<{
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
            contentEditorPanels?: Array<{
                id: string;
                displayName?: string;
                description?: string;
                contentTypes?: Array<'page' | 'docs' | 'blog'>;
                order?: number;
            }>;
            dashboardCards?: Array<{
                id: string;
                displayName: string;
                description?: string;
                order?: number;
            }>;
            custom?: Record<string, unknown>;
        };
    }>;
    contentBlocks?: Array<{
        type: string;
        displayName: string;
        description?: string;
        category: string;
        order: number;
    }>;
    contentTemplates?: Array<{
        id: string;
        displayName: string;
        description?: string;
        order: number;
        contentTypes: Array<'page' | 'docs' | 'blog'>;
        surfaceId?: string;
    }>;
    authoredSurfaces?: Array<{
        id: string;
        displayName: string;
        description?: string;
        eyebrow?: string;
        templateIds?: string[];
    }>;
    authoredTemplateUtilities?: Array<{
        id: string;
        displayName: string;
        description?: string;
        order?: number;
        templateIds: string[];
        contentTypes?: Array<'page' | 'docs' | 'blog'>;
        surfaceIds?: string[];
        suggestedBlockTypes?: string[];
    }>;
    pageSeeds?: Array<{
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
    }>;
    formTemplates?: Array<{
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
        fields: Array<{
            key: string;
            label: string;
            type: 'text' | 'email' | 'textarea' | 'tel' | 'select' | 'checkbox';
            required?: boolean;
            placeholder?: string;
            helpText?: string;
            options?: Array<{
                label: string;
                value: string;
            }>;
        }>;
    }>;
    docsArticles?: Array<{
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
    }>;
    policies?: Array<{
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
    }>;
    capabilities?: Array<{
        id: string;
        displayName: string;
        description?: string;
        category: CedrosExtensionCapabilityCategory;
        active?: boolean;
        registered?: boolean;
        requestedScopes: Array<{
            verb: 'read' | 'write' | 'trigger' | 'send' | 'call' | 'expose' | 'invoke';
            resource: string;
            summary: string;
        }>;
    }>;
    analytics?: {
        events?: Array<{
            id: string;
            displayName: string;
            description: string;
            category: string;
            kind?: string;
            visibility: 'public' | 'authenticated' | 'admin';
        }>;
    };
    setupSeeds?: {
        products?: Array<{
            id: string;
            displayName: string;
            title: string;
            productType: 'standard' | 'service' | 'ticket' | 'eventSession' | 'campSession' | 'pass' | 'addon';
            description?: string;
            slug?: string;
            variants?: Array<{
                id: string;
                displayName: string;
                sku?: string;
                price?: {
                    amountCents: number;
                    currency: string;
                    billingInterval?: string;
                };
                attributes?: Record<string, string>;
            }>;
            tags?: string[];
            lifecycle?: {
                installMode?: 'createIfMissing' | 'referenceOnly';
                updatePolicy?: 'preserveOperatorEdits' | 'replaceIfUnmodified';
                disablePolicy?: 'leaveCreated' | 'disableIfUnmodified';
            };
        }>;
        notifications?: Array<{
            id: string;
            displayName: string;
            title: string;
            description?: string;
            eventId: string;
            audience: 'team' | 'personal';
            severity?: 'info' | 'warning' | 'error';
            defaultChannels?: Array<'email' | 'discord' | 'slack' | 'telegram'>;
            subjectTemplate?: string;
            bodyTemplate: string;
            tags?: string[];
        }>;
    };
    providerAccess?: Array<{
        id: string;
        provider: 'intelligence' | 'imageGeneration' | 'voice' | 'storage' | 'email' | 'blockchain';
        displayName: string;
        description: string;
        scopes: string[];
        tags?: string[];
    }>;
    databaseAccess?: Array<{
        id: string;
        displayName: string;
        description: string;
        contentModels?: string[];
        migrations?: string[];
        tags?: string[];
        scopes: Array<{
            verb: 'read' | 'count' | 'write' | 'delete' | 'migrate';
            resource: string;
            summary: string;
        }>;
    }>;
    customerTagAccess?: Array<{
        id: string;
        displayName: string;
        description: string;
        scopes: Array<'assign' | 'unassign' | 'read'>;
        managedTagSlugs: string[];
        tags?: string[];
    }>;
    crmSourceAccess?: Array<{
        id: string;
        sourceKind: string;
        displayName: string;
        description: string;
        scopes: Array<'write'>;
        eventTypes: string[];
        tags?: string[];
    }>;
    onboardingPages?: Array<{
        id: string;
        displayName: string;
        moduleId: string;
        sectionId: string;
        description?: string;
    }>;
    requiredServices?: string[];
    requiredCapabilities?: string[];
}
export interface CedrosExtensionBootstrap {
    manifest: CedrosExtensionManifest;
    modules?: unknown[];
    contentBlocks?: unknown[];
    contentTemplates?: unknown[];
    contentBlockRenderers?: CedrosExtensionBlockRenderer[];
}
//# sourceMappingURL=extensionManifestTypes.d.ts.map