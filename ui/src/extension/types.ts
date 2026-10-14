import type { AdminPlugin } from '../admin/types';
import type { AdminModuleManifest } from './adminModuleManifest';
import type { CedrosExtensionProductSeedManifest } from './setupSeedTypes';

export type {
  CedrosExtensionPriceManifest,
  CedrosExtensionProductSeedManifest,
  CedrosExtensionProductSeedType,
  CedrosExtensionProductVariantSeedManifest,
  CedrosExtensionSetupSeedDisablePolicy,
  CedrosExtensionSetupSeedInstallMode,
  CedrosExtensionSetupSeedLifecycleManifest,
  CedrosExtensionSetupSeedUpdatePolicy,
} from './setupSeedTypes';

export const CEDROS_EXTENSION_PLATFORM_API_VERSION = '1';
export const CEDROS_EXTENSION_ADMIN_REGISTRATION_SUBPATH = '/admin/register';
export const CEDROS_EXTENSION_WEB_REGISTRATION_SUBPATH = '/web/register';
export const CEDROS_EXTENSION_NATIVE_REGISTRATION_SUBPATH = '/register';

export type CedrosExtensionPackageRef = 'server' | 'react' | 'reactNative';

export interface CedrosExtensionPackageSurface {
  packageName: string;
  version: string;
  subpath?: string;
  required?: boolean;
}

export interface CedrosExtensionPackageFamily {
  server: CedrosExtensionPackageSurface;
  react: CedrosExtensionPackageSurface;
  reactNative: CedrosExtensionPackageSurface;
}

export interface CedrosExtensionDependencyRef {
  required?: boolean;
  reason?: string;
}

export interface CedrosExtensionServiceDependency extends CedrosExtensionDependencyRef {
  serviceId: string;
}

export interface CedrosExtensionCapabilityDependency extends CedrosExtensionDependencyRef {
  capabilityId: string;
}

export interface CedrosExtensionFamilyDependency extends CedrosExtensionDependencyRef {
  extensionId: string;
  minVersion?: string;
  maxVersion?: string;
}

export interface CedrosExtensionDependencies {
  services?: CedrosExtensionServiceDependency[];
  capabilities?: CedrosExtensionCapabilityDependency[];
  extensions?: CedrosExtensionFamilyDependency[];
}

export interface CedrosExtensionCompatibility {
  platformApiVersion: string;
  minCedrosDataVersion?: string;
  maxCedrosDataVersion?: string;
  witChecksum?: string;
}

export interface CedrosExtensionServerSurface {
  packageRef: 'server';
  required?: boolean;
  migrations?: string[];
  settingsSchemas?: string[];
  contentModels?: string[];
  routes?: string[];
  jobs?: string[];
  events?: string[];
}

export interface CedrosExtensionAdminSurface {
  packageRef: 'react';
  required?: boolean;
  moduleIds?: string[];
  slotIds?: string[];
  editorSurfaceIds?: string[];
}

export interface CedrosExtensionWebSurface {
  packageRef: 'react';
  required?: boolean;
  routeIds?: string[];
  blockTypes?: string[];
  templateIds?: string[];
  authoredSurfaceIds?: string[];
  templateUtilityIds?: string[];
}

export interface CedrosExtensionNativeSurface {
  packageRef: 'reactNative';
  required?: boolean;
  screenIds?: string[];
  stackIds?: string[];
  providerIds?: string[];
}

export type CedrosExtensionAiVisibility = 'public' | 'authenticated' | 'admin';

export interface CedrosExtensionAiSkillDocs {
  markdown: string;
}

export interface CedrosExtensionAiSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
  visibility: CedrosExtensionAiVisibility;
  docs: CedrosExtensionAiSkillDocs;
}

export interface CedrosExtensionAiCapabilityAuth {
  schemes?: Array<'bearer-token'>;
}

export interface CedrosExtensionAiCapabilityEndpoint {
  method: 'POST' | 'PUT' | 'PATCH';
  path: string;
}

export interface CedrosExtensionAiCapability {
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

export interface CedrosExtensionAiSurface {
  packageRef: 'server';
  skills?: CedrosExtensionAiSkill[];
  capabilities?: CedrosExtensionAiCapability[];
}

export interface CedrosExtensionSurfaces {
  server: CedrosExtensionServerSurface;
  admin: CedrosExtensionAdminSurface;
  web: CedrosExtensionWebSurface;
  native: CedrosExtensionNativeSurface;
  ai?: CedrosExtensionAiSurface;
}

export interface CedrosExtensionSurfaceRegistration {
  entrypoint: string;
}

export interface CedrosExtensionRegistration {
  server: CedrosExtensionSurfaceRegistration;
  admin: CedrosExtensionSurfaceRegistration;
  web: CedrosExtensionSurfaceRegistration;
  native: CedrosExtensionSurfaceRegistration;
}

export type CedrosExtensionCapabilityCategory =
  | 'admin'
  | 'editor'
  | 'content'
  | 'runtime'
  | 'commerce';

export type CedrosExtensionCapabilityScopeVerb =
  | 'read'
  | 'write'
  | 'trigger'
  | 'send'
  | 'call'
  | 'expose';

export interface CedrosExtensionCapabilityScope {
  verb: CedrosExtensionCapabilityScopeVerb;
  resource: string;
  summary: string;
}

export interface CedrosExtensionCapability {
  id: string;
  displayName: string;
  description?: string;
  category: CedrosExtensionCapabilityCategory;
  requestedScopes: CedrosExtensionCapabilityScope[];
}

export interface CedrosExtensionBlockManifest {
  type: string;
  displayName: string;
  description?: string;
  category: string;
  order: number;
}

export interface CedrosExtensionTemplateManifest {
  id: string;
  displayName: string;
  description?: string;
  order: number;
  contentTypes: Array<'page' | 'docs' | 'blog'>;
  surfaceId?: string;
}

export interface CedrosExtensionAuthoredSurfaceManifest {
  id: string;
  displayName: string;
  description?: string;
  eyebrow?: string;
  templateIds?: string[];
}

export interface CedrosExtensionTemplateUtilityManifest {
  id: string;
  displayName: string;
  description?: string;
  order?: number;
  templateIds: string[];
  contentTypes?: Array<'page' | 'docs' | 'blog'>;
  surfaceIds?: string[];
  suggestedBlockTypes?: string[];
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

export interface CedrosExtensionPageSeedManifest {
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

export interface CedrosExtensionFormFieldOption {
  label: string;
  value: string;
}

export interface CedrosExtensionFormFieldManifest {
  key: string;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'tel' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: CedrosExtensionFormFieldOption[];
}

export interface CedrosExtensionFormTemplateManifest {
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
  autoCreateOnEnable?: boolean;
  fields: CedrosExtensionFormFieldManifest[];
}

export interface CedrosExtensionDocsArticleManifest {
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

export interface CedrosExtensionPolicyManifest {
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

export type {
  AdminModuleManifest,
  CedrosExtensionAdminPanelContribution,
  CedrosExtensionDashboardCardManifest,
} from './adminModuleManifest';

export interface CedrosExtensionAnalyticsEventManifest {
  id: string;
  displayName: string;
  description: string;
  category: string;
  kind?: string;
  visibility: 'public' | 'authenticated' | 'admin';
}

export interface CedrosExtensionAnalyticsManifest {
  events?: CedrosExtensionAnalyticsEventManifest[];
}

export type CedrosExtensionNotificationChannelKind =
  | 'email'
  | 'discord'
  | 'slack'
  | 'telegram';

export type CedrosExtensionNotificationAudience = 'team' | 'personal';
export type CedrosExtensionNotificationSeverity = 'info' | 'warning' | 'error';

export interface CedrosExtensionNotificationSeedManifest {
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

export interface CedrosExtensionSetupSeedsManifest {
  products?: CedrosExtensionProductSeedManifest[];
  notifications?: CedrosExtensionNotificationSeedManifest[];
}

export type CedrosExtensionProviderKind =
  | 'intelligence'
  | 'imageGeneration'
  | 'voice'
  | 'storage'
  | 'email'
  | 'blockchain';

export interface CedrosExtensionProviderAccessManifest {
  id: string;
  provider: CedrosExtensionProviderKind;
  displayName: string;
  description: string;
  scopes: string[];
  tags?: string[];
}

export interface CedrosExtensionDatabaseAccessScope {
  verb: 'read' | 'count' | 'write' | 'delete' | 'migrate';
  resource: string;
  summary: string;
}

export interface CedrosExtensionDatabaseAccessManifest {
  id: string;
  displayName: string;
  description: string;
  contentModels?: string[];
  migrations?: string[];
  tags?: string[];
  scopes: CedrosExtensionDatabaseAccessScope[];
}

export interface CedrosExtensionCustomerTagAccessManifest {
  id: string;
  displayName: string;
  description: string;
  scopes: Array<'assign' | 'unassign' | 'read'>;
  managedTagSlugs: string[];
  tags?: string[];
}

export interface CedrosExtensionCrmSourceAccessManifest {
  id: string;
  sourceKind: string;
  displayName: string;
  description: string;
  scopes: Array<'write'>;
  eventTypes: string[];
  tags?: string[];
}

export interface CedrosExtensionOnboardingPageManifest {
  id: string;
  displayName: string;
  moduleId: string;
  sectionId: string;
  description?: string;
}

export interface CedrosExtensionJobScheduleManifest {
  id: string; jobId: string; label: string;
  cron: string;
  enabled?: boolean; timeoutSeconds?: number; maxRetries?: 0;
  autoCreateOnEnable?: boolean;
}

export type CedrosResolvedColorMode = 'light' | 'dark';

export interface CedrosExtensionBlockRenderProps {
  block: { type: string; props?: Record<string, unknown> };
  /** Host-resolved color mode. Undefined during SSR and on older hosts. */
  colorMode?: CedrosResolvedColorMode;
  themeVariant?: string;
  onNavigate?: (route: string) => void;
  siteData?: unknown;
}

export interface CedrosExtensionBlockRenderer {
  type: string;
  render: (props: CedrosExtensionBlockRenderProps) => unknown;
}

export interface CedrosExtensionManifest {
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

export type AdminModule = AdminPlugin;
export type CedrosDocumentBlockDefinition = Record<string, unknown>;
export type CedrosDocumentTemplateDefinition = Record<string, unknown>;

export interface CedrosExtensionBootstrap {
  manifest: CedrosExtensionManifest;
  modules?: AdminModule[];
  contentBlocks?: CedrosDocumentBlockDefinition[];
  contentTemplates?: CedrosDocumentTemplateDefinition[];
  contentBlockRenderers?: CedrosExtensionBlockRenderer[];
}
