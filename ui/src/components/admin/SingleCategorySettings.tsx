/**
 * Single Category Settings
 *
 * Owns the edit state for one config category: loads the saved config,
 * tracks a draft, and persists edits through the shared autosave wrapper.
 * Saving never resets the form, so the feedback loop the old autosave model
 * suffered from cannot occur here.
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { AutosaveStatusIndicator, type CedrosAutosaveState } from '../../autosave';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { LoadingState } from './LoadingState';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { AnimatedDisclosure } from './AnimatedDisclosure';
import {
  ConfigApiClient,
  CONFIG_CATEGORIES,
  isSecretField,
  REDACTED_VALUE,
  type GetConfigResponse,
  type ValidateConfigResponse,
} from './configApi';
import { ConfigEditor } from './ConfigEditor';
import { StripeWebhookEndpoint } from './StripeWebhookEndpoint';
import { Switch } from './Switch';
import { validateSolanaAddress } from './TokenMintSelector';
import { mergeValidationResults, validateConfigSetup } from './configSetupValidation';
import { useAutosave } from './useAutosave';
import type { IAdminAuthManager } from './AdminAuthManager';

export interface SingleCategorySettingsProps {
  serverUrl: string;
  /** Admin auth manager for authenticated requests */
  authManager?: IAdminAuthManager;
  /** The config category to display */
  category: string;
  /** Optional title override (defaults to category label) */
  title?: string;
  /** Optional description override (can include React elements like links) */
  description?: ReactNode;
  /** Field name for the enabled toggle (default: 'enabled') */
  enabledField?: string;
  /** Boolean fields also set to true when the rail is switched on. */
  enableImplies?: string[];
  /** Whether to show the enabled toggle in the header */
  showEnabledToggle?: boolean;
  /** Blocks this rail when a required external extension or host seam is absent. */
  blockedReason?: ReactNode;
  blockedTitle?: string;
  /** Optional note rendered instead of setup fields when no manual fields are needed. */
  setupNote?: ReactNode;
  hideEditor?: boolean;
  hideActions?: boolean;
}

/**
 * Fill metadata-declared defaults for keys the server returned empty (e.g. a
 * fresh Stripe config whose `mode` is '' lands on Test mode). Applied to both
 * the saved baseline and the draft, so the default shows selected without
 * reading as an unsaved change. Keys the server omits entirely are left alone —
 * they don't render, so defaulting them would only invent a phantom field.
 */
function withFieldDefaults(
  category: string,
  config: Record<string, unknown>
): Record<string, unknown> {
  const fields = CONFIG_CATEGORIES[category]?.fields;
  if (!fields) return config;
  let next = config;
  for (const [key, meta] of Object.entries(fields)) {
    if (meta.default === undefined || !(key in config)) continue;
    const value = config[key];
    if (value === '' || value === null || value === undefined) {
      if (next === config) next = { ...config };
      next[key] = meta.default;
    }
  }
  return next;
}

/** Per-key comparison so reordered objects don't read as edits. */
function configsDiffer(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) return true;
  }
  return false;
}

function changedConfig(
  draft: Record<string, unknown>,
  saved: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(draft).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(saved[key])
    )
  );
}

function autosaveStatusClass(status: CedrosAutosaveState): string {
  if (status === 'failed') return 'error';
  return status;
}

export function SingleCategorySettings({
  serverUrl,
  authManager,
  category,
  title,
  description,
  enabledField = 'enabled',
  enableImplies = [],
  showEnabledToggle = false,
  blockedReason,
  blockedTitle = 'Blocked',
  setupNote,
  hideEditor = false,
  hideActions = false,
}: SingleCategorySettingsProps) {
  const client = useMemo(
    () => new ConfigApiClient(serverUrl, authManager),
    [serverUrl, authManager]
  );

  const [categoryConfig, setCategoryConfig] = useState<GetConfigResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidateConfigResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const meta = CONFIG_CATEGORIES[category] || { label: category, secrets: [], icon: '⚙️' };
  const displayTitle = title || meta.label;
  const displayDescription = description || meta.description;

  // Fetch category config
  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.getConfig(category);
      const config = withFieldDefaults(category, res.config);
      setCategoryConfig({ ...res, config });
      setDraft({ ...config });
      setSaveError(null);
    } catch (err) {
      // Surface the server's message (e.g. a permission error) when available.
      setError(err instanceof Error && err.message ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [client, category]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const savedConfig = categoryConfig?.config ?? null;
  const isDirty = useMemo(
    () => Boolean(draft && savedConfig && configsDiffer(draft, savedConfig)),
    [draft, savedConfig]
  );

  // Block saving while an entered Solana address is invalid.
  const clientError = useMemo(() => {
    if (!draft) return null;
    for (const key of ['payment_address', 'token_mint']) {
      const value = draft[key];
      if (typeof value === 'string' && value && !validateSolanaAddress(value).valid) {
        return 'Fix the highlighted fields before saving.';
      }
    }
    return null;
  }, [draft]);

  const updateField = useCallback((key: string, value: unknown) => {
    setSaveError(null);
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  // Secrets the user just typed are re-redacted locally
  // afterwards so the form matches what the server will return on reload.
  const saveDraft = useCallback(async () => {
    if (!draft || !categoryConfig) return;
    if (clientError) {
      setSaveError(clientError);
      throw new Error(clientError);
    }
    setSaveError(null);
    try {
      const updates = changedConfig(draft, categoryConfig.config);
      if (Object.keys(updates).length === 0) {
        return { canonicalDraftKey: JSON.stringify(draft) };
      }
      // Provider category routes use PUT even when only changed keys are sent.
      const result = await client.updateConfig(category, updates, 'Updated via Pay hub');
      const persisted = { ...draft };
      for (const key of Object.keys(persisted)) {
        const value = persisted[key];
        if (isSecretField(category, key) && typeof value === 'string' && value !== '') {
          persisted[key] = REDACTED_VALUE;
        }
      }
      setCategoryConfig((prev) => (
        prev
          ? {
              ...prev,
              config: persisted,
              committedRevision: result.committedRevision,
            }
          : prev
      ));
      setDraft(persisted);
      return { canonicalDraftKey: JSON.stringify(persisted) };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setSaveError(message);
      throw new Error(message);
    }
  }, [client, category, draft, categoryConfig, clientError]);

  // Clearing the token makes the server mint a new one on the next read, so the
  // fresh URL arrives with the reload; nothing token-shaped ever sits in the draft.
  const regenerateWebhookUrl = useCallback(async () => {
    setSaveError(null);
    try {
      await client.updateConfig(category, { webhook_token: null }, 'Regenerated Stripe webhook URL');
    } catch (err) {
      setSaveError(err instanceof Error && err.message ? err.message : 'Regenerate failed');
      return;
    }
    await fetchConfig();
  }, [client, category, fetchConfig]);

  const handleToggleEnabled = useCallback(() => {
    if (!draft) return;
    const currentValue = Boolean(draft[enabledField]);
    const nextValue = !currentValue;
    const updates: Record<string, unknown> = { [enabledField]: nextValue };
    if (nextValue) {
      for (const field of enableImplies) updates[field] = true;
    }
    setSaveError(null);
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  }, [draft, enabledField, enableImplies]);

  const handleValidate = useCallback(async () => {
    if (!draft) return;
    const localResult = validateConfigSetup(category, draft);
    if (!localResult.valid) {
      setValidationResult(localResult);
      return;
    }
    setIsValidating(true);
    setValidationResult(null);
    try {
      const result = await client.validateConfig(category, draft);
      const merged = mergeValidationResults(localResult, result);
      setValidationResult(merged);
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: [err instanceof Error ? err.message : 'Validation failed'],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  }, [client, category, draft]);

  const isBlocked = Boolean(blockedReason);
  const isEnabled = Boolean((draft ?? categoryConfig?.config)?.[enabledField]);
  // Rails with an on/off switch collapse to a short note while off, matching
  // the host Providers page: the setup fields only appear once the rail is on.
  // Unsaved edits keep the form open so a pending change is never hidden away
  // (and silently lost) by flipping the rail off before saving.
  const showDetails = !isBlocked && (!showEnabledToggle || isEnabled || isDirty);

  // Drop transient view state when the card collapses so a stale validation
  // banner doesn't silently resurface when it reopens.
  useEffect(() => {
    if (!showDetails) {
      setValidationResult(null);
    }
  }, [showDetails]);

  useBackgroundRefresh(fetchConfig, { enabled: !!error, intervalMs: 15000 });

  const saveStatus = useAutosave(draft ? JSON.stringify(draft) : '', saveDraft, {
    ready: !isLoading && Boolean(draft) && !isBlocked,
    delayMs: 600,
    resourceType: 'config-category',
    resourceId: category,
    extensionId: 'cedros-pay',
  });

  if (isLoading && !categoryConfig) {
    return (
      <div className="cedros-data-card cedros-admin__section cedros-admin__payment-card">
        <LoadingState label={`Loading ${displayTitle} settings…`} />
      </div>
    );
  }

  return (
    <div className="cedros-data-card cedros-admin__section cedros-admin__payment-card">
      <ErrorBanner message={error ?? saveError} onRetry={error ? fetchConfig : undefined} />
      <div className="cedros-data-card__header cedros-admin__section-header cedros-admin__payment-card-header">
        <div className="cedros-admin__payment-card-heading">
          <h3 className="cedros-data-card__title cedros-admin__section-title">{displayTitle}</h3>
          {displayDescription && (
            <p className="cedros-admin__text-muted cedros-admin__payment-card-description">
              {displayDescription}
            </p>
          )}
        </div>
        {showEnabledToggle && categoryConfig && (
          <div className="cedros-admin__payment-toggle-row">
            <AutosaveStatusIndicator
              status={saveStatus}
              className={`cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${autosaveStatusClass(saveStatus)}`}
            />
            <span className="cedros-admin__payment-toggle-label">
              {isEnabled ? 'On' : 'Off'}
            </span>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isBlocked}
              aria-label={`Turn ${displayTitle} on or off`}
            />
          </div>
        )}
      </div>

      {isBlocked && (
        <section className="cedros-data-setup-notice" role="status">
          <div className="cedros-data-setup-notice__body">
            <h3>{blockedTitle}</h3>
            <p>{blockedReason}</p>
          </div>
          <div className="cedros-data-actions">
            <a className="cedros-data-btn cedros-data-btn--primary cedros-data-btn--sm" href="/admin/extensions">
              View extensions
            </a>
          </div>
        </section>
      )}

      {!isBlocked && !showDetails && categoryConfig && (
        <div className="cedros-admin__payment-off-note">
          {displayTitle} is turned off. Turn it on to set it up — Cedros won’t use it until
          you do.
        </div>
      )}

      {showDetails && setupNote && (
        <div className="cedros-admin__payment-off-note">{setupNote}</div>
      )}

      {!hideEditor && draft && categoryConfig && (
        <AnimatedDisclosure open={showDetails}>
          <div className="cedros-admin__settings-editor cedros-admin__payment-editor">
            <ConfigEditor
              category={categoryConfig.category}
              values={draft}
              originalConfig={categoryConfig.config}
              serverUrl={serverUrl}
              onChange={updateField}
            />
            {categoryConfig.webhookEndpoint && (
              <StripeWebhookEndpoint
                serverUrl={serverUrl}
                endpoint={categoryConfig.webhookEndpoint}
                onRegenerate={regenerateWebhookUrl}
                disabled={isDirty}
              />
            )}
          </div>
        </AnimatedDisclosure>
      )}

      {/* Validation results banner */}
      {showDetails && validationResult && (
        <div
          className={`cedros-admin__payment-validation ${
            validationResult.valid
              ? 'cedros-admin__payment-validation--success'
              : 'cedros-admin__payment-validation--error'
          }`}
        >
          <div className="cedros-admin__payment-validation-layout">
            <div className="cedros-admin__payment-validation-content">
              <div className="cedros-admin__payment-validation-title">
                {validationResult.valid ? Icons.check : Icons.close}
                {validationResult.valid && validationResult.warnings.length === 0
                  ? 'Setup looks ready'
                  : validationResult.valid
                    ? 'Setup needs review'
                    : 'Some settings need attention'}
              </div>
              {validationResult.errors.length > 0 && (
                <ul className="cedros-admin__payment-validation-list">
                  {validationResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
              {validationResult.warnings.length > 0 && (
                <ul className="cedros-admin__payment-validation-list cedros-admin__payment-validation-list--warning">
                  {validationResult.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => setValidationResult(null)}
              className="cedros-admin__payment-validation-dismiss"
              title="Dismiss"
              aria-label="Dismiss validation result"
            >
              {Icons.close}
            </button>
          </div>
        </div>
      )}

      {/* Footer: setup check and autosave controls */}
      {showDetails && !hideActions && (
        <div className="cedros-admin__payment-card-actions">
          <div className="cedros-admin__payment-save-controls">
            <button
              type="button"
              className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm"
              disabled={isValidating || !draft}
              onClick={handleValidate}
            >
              {isValidating ? 'Checking…' : 'Check setup'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
