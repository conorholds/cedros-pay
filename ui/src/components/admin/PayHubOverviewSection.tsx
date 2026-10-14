import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useCedrosAutosave } from '../../autosave';
import { ErrorBanner } from './ErrorBanner';
import { ConfigApiClient } from './configApi';
import { fetchAdminJson, requireAdminAuth } from './authFetch';
import {
  CommerceFeaturesList,
  summarizeCommerceFeatures,
} from './PayHubOverviewCards';
import { PayHubReadiness, type PayHubReadinessState } from './PayHubReadiness';
import { PayHubOverviewSkeleton } from './PayHubOverviewSkeleton';
import { AnimatedDisclosure } from './AnimatedDisclosure';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import {
  DEFAULT_COMMERCE_FEATURE_FLAGS,
  readCommerceRuntimeAvailability,
  readShopFeatureFlags,
  type CommerceFeatureFlags,
  type CommerceFeatureKey,
} from './commerceFeatureSettings';
import {
  COMMERCE_FEATURE_AUTOSAVE_RESOURCE,
  commerceFeatureUpdateMask,
  makeCommerceFeaturePatch,
  saveCommerceFeatureVisibility,
  type CommerceFeaturePatch,
} from './commerceFeatureAutosaveApi';
import { DEFAULT_SUBSCRIPTION_SETTINGS } from './subscriptionSettingsModel';
import { resolvePaymentRailReadiness } from './regionalPaymentPolicy';
import type { SectionProps, SubscriptionSettings } from './types';
import type { PaymentStats } from './types';

function buildFeatureFlags(
  subscriptionSettings: SubscriptionSettings,
  shopConfig: Record<string, unknown>
): CommerceFeatureFlags {
  return {
    ...readShopFeatureFlags(shopConfig),
    subscriptions: subscriptionSettings.enabled ?? DEFAULT_SUBSCRIPTION_SETTINGS.enabled,
  };
}

/** One muted sentence per state so the resting card reports without expanding. */
function featureSummaryLines(
  summary: ReturnType<typeof summarizeCommerceFeatures>
): { on: string; rest: string | null } {
  const on = summary.on.length > 0 ? `On — ${summary.on.join(', ')}` : 'Nothing is turned on';
  const rest: string[] = [];
  if (summary.off.length > 0) rest.push(`Off — ${summary.off.join(', ')}`);
  if (summary.unavailable.length > 0) {
    rest.push(`Unavailable — ${summary.unavailable.join(', ')}`);
  }
  return { on, rest: rest.length > 0 ? rest.join(' · ') : null };
}

export function PayHubOverviewSection({
  serverUrl,
  authManager,
  locale,
  persistenceScope,
}: SectionProps) {
  const client = useMemo(
    () => new ConfigApiClient(serverUrl, authManager),
    [serverUrl, authManager]
  );
  const [featureDraft, setFeatureDraft] = useState<CommerceFeatureFlags>(
    DEFAULT_COMMERCE_FEATURE_FLAGS
  );
  /** Last state the server confirmed, so Discard has somewhere true to go. */
  const [savedFeatures, setSavedFeatures] = useState<CommerceFeatureFlags>(
    DEFAULT_COMMERCE_FEATURE_FLAGS
  );
  const [activeSaveFeature, setActiveSaveFeature] = useState<CommerceFeatureKey | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** `failed` = the write did not land; `conflict` = someone else changed it. */
  const [featureFailure, setFeatureFailure] = useState<'failed' | 'conflict' | null>(null);
  const [readiness, setReadiness] = useState<PayHubReadinessState | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [isEditingFeatures, setIsEditingFeatures] = useState(false);
  /** One render with autosave off, used to adopt a discarded draft as clean. */
  const [isDiscardingFeatures, setIsDiscardingFeatures] = useState(false);
  const [unavailableFeatures, setUnavailableFeatures] = useState<CommerceFeatureKey[]>([]);
  const activePersistenceScope = useRef(persistenceScope);
  activePersistenceScope.current = persistenceScope;
  // Read inside `load`, which must not overwrite an edit the operator has made
  // but not yet saved.
  const featureDraftRef = useRef(featureDraft);
  featureDraftRef.current = featureDraft;
  const savedFeaturesRef = useRef(savedFeatures);
  savedFeaturesRef.current = savedFeatures;
  const featureEditorId = useId();
  const workflowsTitleId = useId();

  const load = useCallback(async () => {
    const scopeAtStart = persistenceScope;
    setIsRefreshing(true);
    setError(null);
    try {
      const [settings, shopConfig, stripeConfig, x402Config, creditsConfig, runtimeStatus, stats] = await Promise.all([
        fetchAdminJson<SubscriptionSettings>(authManager, '/admin/subscriptions/settings'),
        client.getConfig('shop'),
        new ConfigApiClient(serverUrl, authManager).getConfig('stripe'),
        new ConfigApiClient(serverUrl, authManager).getConfig('x402'),
        new ConfigApiClient(serverUrl, authManager).getConfig('cedros_login'),
        fetchAdminJson<{
          launchStatus?: string;
          guardedPolicy?: { active?: boolean };
          runtime?: string;
          unsupportedRoutes?: string[];
        }>(authManager, '/admin/v1/status'),
        fetchAdminJson<PaymentStats>(authManager, '/admin/stats'),
      ]);
      const nextSettings = { ...DEFAULT_SUBSCRIPTION_SETTINGS, ...settings };
      const nextFeatures = buildFeatureFlags(nextSettings, shopConfig.config);
      if (scopeAtStart !== activePersistenceScope.current) return;
      const hasUnsavedEdits =
        JSON.stringify(featureDraftRef.current) !== JSON.stringify(savedFeaturesRef.current);
      setSavedFeatures(nextFeatures);
      // A reload refreshes the baseline either way, but only adopts the server
      // values into the editor when there is nothing unsaved to lose.
      if (!hasUnsavedEdits) {
        setFeatureDraft(nextFeatures);
        setFeatureFailure(null);
      }
      const runtimeAvailability = readCommerceRuntimeAvailability(runtimeStatus);
      setUnavailableFeatures(runtimeAvailability.returns ? [] : ['returns']);
      setReadiness({
        launchActive:
          runtimeStatus.guardedPolicy?.active === true || runtimeStatus.launchStatus === 'ready',
        paymentRails: resolvePaymentRailReadiness(
          shopConfig.config,
          stripeConfig.config,
          x402Config.config,
          creditsConfig.config
        ),
        stats,
      });
      setActiveSaveFeature(null);
      setHasLoaded(true);
    } catch {
      if (scopeAtStart !== activePersistenceScope.current) return;
      setError('Failed to load Pay hub overview settings');
    } finally {
      if (scopeAtStart === activePersistenceScope.current) setIsRefreshing(false);
    }
  }, [authManager, client, persistenceScope, serverUrl]);

  useEffect(() => {
    load();
  }, [load]);

  // Quiet recovery while the last load failed, matching the other admin
  // config views; a successful retry replaces the error in place.
  useBackgroundRefresh(load, { enabled: !!error, intervalMs: 15000 });

  /**
   * Queue counts are the reason an operator opens this page, so they refresh on
   * the same cadence as the other data surfaces. This deliberately re-reads
   * only the operational half: touching the settings half — or the `isRefreshing`
   * flag that gates autosave — would let a poll quietly drop a pending toggle.
   */
  const refreshActivity = useCallback(async () => {
    const scopeAtStart = persistenceScope;
    try {
      const [runtimeStatus, stats] = await Promise.all([
        fetchAdminJson<{ launchStatus?: string; guardedPolicy?: { active?: boolean } }>(
          authManager,
          '/admin/v1/status'
        ),
        fetchAdminJson<PaymentStats>(authManager, '/admin/stats'),
      ]);
      if (scopeAtStart !== activePersistenceScope.current) return;
      setReadiness((current) =>
        current
          ? {
              ...current,
              launchActive:
                runtimeStatus.guardedPolicy?.active === true ||
                runtimeStatus.launchStatus === 'ready',
              stats,
            }
          : current
      );
    } catch {
      // A failed poll keeps the last good numbers; the next tick retries.
    }
  }, [authManager, persistenceScope]);

  useBackgroundRefresh(refreshActivity, { enabled: hasLoaded && !error });

  const handleFeatureChange = useCallback((key: CommerceFeatureKey, checked: boolean) => {
    setActiveSaveFeature(key);
    setFeatureFailure(null);
    setFeatureDraft((prev) => ({ ...prev, [key]: checked }));
  }, []);

  const saveFeatures = useCallback(
    async (patch: CommerceFeaturePatch) => {
      await saveCommerceFeatureVisibility({ authManager, client, patch });
      setSavedFeatures((current) => ({ ...current, ...patch }));
      setFeatureFailure(null);
      return {};
    },
    [authManager, client]
  );

  const featureAutosave = useCedrosAutosave<CommerceFeaturePatch, CommerceFeatureFlags>({
    extensionId: COMMERCE_FEATURE_AUTOSAVE_RESOURCE.extensionId,
    resourceType: COMMERCE_FEATURE_AUTOSAVE_RESOURCE.resourceType,
    resourceId: COMMERCE_FEATURE_AUTOSAVE_RESOURCE.deriveResourceId(featureDraft),
    draft: featureDraft,
    makePatch: makeCommerceFeaturePatch,
    validatePatch: COMMERCE_FEATURE_AUTOSAVE_RESOURCE.validatePatch,
    save: saveFeatures,
    getUpdateMask: commerceFeatureUpdateMask,
    debounceProfile: COMMERCE_FEATURE_AUTOSAVE_RESOURCE.debounceProfile,
    conflictStrategy: COMMERCE_FEATURE_AUTOSAVE_RESOURCE.conflictStrategy,
    blockedFields: COMMERCE_FEATURE_AUTOSAVE_RESOURCE.blockedFields,
    // Disabled during a refresh so freshly loaded server values are adopted as
    // clean instead of queued straight back as a write. The same switch makes
    // Discard terminal (see below).
    enabled: hasLoaded && !isRefreshing && !isDiscardingFeatures,
    onConflict: () => setFeatureFailure('conflict'),
    onPermanentFailure: () => setFeatureFailure('failed'),
  });

  /**
   * Discard reverts to the last state the server confirmed. Both updates land
   * in one render, so the engine sees the reverted draft while autosave is off
   * and adopts it as clean; resuming on the next render therefore queues
   * nothing. Reverting with autosave still on would instead schedule a write of
   * the reverted values — which fails all over again when the cause was an
   * outage, and puts the banner straight back.
   */
  const discardFeatureChanges = useCallback(() => {
    setIsDiscardingFeatures(true);
    setFeatureDraft(savedFeatures);
    setFeatureFailure(null);
    setActiveSaveFeature(null);
  }, [savedFeatures]);

  useEffect(() => {
    if (isDiscardingFeatures) setIsDiscardingFeatures(false);
  }, [isDiscardingFeatures, featureDraft]);

  const activateCheckout = useCallback(async (): Promise<boolean> => {
    setIsActivating(true);
    setActivationError(null);
    try {
      await requireAdminAuth(authManager).fetchWithAuth('/admin/guarded-policy/enroll', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load();
      return true;
    } catch {
      setActivationError('Checkout activation failed. Try again in a moment.');
      return false;
    } finally {
      setIsActivating(false);
    }
  }, [authManager, load]);

  if (!hasLoaded && isRefreshing) {
    return <PayHubOverviewSkeleton label="Loading Pay hub overview…" />;
  }

  if (!hasLoaded || !readiness) {
    return (
      <ErrorBanner message={error ?? 'Pay Hub readiness is unavailable'} onRetry={load} />
    );
  }

  const summary = featureSummaryLines(
    summarizeCommerceFeatures(featureDraft, unavailableFeatures)
  );
  const featureSaveFailed =
    featureAutosave.status === 'failed' || featureAutosave.status === 'conflict';

  return (
    <div
      className="cedros-data-stack cedros-admin__settings"
      aria-busy={isRefreshing || undefined}
    >
      <ErrorBanner message={error} />

      <PayHubReadiness
        readiness={readiness}
        activating={isActivating}
        activationError={activationError}
        locale={locale}
        onActivate={activateCheckout}
      />

      <section
        className="cedros-data-card cedros-admin__overview-features"
        aria-labelledby={workflowsTitleId}
      >
        <div className="cedros-admin__field-group-header">
          <div className="cedros-admin__field-group-heading">
            <h3 id={workflowsTitleId} className="cedros-admin__field-group-title">
              Commerce workflows
            </h3>
            <p className="cedros-admin__field-group-description">{summary.on}</p>
            {summary.rest ? (
              <p className="cedros-admin__field-group-description">{summary.rest}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm"
            aria-expanded={isEditingFeatures}
            aria-controls={featureEditorId}
            onClick={() => setIsEditingFeatures((current) => !current)}
          >
            {isEditingFeatures ? 'Done' : 'Edit'}
          </button>
        </div>
        {/* Outside the disclosure: closing the editor must not hide a failed
            save, and the unsaved choices stay recoverable either way. */}
        {featureFailure ? (
          <div className="cedros-admin__feature-failure">
            <div className="cedros-data-status cedros-data-status--error" role="alert">
              <p className="cedros-admin__attention-text">
                {featureFailure === 'conflict'
                  ? 'Workflow visibility changed somewhere else. Reload before saving again.'
                  : 'Cedros couldn’t save your workflow changes. Your choices are still here.'}
              </p>
              <div className="cedros-data-status__actions">
                {/* The recovery action has to match the diagnosis: retrying a
                    conflict just loses the race again. */}
                {featureFailure === 'conflict' ? (
                  <button
                    type="button"
                    className="cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm"
                    onClick={() => {
                      setFeatureFailure(null);
                      void load();
                    }}
                  >
                    Reload
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm"
                    onClick={() => {
                      setFeatureFailure(null);
                      void featureAutosave.retry();
                    }}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm"
                  onClick={discardFeatureChanges}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <AnimatedDisclosure open={isEditingFeatures}>
          <div id={featureEditorId} className="cedros-admin__field-group-body">
            <CommerceFeaturesList
              flags={featureDraft}
              unavailableFeatures={unavailableFeatures}
              disabled={featureAutosave.status === 'saving'}
              onChange={handleFeatureChange}
              saveState={featureAutosave.status}
              statusFeature={featureSaveFailed ? null : activeSaveFeature}
            />
          </div>
        </AnimatedDisclosure>
      </section>
    </div>
  );
}
