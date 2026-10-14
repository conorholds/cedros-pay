import type {
  AutosaveResourceDefinition,
  CedrosAutosavePatchValidation,
  CedrosAutosaveSaveMetadata,
  CedrosAutosaveSaveResult,
} from '../../autosave';
import { CEDROS_PAY_EXTENSION_ID } from '../../extension/constants';
import { requireAdminAuth } from './authFetch';
import type { IAdminAuthManager } from './AdminAuthManager';
import type { SubscriptionSettings } from './types';
import type { SubscriptionPageCopySettings } from './subscriptionSettingsModel';

export type SubscriptionPageAutosavePatch = Partial<SubscriptionPageCopySettings>;

const subscriptionPageCopyFields: Array<keyof SubscriptionPageCopySettings> = [
  'pageTitle',
  'pageSubtitle',
  'annualSavingsBadge',
  'popularBadgeText',
  'footerNotice',
];

const subscriptionPageBlockedFields = [
  'enabled',
  'plans',
  'plans.id',
  'plans.priceMonthlyUsd',
  'plans.priceAnnualUsd',
  'plans.isActive',
  'plans.inventoryQuantity',
  'plans.inventorySold',
  'plans.stripeProductId',
  'plans.stripePriceIdMonthly',
  'plans.stripePriceIdAnnual',
  'plans.solanaSubscription',
];

export const SUBSCRIPTION_PAGE_AUTOSAVE_RESOURCE: AutosaveResourceDefinition<
  SubscriptionPageAutosavePatch
> = {
  extensionId: CEDROS_PAY_EXTENSION_ID,
  resourceType: 'subscription-settings',
  deriveResourceId: () => 'default',
  patchSchema: {
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(subscriptionPageCopyFields.map((field) => [field, 'string'])),
  },
  allowedAutosaveFields: [...subscriptionPageCopyFields],
  blockedFields: subscriptionPageBlockedFields,
  debounceProfile: 'text',
  optimisticUi: false,
  conflictStrategy: 'reject',
  validatePatch: validateSubscriptionPagePatch,
  authzRequirements: ['admin_subscriptions_settings_update'],
  dataSensitivity: 'moderate',
  payloadSizeExpectation: '<10KB',
  localPersistence: true,
  telemetryLabels: {
    surface: 'pay-hub-overview',
    resource: 'subscription-page-copy',
  },
  migrationNotes:
    'Subscription page copy uses protocol autosave. Feature visibility and plan fields stay explicit saves.',
};

export function makeSubscriptionPagePatch(
  previous: SubscriptionPageCopySettings,
  current: SubscriptionPageCopySettings
): SubscriptionPageAutosavePatch | null {
  const patch: SubscriptionPageAutosavePatch = {};
  for (const key of subscriptionPageCopyFields) {
    if (previous[key] !== current[key]) {
      (patch as Record<keyof SubscriptionPageCopySettings, string>)[key] = current[key] ?? '';
    }
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export function subscriptionPageUpdateMask(patch: SubscriptionPageAutosavePatch): string[] {
  return subscriptionPageCopyFields.filter((key) => key in patch);
}

export function validateSubscriptionPagePatch(
  patch: SubscriptionPageAutosavePatch
): CedrosAutosavePatchValidation {
  const invalid = Object.keys(patch).find(
    (key) => !subscriptionPageCopyFields.includes(key as keyof SubscriptionPageCopySettings)
  );
  if (invalid) {
    return { ok: false, message: `Unsupported subscription page autosave field: ${invalid}` };
  }
  return { ok: true };
}

export async function autosaveSubscriptionPageSettings(
  authManager: IAdminAuthManager | undefined,
  patch: SubscriptionPageAutosavePatch,
  metadata: CedrosAutosaveSaveMetadata
): Promise<CedrosAutosaveSaveResult<SubscriptionSettings>> {
  const etag = metadata.etag ?? `"subscription-settings:${metadata.baseRevision ?? 0}"`;
  return requireAdminAuth(authManager).fetchWithAuth('/admin/subscriptions/settings', {
    method: 'PATCH',
    headers: {
      'If-Match': etag,
      'Idempotency-Key': metadata.idempotencyKey,
    },
    body: JSON.stringify({
      autosave: true,
      clientMutationId: metadata.clientMutationId,
      editingSessionId: metadata.editingSessionId,
      clientSeq: metadata.clientSeq,
      updateMask: metadata.updateMask,
      patch,
      schemaVersion: 'v1',
    }),
    signal: metadata.signal,
  });
}
