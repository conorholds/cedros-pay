#!/usr/bin/env node
import './validate-ai-surface.mjs';
import './validate-conditional-mutations.mjs';
import './validate-manifest-schema.mjs';
import './validate-observability.mjs';
import './validate-release-readiness.mjs';
import './validate-route-honesty.mjs';
import {
  assert,
  assertDeepEqual,
  assertEqual,
  assertNamespacedIds,
  assertSeoMetadata,
  assertStarterContent,
  parseCargoValue,
  readJson,
  readText,
} from './lib/validation-helpers.mjs';
import {
  assertAutomationSchedules,
  assertHandoffRows,
} from './lib/extension-handoff-validation.mjs';
import { assertAnalyticsEvents } from './lib/analytics-validation.mjs';
import { assertManifestWitChecksum } from './lib/wit-compatibility-validation.mjs';
import { assertSurfaceRequirements } from './lib/extension-surface-validation.mjs';
import { CEDROS_PAY_EXTENSION_VERSION } from '../ui/src/extension/constants.ts';

function assertHasExport(packageJson, exportPath, label) {
  assert(packageJson.exports?.[exportPath], `${label} package is missing ${exportPath} export`);
}

function assertNamespaced(ids, extensionId, label) {
  assertNamespacedIds(ids, extensionId, label);
}

function collectServerIds(serverSurface) {
  return {
    contentModels: new Set(serverSurface.contentModels ?? []),
    migrations: new Set(serverSurface.migrations ?? []),
  };
}

const hostAdminIconNames = new Set([
  'account', 'analytics', 'archive', 'assistant', 'backups', 'brain', 'collections',
  'communications', 'contractVerify', 'customers', 'customData', 'dashboard',
  'dataOps', 'docs', 'email', 'emailCampaigns', 'emailInbox', 'emailLists',
  'emailTemplates', 'extensions', 'faq', 'heatmap', 'help', 'history', 'layout',
  'media', 'memory', 'mobile', 'monetization', 'navigation', 'pages', 'policies',
  'posts', 'products', 'providers', 'redirects', 'scheduledJobs', 'schemaDesigner',
  'security', 'siteHealth', 'siteSettings', 'storefront', 'subscriptions', 'team',
]);

function isSupportedAdminIconName(iconName) {
  if (hostAdminIconNames.has(iconName)) return true;
  return /^(?:lucide:)?[A-Za-z][A-Za-z0-9_-]*$/.test(iconName);
}

function assertDatabaseAccess(manifest) {
  const serverIds = collectServerIds(manifest.surfaces.server);
  const allowedVerbs = new Set(['read', 'count', 'write', 'delete', 'migrate']);
  for (const access of manifest.databaseAccess ?? []) {
    assertNamespaced([access.id], manifest.extensionId, 'databaseAccess');
    assert(access.displayName, `${access.id} is missing displayName`);
    assert(access.description, `${access.id} is missing description`);
    assert((access.scopes ?? []).length > 0, `${access.id} must declare database scopes`);
    for (const scope of access.scopes ?? []) {
      assert(allowedVerbs.has(scope.verb), `${access.id} has unsupported database verb ${scope.verb}`);
      assert(scope.resource && scope.summary, `${access.id} database scope is incomplete`);
    }

    for (const modelId of access.contentModels ?? []) {
      assert(serverIds.contentModels.has(modelId), `${access.id} references unknown content model ${modelId}`);
    }
    for (const migrationId of access.migrations ?? []) {
      assert(serverIds.migrations.has(migrationId), `${access.id} references unknown migration ${migrationId}`);
    }
  }
}

function assertCustomerTagAccess(manifest) {
  const allowedScopes = new Set(['assign', 'unassign', 'read']);
  for (const access of manifest.customerTagAccess ?? []) {
    assertNamespaced([access.id], manifest.extensionId, 'customerTagAccess');
    assert(access.displayName && access.description, `${access.id} customer tag access is incomplete`);
    assert((access.managedTagSlugs ?? []).length > 0, `${access.id} needs managedTagSlugs`);
    for (const scope of access.scopes ?? []) {
      assert(allowedScopes.has(scope), `${access.id} has unsupported customer tag scope ${scope}`);
    }
    for (const slug of access.managedTagSlugs ?? []) {
      assertNamespaced([slug], manifest.extensionId, 'managed customer tag slug');
    }
  }
}

function assertProviderAccess(manifest) {
  const providerScopes = new Map();
  for (const access of manifest.providerAccess ?? []) {
    assertNamespaced([access.id], manifest.extensionId, 'providerAccess');
    assert(access.displayName, `${access.id} is missing displayName`);
    assert(access.description, `${access.id} is missing description`);
    assert((access.scopes ?? []).length > 0, `${access.id} must declare provider scopes`);
    providerScopes.set(access.id, new Set(access.scopes ?? []));
  }
  assert(
    providerScopes.get('cedros-pay:blockchain-config')?.has('blockchain.config.read'),
    'cedros-pay:blockchain-config must declare blockchain.config.read',
  );
  assert(
    providerScopes.get('cedros-pay:blockchain-x402-sign')?.has('blockchain.solana.sign.x402'),
    'cedros-pay:blockchain-x402-sign must declare blockchain.solana.sign.x402',
  );
  assert(
    providerScopes
      .get('cedros-pay:blockchain-x402-refund')
      ?.has('blockchain.solana.refund.x402'),
    'cedros-pay:blockchain-x402-refund must declare blockchain.solana.refund.x402',
  );
  assert(
    providerScopes
      .get('cedros-pay:blockchain-assistant-x402-sign')
      ?.has('blockchain.solana.sign.assistant-x402'),
    'cedros-pay:blockchain-assistant-x402-sign must declare blockchain.solana.sign.assistant-x402',
  );
}

function assertCrmSourceAccess(manifest) {
  const requiredEvents = [
    'purchase.completed',
    'subscription.created',
    'subscription.renewed',
    'subscription.canceled',
    'credit.purchase',
    'refund.settled',
    'payment.failed',
    'payment.reversed',
    'chargeback.opened',
    'dispute.opened',
    'dispute.updated',
    'dispute.closed',
  ];
  const access = (manifest.crmSourceAccess ?? []).find((entry) => entry.id === 'cedros-pay:crm-source-events');
  assert(access, 'crmSourceAccess is missing cedros-pay:crm-source-events');
  assertEqual(access.sourceKind, 'cedros_pay', 'crm source kind');
  assert((access.scopes ?? []).includes('write'), `${access.id} must include write scope`);
  assertEqual(
    access.description,
    'Attach Cedros Pay purchase, subscription, refund, failure, dispute, chargeback, and reversal activity to Data CRM profiles.',
    'crm source description',
  );
  assertDeepEqual(access.tags, ['commerce', 'crm'], 'crm source tags', 'crm source tags mismatch');
  assertDeepEqual(access.eventTypes, requiredEvents, 'crm source event types', 'crm source event types mismatch');
}

function assertProductContracts(manifest) {
  const capabilityIds = new Set((manifest.capabilities ?? []).map((capability) => capability.id));
  assert(
    capabilityIds.has('cedros-pay:product-rag-records'),
    'manifest capabilities missing cedros-pay:product-rag-records',
  );
  assert(capabilityIds.has('cedros-pay:product-read'), 'manifest capabilities missing cedros-pay:product-read');
  assert(capabilityIds.has('cedros-pay:product-create'), 'manifest capabilities missing cedros-pay:product-create');
  const routeIds = new Set(manifest.surfaces.server.routes ?? []);
  assert(routeIds.has('cedros-pay:product-rag-records'), 'manifest server routes missing cedros-pay:product-rag-records');
  assert(routeIds.has('cedros-pay:product-read'), 'manifest server routes missing cedros-pay:product-read');
  assert(routeIds.has('cedros-pay:product-create'), 'manifest server routes missing cedros-pay:product-create');
  assert(
    routeIds.has('cedros-pay:subscription-entitlements'),
    'manifest server routes missing cedros-pay:subscription-entitlements',
  );
}

function normalizeRoutePath(routePath) {
  return routePath.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function assertPageSeeds(manifest) {
  const routeIds = new Set(manifest.surfaces.web.routeIds ?? []);
  const routePaths = new Set();
  const extensionTemplateIds = new Set((manifest.contentTemplates ?? []).map((template) => template.id));

  for (const seed of manifest.pageSeeds ?? []) {
    assertNamespaced([seed.id], manifest.extensionId, 'page seed');
    assert(routeIds.has(seed.id), `surfaces.web.routeIds is missing page seed ${seed.id}`);
    assert(seed.displayName, `${seed.id} is missing displayName`);
    assert(seed.title, `${seed.id} is missing title`);
    assert(seed.routePath?.startsWith('/'), `${seed.id} routePath must be absolute`);

    const normalizedPath = normalizeRoutePath(seed.routePath);
    assert(!routePaths.has(normalizedPath), `${seed.id} duplicates normalized route path ${normalizedPath}`);
    routePaths.add(normalizedPath);

    if (seed.templateId && seed.templateId !== 'page-default') {
      assert(extensionTemplateIds.has(seed.templateId), `${seed.id} references unknown template ${seed.templateId}`);
    }
    assertSeoMetadata(seed.seo, seed.id);
  }
}

function assertVisualBuilder(manifest) {
  const blockTypes = new Set(manifest.surfaces.web.blockTypes ?? []);
  const templateIds = new Set(manifest.surfaces.web.templateIds ?? []);
  const surfaceIds = new Set(manifest.surfaces.web.authoredSurfaceIds ?? []);
  const declaredSurfaces = new Set((manifest.authoredSurfaces ?? []).map((surface) => surface.id));

  for (const block of manifest.contentBlocks ?? []) {
    assertNamespaced([block.type], manifest.extensionId, 'content block');
    assert(blockTypes.has(block.type), `surfaces.web.blockTypes is missing content block ${block.type}`);
    assert(block.displayName, `${block.type} is missing displayName`);
    assert(block.category, `${block.type} is missing category`);
    assert(Number.isInteger(block.order), `${block.type} order must be an integer`);
  }

  for (const template of manifest.contentTemplates ?? []) {
    assertNamespaced([template.id], manifest.extensionId, 'content template');
    assert(templateIds.has(template.id), `surfaces.web.templateIds is missing content template ${template.id}`);
    assert(template.displayName, `${template.id} is missing displayName`);
    assert(Number.isInteger(template.order), `${template.id} order must be an integer`);
    assert((template.contentTypes ?? []).includes('page'), `${template.id} must support page content`);
    if (template.surfaceId) {
      assert(surfaceIds.has(template.surfaceId), `${template.id} references undeclared web authored surface ${template.surfaceId}`);
      assert(declaredSurfaces.has(template.surfaceId), `${template.id} references missing authored surface ${template.surfaceId}`);
    }
  }

  for (const surface of manifest.authoredSurfaces ?? []) {
    assertNamespaced([surface.id], manifest.extensionId, 'authored surface');
    assert(surfaceIds.has(surface.id), `surfaces.web.authoredSurfaceIds is missing authored surface ${surface.id}`);
    for (const templateId of surface.templateIds ?? []) {
      assert(templateIds.has(templateId), `${surface.id} references undeclared template ${templateId}`);
    }
  }
}

function assertSetupSeeds(manifest) {
  const serverEvents = new Set(manifest.surfaces.server.events ?? []);
  const productIds = new Set();
  const notificationIds = new Set();
  const productTypes = new Set(['standard', 'service', 'ticket', 'eventSession', 'campSession', 'pass', 'addon']);
  const channels = new Set(['email', 'discord', 'slack', 'telegram']);
  const unsafeTemplate = /\{\{\s*(email|user|session|token|password|ip|wallet|auth|provider|processor|stripe|card|customer|paymentIntent)/i;
  const unsafeProductText = /wallet address|stripe customer|payment intent|buyer|purchase history|customer id/i;
  for (const seed of manifest.setupSeeds?.products ?? []) {
    assertNamespaced([seed.id], manifest.extensionId, 'product seed');
    assert(!productIds.has(seed.id), `duplicate product seed ${seed.id}`);
    for (const field of ['displayName', 'title', 'productType']) {
      assert(seed[field], `${seed.id} product seed is missing ${field}`);
    }
    assert(productTypes.has(seed.productType), `${seed.id} productType is invalid`);
    assert(!unsafeProductText.test(JSON.stringify(seed)), `${seed.id} product seed references unsafe context`);
    for (const variant of seed.variants ?? []) {
      assert(variant.id && variant.displayName, `${seed.id} product variant is missing id/displayName`);
      if (variant.price) {
        assert(Number.isInteger(variant.price.amountCents) && variant.price.amountCents > 0, `${seed.id} variant price must be positive cents`);
        assert(/^[A-Z]{3}$/.test(variant.price.currency), `${seed.id} variant currency must be ISO uppercase`);
      }
    }
    productIds.add(seed.id);
  }
  for (const seed of manifest.setupSeeds?.notifications ?? []) {
    assertNamespaced([seed.id], manifest.extensionId, 'notification seed');
    assert(!notificationIds.has(seed.id), `duplicate notification seed ${seed.id}`);
    for (const field of ['displayName', 'title', 'eventId', 'audience', 'bodyTemplate']) {
      assert(seed[field], `${seed.id} notification seed is missing ${field}`);
    }
    assert(serverEvents.has(seed.eventId), `${seed.id} references undeclared server event ${seed.eventId}`);
    assert(['team', 'personal'].includes(seed.audience), `${seed.id} audience is invalid`);
    if (seed.severity) assert(['info', 'warning', 'error'].includes(seed.severity), `${seed.id} severity is invalid`);
    for (const channel of seed.defaultChannels ?? []) assert(channels.has(channel), `${seed.id} channel ${channel} is invalid`);
    assert(!unsafeTemplate.test(`${seed.subjectTemplate ?? ''} ${seed.bodyTemplate}`), `${seed.id} notification template references unsafe context`);
    notificationIds.add(seed.id);
  }
}

function assertAdminModules(manifest) {
  const declaredModules = new Set(manifest.surfaces.admin.moduleIds ?? []);
  const moduleIds = new Set((manifest.adminModules ?? []).map((module) => module.moduleId));
  for (const moduleId of declaredModules) {
    assert(moduleIds.has(moduleId), `surfaces.admin.moduleIds references missing adminModule ${moduleId}`);
  }
  for (const module of manifest.adminModules ?? []) {
    assertEqual(module.extensionId, manifest.extensionId, `${module.moduleId} extensionId`);
    assertEqual(module.version, manifest.version, `${module.moduleId} version`);
    assertEqual(module.packageName, manifest.packageFamily.react.packageName, `${module.moduleId} packageName`);
    assertNamespaced([module.moduleId, ...(module.sectionIds ?? [])], manifest.extensionId, 'admin module');
    assertAdminModuleSectionIcons(module);
    assertAdminModuleNavigation(module);
    const cardIds = new Set();
    for (const card of module.contributions?.dashboardCards ?? []) {
      assertNamespaced([card.id], manifest.extensionId, 'dashboard card');
      assert(card.displayName, `${card.id} dashboard card is missing displayName`);
      assert(!cardIds.has(card.id), `${module.moduleId} has duplicate dashboard card ${card.id}`);
      if (card.order !== undefined) {
        assert(Number.isInteger(card.order), `${card.id} dashboard card order must be an integer`);
      }
      cardIds.add(card.id);
    }
  }
}

function assertAdminModuleNavigation(module) {
  const sectionIds = module.sectionIds ?? [];
  if (sectionIds.length === 0) return;
  assert(module.navigation && typeof module.navigation === 'object', `${module.moduleId} navigation is required`);
  assert(Array.isArray(module.navigation.sections), `${module.moduleId} navigation.sections must be an array`);

  const supportedSectionFields = new Set([
    'id', 'label', 'group', 'order', 'labelKey', 'groupKey', 'hideFromNavigation',
    'requiredPermission', 'requiredExtensionId', 'replacesSectionIds', 'disabledReason',
    'disabledReasonKey', 'disabled', 'adminPageAccess',
  ]);
  const navigationIds = new Set();
  for (const section of module.navigation.sections) {
    for (const field of Object.keys(section)) {
      assert(supportedSectionFields.has(field), `${module.moduleId} navigation section ${section.id ?? 'unknown'} uses unsupported field ${field}`);
    }
    assert(typeof section.id === 'string' && section.id.length > 0, `${module.moduleId} navigation section is missing id`);
    assert(typeof section.label === 'string' && section.label.length > 0, `${section.id} navigation label is required`);
    assert(typeof section.group === 'string', `${section.id} navigation group is required`);
    assert(Number.isFinite(section.order), `${section.id} navigation order must be finite`);
    assert(!navigationIds.has(section.id), `${module.moduleId} has duplicate navigation section ${section.id}`);
    navigationIds.add(section.id);
  }
  assertDeepEqual([...navigationIds].sort(), [...sectionIds].sort(), `${module.moduleId} navigation section coverage`);

  if (module.navigation.groups !== undefined) {
    assert(Array.isArray(module.navigation.groups), `${module.moduleId} navigation.groups must be an array`);
    const supportedGroupFields = new Set(['id', 'label', 'order', 'labelKey', 'defaultCollapsed', 'hideLabel']);
    const groupIds = new Set();
    const groupLabels = new Set();
    for (const group of module.navigation.groups) {
      for (const field of Object.keys(group)) {
        assert(supportedGroupFields.has(field), `${module.moduleId} navigation group ${group.id ?? 'unknown'} uses unsupported field ${field}`);
      }
      assert(typeof group.id === 'string' && group.id.length > 0, `${module.moduleId} navigation group is missing id`);
      assert(typeof group.label === 'string' && group.label.length > 0, `${group.id} navigation group label is required`);
      assert(Number.isFinite(group.order), `${group.id} navigation group order must be finite`);
      assert(!groupIds.has(group.id), `${module.moduleId} has duplicate navigation group id ${group.id}`);
      assert(!groupLabels.has(group.label), `${module.moduleId} has duplicate navigation group label ${group.label}`);
      groupIds.add(group.id);
      groupLabels.add(group.label);
    }
  }
}

function assertAdminModuleSectionIcons(module) {
  if (module.sectionIcons === undefined) return;
  assert(
    module.sectionIcons !== null &&
      typeof module.sectionIcons === 'object' &&
      !Array.isArray(module.sectionIcons),
    `${module.moduleId} sectionIcons must be an object`,
  );
  const declaredSectionIds = new Set(module.sectionIds ?? []);
  for (const [sectionId, iconName] of Object.entries(module.sectionIcons)) {
    assert(
      declaredSectionIds.has(sectionId),
      `${module.moduleId} sectionIcons key ${sectionId} is not in sectionIds`,
    );
    assert(
      typeof iconName === 'string' && iconName.length > 0,
      `${module.moduleId} sectionIcons[${sectionId}] must be a non-empty string`,
    );
    assert(
      isSupportedAdminIconName(iconName),
      `${module.moduleId} sectionIcons[${sectionId}] must use a host alias or Lucide icon name`,
    );
  }
}

function assertOnboardingPages(manifest) {
  const moduleSections = new Map(
    (manifest.adminModules ?? []).map((module) => [
      module.moduleId,
      new Set(module.sectionIds ?? []),
    ]),
  );
  const onboardingIds = new Set();
  const supportedFields = new Set([
    'id',
    'moduleId',
    'sectionId',
    'displayName',
    'description',
  ]);

  for (const page of manifest.onboardingPages ?? []) {
    assertNamespaced([page.id], manifest.extensionId, 'onboarding page');
    assert(!onboardingIds.has(page.id), `duplicate onboarding page ${page.id}`);
    assert(page.displayName, `${page.id} is missing displayName`);
    assert(page.moduleId, `${page.id} is missing moduleId`);
    assert(page.sectionId, `${page.id} is missing sectionId`);
    assert(moduleSections.has(page.moduleId), `${page.id} references unknown admin module ${page.moduleId}`);

    const sectionIds = moduleSections.get(page.moduleId);
    if (sectionIds?.size) {
      assert(sectionIds.has(page.sectionId), `${page.id} references unknown admin section ${page.sectionId}`);
    }

    for (const field of Object.keys(page)) {
      assert(supportedFields.has(field), `${page.id} uses unsupported onboarding manifest field ${field}`);
    }
    onboardingIds.add(page.id);
  }
}

function assertRequiredServices(manifest) {
  const dependencyServices = new Set(
    (manifest.dependencies?.services ?? [])
      .filter((service) => service.required !== false)
      .map((service) => service.serviceId),
  );
  for (const serviceId of manifest.requiredServices ?? []) {
    assert(dependencyServices.has(serviceId), `requiredServices includes undeclared required service ${serviceId}`);
  }
}

function main() {
  const manifest = readJson('cedros-extension.manifest.json');
  const bootstrap = readJson('cedros-extension.bootstrap.json');
  const analyticsPlan = readJson('cedros-extension.analytics.json');
  const handoff = readJson('cedros-extension.host-handoff.json');
  const automation = readJson('cedros-extension.automation.json');
  const reactPackage = readJson('ui/package.json');
  const nativePackage = readJson('ui/react-native/package.json');
  assert(reactPackage.private === true && nativePackage.private === true, 'extension UI components must be private');
  const serverToml = readText('server-wasm/Cargo.toml');
  assertDeepEqual(bootstrap.manifest, manifest, 'bootstrap manifest');
  assertEqual(manifest.schemaVersion, 1, 'schemaVersion');
  assertEqual(manifest.platformApiVersion, '1', 'platformApiVersion');
  assertEqual(manifest.compatibility.platformApiVersion, '1', 'compatibility.platformApiVersion');
  assertManifestWitChecksum(manifest);

  assertEqual(parseCargoValue(serverToml, 'version'), manifest.packageFamily.server.version, 'server package version');
  assertEqual(parseCargoValue(serverToml, 'edition'), '2021', 'server edition');
  assertEqual(reactPackage.name, manifest.packageFamily.react.packageName, 'react package name');
  assertEqual(reactPackage.version, manifest.packageFamily.react.version, 'react package version');
  assertEqual(CEDROS_PAY_EXTENSION_VERSION, manifest.version, 'browser runtime version');
  assertEqual(nativePackage.name, manifest.packageFamily.reactNative.packageName, 'native package name');
  assertEqual(nativePackage.version, manifest.packageFamily.reactNative.version, 'native package version');

  const expectedServerCrate = manifest.packageFamily.server.packageName.replaceAll('-', '_');
  assertEqual(
    manifest.registration.server.entrypoint,
    `${expectedServerCrate}::register_extension_family`,
    'server entrypoint',
  );
  assertEqual(
    manifest.registration.admin.entrypoint,
    `${manifest.packageFamily.react.packageName}/admin/register`,
    'admin entrypoint',
  );
  assertEqual(
    manifest.registration.web.entrypoint,
    `${manifest.packageFamily.react.packageName}/web/register`,
    'web entrypoint',
  );
  assertEqual(
    manifest.registration.native.entrypoint,
    `${manifest.packageFamily.reactNative.packageName}/register`,
    'native entrypoint',
  );

  assertHasExport(reactPackage, './admin/register', 'react');
  assertHasExport(reactPackage, './web/register', 'react');
  assertHasExport(nativePackage, './register', 'native');

  assertNamespaced(manifest.surfaces.server.routes ?? [], manifest.extensionId, 'server route');
  assertNamespaced(manifest.surfaces.server.jobs ?? [], manifest.extensionId, 'server job');
  assertNamespaced(manifest.surfaces.server.contentModels ?? [], manifest.extensionId, 'content model');
  assertNamespaced(manifest.surfaces.server.migrations ?? [], manifest.extensionId, 'migration');
  assertNamespaced(manifest.surfaces.server.settingsSchemas ?? [], manifest.extensionId, 'settings schema');
  assertNamespaced(
    (manifest.capabilities ?? []).map((capability) => capability.id),
    manifest.extensionId,
    'capability',
  );
  assertSurfaceRequirements(manifest);
  assertAdminModules(manifest);
  assertPageSeeds(manifest);
  assertVisualBuilder(manifest);
  assertStarterContent(manifest);
  assertOnboardingPages(manifest);
  assertAnalyticsEvents(manifest, analyticsPlan);
  assertSetupSeeds(manifest);
  assertDatabaseAccess(manifest);
  assertProviderAccess(manifest);
  assertCustomerTagAccess(manifest);
  assertCrmSourceAccess(manifest);
  assertProductContracts(manifest);
  assertRequiredServices(manifest);
  assertHandoffRows(manifest, handoff);
  assertAutomationSchedules(manifest, automation);

  const canonicalJson = JSON.stringify(manifest);
  assert(!canonicalJson.includes('/Users/'), 'manifest contains a machine-local macOS path');
  assert(!canonicalJson.includes('POSTGRES_URI'), 'manifest references raw Postgres credentials');

  console.log('Cedros extension package alignment passed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
