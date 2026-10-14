/**
 * Commerce feature visibility autosave.
 *
 * The seven workflow switches live in three places server-side: subscriptions
 * own `/admin/subscriptions/settings`, the rest are `shop` config flags, and a
 * mirror of the subscription flag lives in `subscriptions` config. A toggle
 * therefore writes only the surfaces its own patch names — flipping Coupons
 * must not rewrite subscription settings, because that would push this page's
 * loaded copy of `plans` back over whatever Catalog saved since.
 */

import type {
  AutosaveResourceDefinition,
  CedrosAutosavePatchValidation,
} from '../../autosave';
import { CEDROS_PAY_EXTENSION_ID } from '../../extension/constants';
import { fetchAdminJson, requireAdminAuth } from './authFetch';
import type { ConfigApiClient } from './configApi';
import type { IAdminAuthManager } from './AdminAuthManager';
import {
  COMMERCE_FEATURE_KEYS,
  SHOP_FEATURE_CONFIG_KEYS,
  type CommerceFeatureFlags,
  type CommerceFeatureKey,
} from './commerceFeatureSettings';
import type { SubscriptionSettings } from './types';

export type CommerceFeaturePatch = Partial<CommerceFeatureFlags>;

export const COMMERCE_FEATURE_AUTOSAVE_RESOURCE: AutosaveResourceDefinition<CommerceFeaturePatch> = {
  extensionId: CEDROS_PAY_EXTENSION_ID,
  resourceType: 'commerce-feature-visibility',
  deriveResourceId: () => 'default',
  patchSchema: {
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(COMMERCE_FEATURE_KEYS.map((key) => [key, 'boolean'])),
  },
  allowedAutosaveFields: [...COMMERCE_FEATURE_KEYS],
  // Visibility never writes catalog or pricing state, so those field paths stay
  // blocked even though they share the subscription-settings resource.
  blockedFields: [
    'plans',
    'plans.priceMonthlyUsd',
    'plans.priceAnnualUsd',
    'plans.isActive',
    'pageTitle',
    'pageSubtitle',
    'annualSavingsBadge',
    'popularBadgeText',
    'footerNotice',
  ],
  debounceProfile: 'selectToggle',
  optimisticUi: true,
  conflictStrategy: 'reject',
  validatePatch: validateCommerceFeaturePatch,
  authzRequirements: ['admin_config_update', 'admin_subscriptions_settings_update'],
  dataSensitivity: 'low',
  payloadSizeExpectation: '<1KB',
  localPersistence: false,
  telemetryLabels: {
    surface: 'pay-hub-overview',
    resource: 'commerce-feature-visibility',
  },
  migrationNotes:
    'Workflow visibility patches name only the flags that changed; plan and page-copy writes stay on their own resources.',
};

export function makeCommerceFeaturePatch(
  previous: CommerceFeatureFlags,
  current: CommerceFeatureFlags
): CommerceFeaturePatch | null {
  const patch: CommerceFeaturePatch = {};
  for (const key of COMMERCE_FEATURE_KEYS) {
    if (previous[key] !== current[key]) patch[key] = current[key];
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export function commerceFeatureUpdateMask(patch: CommerceFeaturePatch): string[] {
  return COMMERCE_FEATURE_KEYS.filter((key) => key in patch);
}

export function validateCommerceFeaturePatch(
  patch: CommerceFeaturePatch
): CedrosAutosavePatchValidation {
  const invalid = Object.keys(patch).find(
    (key) => !COMMERCE_FEATURE_KEYS.includes(key as CommerceFeatureKey)
  );
  if (invalid) {
    return { ok: false, message: `Unsupported commerce feature autosave field: ${invalid}` };
  }
  const nonBoolean = Object.entries(patch).find(([, value]) => typeof value !== 'boolean');
  if (nonBoolean) {
    return { ok: false, message: `Commerce feature ${nonBoolean[0]} must be true or false` };
  }
  return { ok: true };
}

/** Shop config keys named by this patch, so untouched flags are never rewritten. */
export function shopFeatureUpdates(patch: CommerceFeaturePatch): Record<string, boolean> {
  const updates: Record<string, boolean> = {};
  for (const [key, configKey] of Object.entries(SHOP_FEATURE_CONFIG_KEYS)) {
    const value = patch[key as CommerceFeatureKey];
    if (typeof value === 'boolean') updates[configKey] = value;
  }
  return updates;
}

export interface CommerceFeatureSaveContext {
  authManager: IAdminAuthManager | undefined;
  client: ConfigApiClient;
  patch: CommerceFeaturePatch;
}

/** Applies a visibility patch to the surfaces the patch actually names. */
export async function saveCommerceFeatureVisibility({
  authManager,
  client,
  patch,
}: CommerceFeatureSaveContext): Promise<void> {
  const description = 'Updated via Pay hub overview';

  if (typeof patch.subscriptions === 'boolean') {
    // `/admin/subscriptions/settings` only takes whole-object writes, so read
    // it immediately before writing. Merging onto the copy this page loaded
    // would push a stale `plans` array back over anything Catalog saved since.
    const latest = await fetchAdminJson<SubscriptionSettings>(
      authManager,
      '/admin/subscriptions/settings'
    );
    // Guarded enrollment must land before the first subscription write, so a
    // failed enrollment leaves visibility exactly as it was.
    if (patch.subscriptions && !latest.enabled) {
      await requireAdminAuth(authManager).fetchWithAuth('/admin/guarded-policy/enroll', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    }
    await requireAdminAuth(authManager).fetchWithAuth<SubscriptionSettings>(
      '/admin/subscriptions/settings',
      {
        method: 'PUT',
        body: JSON.stringify({ ...latest, enabled: patch.subscriptions }),
      }
    );
    await client.patchConfig('subscriptions', { enabled: patch.subscriptions }, description);
  }

  const shopUpdates = shopFeatureUpdates(patch);
  if (Object.keys(shopUpdates).length > 0) {
    await client.patchConfig('shop', shopUpdates, description);
  }
}
