/**
 * Subscriptions Section for Admin Dashboard
 *
 * Allows admins to enable/disable subscriptions and manage subscription plans.
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { LoadingState } from './LoadingState';
import { StatsBar } from './StatsBar';
import { SubscriptionPlanCard } from './SubscriptionPlanCard';
import { SetupNotice } from './SetupNotice';
import { DestructiveConfirmDialog } from './DestructiveConfirmDialog';
import { SubscriptionPageCopyCard } from './SubscriptionPageCopyCard';
import { AutosaveStatusIndicator, type CedrosAutosaveState } from '../../autosave';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import type { SectionProps, SubscriptionSettings, SubscriptionPlan } from './types';
import { fetchAdminJson, requireAdminAuth } from './authFetch';
import { useCommerceFeatureFlags } from './commerceFeatureSettings';
import {
  DEFAULT_SUBSCRIPTION_SETTINGS,
  readSubscriptionPageCopySettings,
  type SubscriptionPageCopySettings,
} from './subscriptionSettingsModel';
import { useAutosave } from './useAutosave';
import { adminSectionHref } from './adminTabRouting';

const DEFAULT_PLAN: Omit<SubscriptionPlan, 'id'> = {
  title: 'New plan',
  description: '',
  priceMonthlyUsd: 0,
  priceAnnualUsd: 0,
  features: [],
  featureHighlight: '',
  buttonText: 'Purchase',
  isPopular: false,
  isActive: true,
  public: true,
  sortOrder: 0,
};

function generateId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function statusClass(status: CedrosAutosaveState): string {
  if (status === 'failed') return 'error';
  return status;
}

export function SubscriptionsSection({ authManager, persistenceScope, serverUrl }: SectionProps) {
  const [settings, setSettings] = useState<SubscriptionSettings>(DEFAULT_SUBSCRIPTION_SETTINGS);
  // Page copy is held outside `settings` on purpose: it saves through the
  // field-masked autosave protocol, so it must not enter the plan draft key and
  // trigger a whole-settings PUT of its own.
  const [pageCopy, setPageCopy] = useState<SubscriptionPageCopySettings>(() =>
    readSubscriptionPageCopySettings(DEFAULT_SUBSCRIPTION_SETTINGS)
  );
  const [pageRevision, setPageRevision] = useState(0);
  const [pageEtag, setPageEtag] = useState('"subscription-settings:0"');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [pendingDeletePlanId, setPendingDeletePlanId] = useState<string | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { flags } = useCommerceFeatureFlags(serverUrl, authManager);

  // Fetch subscription settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      setLoadError(null);
      const path = '/admin/subscriptions/settings';
      const data = await fetchAdminJson<SubscriptionSettings>(authManager, path);

      const nextSettings = { ...DEFAULT_SUBSCRIPTION_SETTINGS, ...data };
      setSettings(nextSettings);
      setPageCopy(readSubscriptionPageCopySettings(nextSettings));
      setPageRevision(nextSettings.revision ?? 0);
      setPageEtag(
        nextSettings.etag ?? `"subscription-settings:${nextSettings.revision ?? 0}"`
      );
      setHasLoadedSettings(true);
    } catch {
      setLoadError('Failed to load subscription settings');
    } finally {
      setIsLoading(false);
    }
  }, [authManager]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const persistSettings = useCallback(async (payload: SubscriptionSettings) => {
    try {
      setSaveError(null);
      const path = '/admin/subscriptions/settings';
      const body = JSON.stringify(payload);

      return await requireAdminAuth(authManager).fetchWithAuth<SubscriptionSettings>(path, {
        method: 'PUT',
        body,
      });
    } catch {
      setSaveError('Failed to save subscription settings');
      throw new Error('Failed to save subscription settings');
    }
  }, [authManager]);

  const savePlans = useCallback(async () => {
    try {
      // Send the live page copy so a plan save never rewinds a copy edit that
      // landed through the autosave protocol since this draft was loaded.
      const saved = await persistSettings({ ...settings, ...pageCopy });
      const nextSettings = { ...DEFAULT_SUBSCRIPTION_SETTINGS, ...saved };
      setSettings(nextSettings);
      if (typeof nextSettings.revision === 'number') setPageRevision(nextSettings.revision);
      if (typeof nextSettings.etag === 'string') setPageEtag(nextSettings.etag);
      return { canonicalDraftKey: JSON.stringify(nextSettings) };
    } catch {
      throw new Error('Failed to save subscription settings');
    }
  }, [pageCopy, persistSettings, settings]);

  const updatePageCopy = useCallback((patch: Partial<SubscriptionPageCopySettings>) => {
    setPageCopy((current) => ({ ...current, ...patch }));
  }, []);

  const handlePageCopySaved = useCallback(
    (result: { revision?: number | string; etag?: string }) => {
      if (typeof result.revision === 'number') setPageRevision(result.revision);
      if (typeof result.etag === 'string') setPageEtag(result.etag);
    },
    []
  );

  const updateSettingsDraft = useCallback(
    (update: (current: SubscriptionSettings) => SubscriptionSettings) => {
      setSettings((current) => update(current));
    },
    []
  );

  // Plan management
  const addPlan = () => {
    const newPlan: SubscriptionPlan = {
      ...DEFAULT_PLAN,
      id: generateId(),
      sortOrder: settings.plans.length,
    };
    updateSettingsDraft((s) => ({ ...s, plans: [...s.plans, newPlan] }));
    setExpandedPlanId(newPlan.id);
  };

  const updatePlan = (planId: string, updates: Partial<SubscriptionPlan>) => {
    updateSettingsDraft((s) => ({
      ...s,
      plans: s.plans.map((p) => (p.id === planId ? { ...p, ...updates } : p)),
    }));
  };

  const confirmDeletePlan = () => {
    if (!pendingDeletePlanId) return;
    updateSettingsDraft((s) => ({
      ...s,
      plans: s.plans.filter((p) => p.id !== pendingDeletePlanId),
    }));
    if (expandedPlanId === pendingDeletePlanId) setExpandedPlanId(null);
    setPendingDeletePlanId(null);
  };

  const movePlan = (planId: string, direction: 'up' | 'down') => {
    const idx = settings.plans.findIndex((p) => p.id === planId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === settings.plans.length - 1) return;

    const newPlans = [...settings.plans];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newPlans[idx], newPlans[swapIdx]] = [newPlans[swapIdx], newPlans[idx]];
    updateSettingsDraft((s) => ({ ...s, plans: newPlans }));
  };

  // Feature management for a plan
  const addFeature = (planId: string) => {
    updatePlan(planId, {
      features: [...(settings.plans.find((p) => p.id === planId)?.features || []), ''],
    });
  };

  const updateFeature = (planId: string, featureIdx: number, value: string) => {
    const plan = settings.plans.find((p) => p.id === planId);
    if (!plan) return;
    const features = [...plan.features];
    features[featureIdx] = value;
    updatePlan(planId, { features });
  };

  const deleteFeature = (planId: string, featureIdx: number) => {
    const plan = settings.plans.find((p) => p.id === planId);
    if (!plan) return;
    const features = plan.features.filter((_, i) => i !== featureIdx);
    updatePlan(planId, { features });
  };

  useBackgroundRefresh(fetchSettings, { enabled: !!loadError, intervalMs: 15000 });

  const saveStatus = useAutosave(JSON.stringify(settings), savePlans, {
    ready: hasLoadedSettings && !isLoading,
    delayMs: 600,
    resourceType: 'subscription-plans',
    resourceId: 'default',
    extensionId: 'cedros-pay',
  });

  if (isLoading) {
    return (
      <div className="cedros-data-stack cedros-admin__page">
        <LoadingState label="Loading subscription settings…" />
      </div>
    );
  }

  if (!hasLoadedSettings && loadError) {
    return (
      <div className="cedros-data-stack cedros-admin__page">
        <ErrorBanner message={loadError} onRetry={fetchSettings} />
      </div>
    );
  }

  const activePublicPlans = settings.plans.filter(
    (plan) => plan.isActive && plan.public !== false
  ).length;
  const totalSubscribers = settings.plans.reduce((sum, p) => sum + (p.activeSubscribers ?? 0), 0);
  const subscriptionsEnabled = settings.enabled;
  const pendingDeletePlan = settings.plans.find((plan) => plan.id === pendingDeletePlanId);

  // Build per-plan subscriber stats
  const planSubscriberStats = settings.plans
    .filter(p => p.isActive)
    .map(p => ({
      label: p.title,
      value: p.activeSubscribers ?? 0,
      description: 'subscribers',
    }));

  return (
    <div className="cedros-data-stack cedros-admin__page">
      <ErrorBanner message={loadError ?? saveError} onRetry={loadError ? fetchSettings : undefined} />
      {/* Stats Bar */}
      <StatsBar
        stats={[
          { label: 'Status', value: subscriptionsEnabled ? 'Enabled' : 'Disabled', variant: subscriptionsEnabled ? 'success' : 'muted' },
          { label: 'Active public plans', value: activePublicPlans, variant: activePublicPlans > 0 ? 'success' : 'muted' },
          { label: 'Total subscribers', value: totalSubscribers, variant: totalSubscribers > 0 ? 'success' : 'muted' },
          ...planSubscriberStats,
        ]}
        isLoading={isLoading}
      />

      <div className="cedros-data-card cedros-admin__section">
        <div className="cedros-admin__section-header">
          <h3 className="cedros-admin__section-title">Subscription plans</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary cedros-admin__button--action"
              onClick={addPlan}
              disabled={!subscriptionsEnabled}
              type="button"
            >
              {Icons.plus}
              Add plan
            </button>
            <AutosaveStatusIndicator
              status={saveStatus}
              className={`cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${statusClass(saveStatus)}`}
            />
          </div>
        </div>

        <div>
          {!subscriptionsEnabled ? (
              <SetupNotice
                title="Enable subscriptions"
                description="Turn on subscriptions in Pay hub to configure plans."
                action={(
                  <a className="cedros-data-btn cedros-data-btn--primary cedros-data-btn--sm" href={adminSectionHref('settings-hub', 'overview')}>
                    Open Pay hub
                  </a>
                )}
              />
            ) : (
              <>
                {activePublicPlans === 0 && (
                  <SetupNotice
                    title="No active public plans"
                    description="Add a plan, or make an existing plan active and public, before Portal can offer plan selection."
                  />
                )}
                {settings.plans.length > 0 && (
                  <div className="cedros-admin__stagger-reveal" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {settings.plans.map((plan, idx) => (
                      <SubscriptionPlanCard
                        key={plan.id}
                        index={idx}
                        inventoryEnabled={flags.inventory}
                        isExpanded={expandedPlanId === plan.id}
                        plan={plan}
                        planCount={settings.plans.length}
                        onAddFeature={addFeature}
                        onDelete={setPendingDeletePlanId}
                        onDeleteFeature={deleteFeature}
                        onMove={movePlan}
                        onToggleExpanded={(planId) =>
                          setExpandedPlanId(expandedPlanId === planId ? null : planId)
                        }
                        onUpdate={updatePlan}
                        onUpdateFeature={updateFeature}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
        </div>
      </div>

      {subscriptionsEnabled && (
        <SubscriptionPageCopyCard
          authManager={authManager}
          draft={pageCopy}
          etag={pageEtag}
          onChange={updatePageCopy}
          onConflict={() =>
            setSaveError('Subscription page copy changed elsewhere. Reload before saving again.')
          }
          onFailure={() => setSaveError('Failed to autosave subscription page copy')}
          onSaved={handlePageCopySaved}
          persistenceScope={persistenceScope}
          revision={pageRevision}
        />
      )}

      {pendingDeletePlan && (
        <DestructiveConfirmDialog
          title={`Delete “${pendingDeletePlan.title || 'Untitled plan'}”?`}
          impact="This permanently removes the plan and its configured features from subscription settings."
          confirmLabel="Delete plan"
          onCancel={() => setPendingDeletePlanId(null)}
          onConfirm={confirmDeletePlan}
        />
      )}
    </div>
  );
}
