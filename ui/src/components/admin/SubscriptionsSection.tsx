/**
 * Subscriptions Section for Admin Dashboard
 *
 * Allows admins to enable/disable subscriptions and manage subscription plans.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import type { SectionProps, SubscriptionSettings, SubscriptionPlan } from './types';

const DEFAULT_SETTINGS: SubscriptionSettings = {
  enabled: false,
  plans: [],
  pageTitle: 'Choose Your Plan',
  pageSubtitle: 'Select the plan that best fits your needs.',
  annualSavingsBadge: '2 months free',
  popularBadgeText: 'Best Deal',
  footerNotice: '',
};

const DEFAULT_PLAN: Omit<SubscriptionPlan, 'id'> = {
  title: 'New Plan',
  description: '',
  priceMonthlyUsd: 0,
  priceAnnualUsd: 0,
  features: [],
  featureHighlight: '',
  buttonText: 'Purchase',
  isPopular: false,
  isActive: true,
  sortOrder: 0,
};

function generateId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function SubscriptionsSection({ serverUrl, apiKey, authManager }: SectionProps) {
  const [settings, setSettings] = useState<SubscriptionSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'page'>('plans');
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pageSettingsDraft, setPageSettingsDraft] = useState({
    enabled: DEFAULT_SETTINGS.enabled,
    pageTitle: DEFAULT_SETTINGS.pageTitle,
    pageSubtitle: DEFAULT_SETTINGS.pageSubtitle,
    annualSavingsBadge: DEFAULT_SETTINGS.annualSavingsBadge,
    popularBadgeText: DEFAULT_SETTINGS.popularBadgeText,
    footerNotice: DEFAULT_SETTINGS.footerNotice,
  });
  const [savedPageSettings, setSavedPageSettings] = useState(pageSettingsDraft);
  const [savedPlansHash, setSavedPlansHash] = useState('');

  // Fetch subscription settings
  const fetchSettings = useCallback(async () => {
    try {
      setFetchError(null);
      let data: SubscriptionSettings;
      const path = '/admin/subscriptions/settings';

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<SubscriptionSettings>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status}`);
        data = await res.json();
      }

      setSettings({ ...DEFAULT_SETTINGS, ...data });
      setPageSettingsDraft({
        enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
        pageTitle: data.pageTitle ?? DEFAULT_SETTINGS.pageTitle,
        pageSubtitle: data.pageSubtitle ?? DEFAULT_SETTINGS.pageSubtitle,
        annualSavingsBadge: data.annualSavingsBadge ?? DEFAULT_SETTINGS.annualSavingsBadge,
        popularBadgeText: data.popularBadgeText ?? DEFAULT_SETTINGS.popularBadgeText,
        footerNotice: data.footerNotice ?? DEFAULT_SETTINGS.footerNotice,
      });
      setSavedPageSettings({
        enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
        pageTitle: data.pageTitle ?? DEFAULT_SETTINGS.pageTitle,
        pageSubtitle: data.pageSubtitle ?? DEFAULT_SETTINGS.pageSubtitle,
        annualSavingsBadge: data.annualSavingsBadge ?? DEFAULT_SETTINGS.annualSavingsBadge,
        popularBadgeText: data.popularBadgeText ?? DEFAULT_SETTINGS.popularBadgeText,
        footerNotice: data.footerNotice ?? DEFAULT_SETTINGS.footerNotice,
      });
      setSavedPlansHash(JSON.stringify(data.plans ?? []));
    } catch {
      setSettings(DEFAULT_SETTINGS);
      setPageSettingsDraft({
        enabled: DEFAULT_SETTINGS.enabled,
        pageTitle: DEFAULT_SETTINGS.pageTitle,
        pageSubtitle: DEFAULT_SETTINGS.pageSubtitle,
        annualSavingsBadge: DEFAULT_SETTINGS.annualSavingsBadge,
        popularBadgeText: DEFAULT_SETTINGS.popularBadgeText,
        footerNotice: DEFAULT_SETTINGS.footerNotice,
      });
      setSavedPageSettings({
        enabled: DEFAULT_SETTINGS.enabled,
        pageTitle: DEFAULT_SETTINGS.pageTitle,
        pageSubtitle: DEFAULT_SETTINGS.pageSubtitle,
        annualSavingsBadge: DEFAULT_SETTINGS.annualSavingsBadge,
        popularBadgeText: DEFAULT_SETTINGS.popularBadgeText,
        footerNotice: DEFAULT_SETTINGS.footerNotice,
      });
      setSavedPlansHash(JSON.stringify([]));
      setFetchError('Failed to load subscription settings');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, apiKey, authManager]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const persistSettings = useCallback(async (payload: SubscriptionSettings) => {
    try {
      setFetchError(null);
      const path = '/admin/subscriptions/settings';
      const body = JSON.stringify(payload);

      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth(path, { method: 'PUT', body });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { method: 'PUT', headers, body });
        if (!res.ok) throw new Error(`Failed to save settings: ${res.status}`);
      }

      return true;
    } catch {
      setFetchError('Failed to save subscription settings');
      return false;
    }
  }, [authManager, apiKey, serverUrl]);

  const hasPageChanges = useMemo(() => (
    savedPageSettings.enabled !== pageSettingsDraft.enabled
    || savedPageSettings.pageTitle !== pageSettingsDraft.pageTitle
    || savedPageSettings.pageSubtitle !== pageSettingsDraft.pageSubtitle
    || savedPageSettings.annualSavingsBadge !== pageSettingsDraft.annualSavingsBadge
    || savedPageSettings.popularBadgeText !== pageSettingsDraft.popularBadgeText
    || savedPageSettings.footerNotice !== pageSettingsDraft.footerNotice
  ), [pageSettingsDraft, savedPageSettings]);

  const plansHash = useMemo(() => JSON.stringify(settings.plans), [settings.plans]);
  const hasPlanChanges = useMemo(() => savedPlansHash !== plansHash, [plansHash, savedPlansHash]);

  const triggerAutosave = useCallback(async () => {
    const nextSettings: SubscriptionSettings = {
      ...settings,
      enabled: pageSettingsDraft.enabled,
      pageTitle: pageSettingsDraft.pageTitle,
      pageSubtitle: pageSettingsDraft.pageSubtitle,
      annualSavingsBadge: pageSettingsDraft.annualSavingsBadge,
      popularBadgeText: pageSettingsDraft.popularBadgeText,
      footerNotice: pageSettingsDraft.footerNotice,
    };

    setAutosaveStatus('saving');
    const ok = await persistSettings(nextSettings);
    setSettings(nextSettings);
    if (ok) {
      setSavedPageSettings({
        enabled: nextSettings.enabled,
        pageTitle: nextSettings.pageTitle,
        pageSubtitle: nextSettings.pageSubtitle,
        annualSavingsBadge: nextSettings.annualSavingsBadge,
        popularBadgeText: nextSettings.popularBadgeText,
        footerNotice: nextSettings.footerNotice,
      });
      setSavedPlansHash(JSON.stringify(nextSettings.plans));
    }
    setAutosaveStatus(ok ? 'saved' : 'error');
    setTimeout(() => setAutosaveStatus('idle'), 1500);
  }, [pageSettingsDraft, persistSettings, settings]);

  useEffect(() => {
    if (activeTab !== 'page') return;
    if (isLoading || !hasPageChanges) return;

    const timer = setTimeout(triggerAutosave, 600);
    return () => clearTimeout(timer);
  }, [activeTab, hasPageChanges, isLoading, triggerAutosave]);

  useEffect(() => {
    if (activeTab !== 'plans') return;
    if (isLoading || !hasPlanChanges) return;

    const timer = setTimeout(triggerAutosave, 800);
    return () => clearTimeout(timer);
  }, [activeTab, hasPlanChanges, isLoading, triggerAutosave]);

  // Plan management
  const addPlan = () => {
    const newPlan: SubscriptionPlan = {
      ...DEFAULT_PLAN,
      id: generateId(),
      sortOrder: settings.plans.length,
    };
    setSettings((s) => ({ ...s, plans: [...s.plans, newPlan] }));
    setExpandedPlanId(newPlan.id);
  };

  const updatePlan = (planId: string, updates: Partial<SubscriptionPlan>) => {
    setSettings((s) => ({
      ...s,
      plans: s.plans.map((p) => (p.id === planId ? { ...p, ...updates } : p)),
    }));
  };

  const deletePlan = (planId: string) => {
    if (!confirm('Delete this plan? This cannot be undone.')) return;
    setSettings((s) => ({
      ...s,
      plans: s.plans.filter((p) => p.id !== planId),
    }));
    if (expandedPlanId === planId) setExpandedPlanId(null);
  };

  const movePlan = (planId: string, direction: 'up' | 'down') => {
    const idx = settings.plans.findIndex((p) => p.id === planId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === settings.plans.length - 1) return;

    const newPlans = [...settings.plans];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newPlans[idx], newPlans[swapIdx]] = [newPlans[swapIdx], newPlans[idx]];
    setSettings((s) => ({ ...s, plans: newPlans }));
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

  if (isLoading) {
    return (
      <div className="cedros-admin__page">
        <div className="cedros-admin__loading">{Icons.loading} Loading subscription settings...</div>
      </div>
    );
  }

  const activePlans = settings.plans.filter(p => p.isActive).length;
  const totalSubscribers = settings.plans.reduce((sum, p) => sum + (p.activeSubscribers ?? 0), 0);
  const subscriptionsEnabled = pageSettingsDraft.enabled;

  // Build per-plan subscriber stats
  const planSubscriberStats = settings.plans
    .filter(p => p.isActive)
    .map(p => ({
      label: p.title,
      value: p.activeSubscribers ?? 0,
      description: 'subscribers',
    }));

  return (
    <div className="cedros-admin__page">
      <ErrorBanner message={fetchError} onRetry={fetchSettings} />
      {/* Stats Bar */}
      <StatsBar
        stats={[
          { label: 'Status', value: subscriptionsEnabled ? 'Enabled' : 'Disabled', variant: subscriptionsEnabled ? 'success' : 'muted' },
          { label: 'Active Plans', value: activePlans, variant: activePlans > 0 ? 'success' : 'muted' },
          { label: 'Total Subscribers', value: totalSubscribers, variant: totalSubscribers > 0 ? 'success' : 'muted' },
          ...planSubscriberStats,
        ]}
        isLoading={isLoading}
      />

      <div className="cedros-admin__section">
        <div className="cedros-admin__section-header">
          <h3 className="cedros-admin__section-title">Subscription Settings</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {activeTab === 'plans' && (
              <button
                className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--action"
                onClick={addPlan}
                disabled={!subscriptionsEnabled}
              >
                {Icons.plus}
                Add Plan
              </button>
            )}
            <span className={`cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${autosaveStatus}`}>
              {autosaveStatus === 'saving' && 'Saving...'}
              {autosaveStatus === 'saved' && 'Saved'}
              {autosaveStatus === 'error' && 'Error'}
            </span>
          </div>
        </div>

        <div className="cedros-admin__tabs cedros-admin__tabs--line">
          <button
            type="button"
            className={`cedros-admin__tab ${activeTab === 'plans' ? 'cedros-admin__tab--active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            Plans
          </button>
          <button
            type="button"
            className={`cedros-admin__tab ${activeTab === 'page' ? 'cedros-admin__tab--active' : ''}`}
            onClick={() => setActiveTab('page')}
          >
            Page Settings
          </button>
        </div>

        {activeTab === 'page' && (
          <div>
            <div className="cedros-admin__form-row">
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Subscriptions</label>
                <label className="cedros-admin__toggle">
                  <input
                    type="checkbox"
                    className="cedros-admin__toggle-input"
                    checked={pageSettingsDraft.enabled}
                    onChange={(e) => setPageSettingsDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span className="cedros-admin__toggle-track">
                    <span className="cedros-admin__toggle-thumb" />
                  </span>
                  <span className="cedros-admin__toggle-label">Enable Subscriptions</span>
                </label>
              </div>
            </div>
            <div className="cedros-admin__form-row">
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Page Title</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={pageSettingsDraft.pageTitle || ''}
                  onChange={(e) => setPageSettingsDraft((prev) => ({ ...prev, pageTitle: e.target.value }))}
                  placeholder="Choose Your Plan"
                />
              </div>
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Page Subtitle</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={pageSettingsDraft.pageSubtitle || ''}
                  onChange={(e) => setPageSettingsDraft((prev) => ({ ...prev, pageSubtitle: e.target.value }))}
                  placeholder="Select the plan that best fits your needs."
                />
              </div>
            </div>
            <div className="cedros-admin__form-row">
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Annual Savings Badge</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={pageSettingsDraft.annualSavingsBadge || ''}
                  onChange={(e) => setPageSettingsDraft((prev) => ({ ...prev, annualSavingsBadge: e.target.value }))}
                  placeholder="2 months free"
                />
              </div>
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Popular Plan Badge</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={pageSettingsDraft.popularBadgeText || ''}
                  onChange={(e) => setPageSettingsDraft((prev) => ({ ...prev, popularBadgeText: e.target.value }))}
                  placeholder="Best Deal"
                />
              </div>
            </div>
            <div className="cedros-admin__form-row">
              <div className="cedros-admin__field" style={{ flex: 1 }}>
                <label className="cedros-admin__field-label">Footer Notice (optional)</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={pageSettingsDraft.footerNotice || ''}
                  onChange={(e) => setPageSettingsDraft((prev) => ({ ...prev, footerNotice: e.target.value }))}
                  placeholder="For information regarding invoices, taxes..."
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div>
            {!subscriptionsEnabled && (
              <div style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.6 }}>
                Subscriptions are disabled. Enable them to configure plans.
              </div>
            )}
            {settings.plans.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6, border: '1px dashed currentColor', borderRadius: 8 }}>
                No plans configured. Click "Add Plan" to create your first subscription tier.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {settings.plans.map((plan, idx) => {
                  const isExpanded = expandedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      style={{
                        border: '1px solid var(--cedros-admin-border, #e5e5e5)',
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: plan.isPopular ? 'var(--cedros-admin-bg-accent, #f5f5f5)' : undefined,
                      }}
                    >
                      {/* Plan Header (collapsible) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                      >
                        <span style={{ opacity: 0.5 }}>{isExpanded ? Icons.chevronDown : Icons.chevronRight}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600 }}>{plan.title || 'Untitled Plan'}</span>
                          {plan.isPopular && (
                            <span style={{
                              marginLeft: '0.5rem',
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'var(--cedros-admin-primary, #171717)',
                              color: '#fff',
                            }}>
                              Popular
                            </span>
                          )}
                          {!plan.isActive && (
                            <span style={{
                              marginLeft: '0.5rem',
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: '#9ca3af',
                              color: '#fff',
                            }}>
                              Inactive
                            </span>
                          )}
                        </div>
                        <span style={{ opacity: 0.6, fontSize: 14 }}>
                          ${plan.priceMonthlyUsd}/mo · ${plan.priceAnnualUsd}/yr
                        </span>
                        <div style={{ display: 'flex', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="cedros-admin__button cedros-admin__button--ghost"
                            onClick={() => movePlan(plan.id, 'up')}
                            disabled={idx === 0}
                            title="Move up"
                            style={{ padding: '4px 8px' }}
                          >
                            {Icons.chevronUp}
                          </button>
                          <button
                            className="cedros-admin__button cedros-admin__button--ghost"
                            onClick={() => movePlan(plan.id, 'down')}
                            disabled={idx === settings.plans.length - 1}
                            title="Move down"
                            style={{ padding: '4px 8px' }}
                          >
                            {Icons.chevronDown}
                          </button>
                          <button
                            className="cedros-admin__button cedros-admin__button--ghost"
                            onClick={() => deletePlan(plan.id)}
                            title="Delete plan"
                            style={{ padding: '4px 8px', color: '#dc2626' }}
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      </div>

                      {/* Plan Details (expanded) */}
                      {isExpanded && (
                        <div style={{ padding: '1rem', borderTop: '1px solid var(--cedros-admin-border, #e5e5e5)' }}>
                          <div className="cedros-admin__form-row">
                            <div className="cedros-admin__field">
                              <label className="cedros-admin__field-label">Plan Name</label>
                              <input
                                type="text"
                                className="cedros-admin__input"
                                value={plan.title}
                                onChange={(e) => updatePlan(plan.id, { title: e.target.value })}
                                placeholder="e.g., Starter"
                              />
                            </div>
                            <div className="cedros-admin__field">
                              <label className="cedros-admin__field-label">Button Text</label>
                              <input
                                type="text"
                                className="cedros-admin__input"
                                value={plan.buttonText || ''}
                                onChange={(e) => updatePlan(plan.id, { buttonText: e.target.value })}
                                placeholder="Purchase"
                              />
                            </div>
                          </div>

                          <div className="cedros-admin__form-row">
                            <div className="cedros-admin__field" style={{ flex: 1 }}>
                              <label className="cedros-admin__field-label">Description</label>
                              <input
                                type="text"
                                className="cedros-admin__input"
                                value={plan.description}
                                onChange={(e) => updatePlan(plan.id, { description: e.target.value })}
                                placeholder="For entry-level developers managing lightweight workloads"
                              />
                            </div>
                          </div>

                          <div className="cedros-admin__form-row">
                            <div className="cedros-admin__field">
                              <label className="cedros-admin__field-label">Monthly Price (USD)</label>
                              <input
                                type="number"
                                className="cedros-admin__input"
                                value={plan.priceMonthlyUsd || ''}
                                onChange={(e) => updatePlan(plan.id, { priceMonthlyUsd: parseFloat(e.target.value) || 0 })}
                                placeholder="10"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div className="cedros-admin__field">
                              <label className="cedros-admin__field-label">Annual Price (USD)</label>
                              <input
                                type="number"
                                className="cedros-admin__input"
                                value={plan.priceAnnualUsd || ''}
                                onChange={(e) => updatePlan(plan.id, { priceAnnualUsd: parseFloat(e.target.value) || 0 })}
                                placeholder="100"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>

                          <div className="cedros-admin__form-row">
                            <div className="cedros-admin__field">
                              <label className="cedros-admin__field-label">Feature Highlight</label>
                              <input
                                type="text"
                                className="cedros-admin__input"
                                value={plan.featureHighlight || ''}
                                onChange={(e) => updatePlan(plan.id, { featureHighlight: e.target.value })}
                                placeholder="100 prompts every 5 hours"
                              />
                              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                                Bold text shown above feature list
                              </div>
                            </div>
                          </div>

                          <div className="cedros-admin__form-row">
                            <div className="cedros-admin__field">
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={plan.isPopular || false}
                                  onChange={(e) => updatePlan(plan.id, { isPopular: e.target.checked })}
                                />
                                Mark as Popular (featured styling)
                              </label>
                            </div>
                            <div className="cedros-admin__field">
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={plan.isActive}
                                  onChange={(e) => updatePlan(plan.id, { isActive: e.target.checked })}
                                />
                                Active (available for purchase)
                              </label>
                            </div>
                          </div>

                          {/* Inventory Settings */}
                          <div className="cedros-admin__form-row" style={{ marginTop: '0.5rem' }}>
                            <div className="cedros-admin__field">
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={plan.inventoryQuantity != null}
                                  onChange={(e) => updatePlan(plan.id, { inventoryQuantity: e.target.checked ? 100 : null })}
                                />
                                Limit quantity available
                              </label>
                            </div>
                            {plan.inventoryQuantity != null && (
                              <div className="cedros-admin__field">
                                <label className="cedros-admin__field-label">Total Available</label>
                                <input
                                  type="number"
                                  className="cedros-admin__input"
                                  value={plan.inventoryQuantity ?? ''}
                                  onChange={(e) => updatePlan(plan.id, { inventoryQuantity: parseInt(e.target.value) || 0 })}
                                  min="0"
                                  style={{ width: 100 }}
                                />
                                {plan.inventorySold != null && plan.inventorySold > 0 && (
                                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                                    {plan.inventorySold} sold · {Math.max(0, plan.inventoryQuantity - plan.inventorySold)} remaining
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Features */}
                          <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <label className="cedros-admin__field-label" style={{ margin: 0 }}>
                                Feature List ({plan.features.length})
                              </label>
                              <button
                                className="cedros-admin__button cedros-admin__button--ghost"
                                onClick={() => addFeature(plan.id)}
                                style={{ fontSize: 12, padding: '4px 8px' }}
                              >
                                + Add Feature
                              </button>
                            </div>
                            {plan.features.length === 0 ? (
                              <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: 13, border: '1px dashed currentColor', borderRadius: 6 }}>
                                No features. Click "Add Feature" to add bullet points.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {plan.features.map((feature, featureIdx) => (
                                  <div key={featureIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ opacity: 0.4, fontSize: 12 }}>{featureIdx + 1}.</span>
                                    <input
                                      type="text"
                                      className="cedros-admin__input"
                                      value={feature}
                                      onChange={(e) => updateFeature(plan.id, featureIdx, e.target.value)}
                                      placeholder="e.g., Powered by MiniMax M2.1"
                                      style={{ flex: 1 }}
                                    />
                                    <button
                                      className="cedros-admin__button cedros-admin__button--ghost"
                                      onClick={() => deleteFeature(plan.id, featureIdx)}
                                      style={{ padding: '4px 8px', color: '#dc2626' }}
                                      title="Remove feature"
                                    >
                                      {Icons.trash}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
