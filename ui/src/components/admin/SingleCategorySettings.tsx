/**
 * Single Category Settings Component
 *
 * Displays and edits config for a single category.
 * Used to create dedicated settings pages for specific categories.
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import {
  ConfigApiClient,
  CONFIG_CATEGORIES,
  type GetConfigResponse,
  type ConfigHistoryEntry,
  type ValidateConfigResponse,
} from './configApi';
import { ConfigEditor } from './ConfigEditor';
import type { IAdminAuthManager } from './AdminAuthManager';
import { formatDateTime } from '../../utils/dateHelpers';

export interface SingleCategorySettingsProps {
  serverUrl: string;
  /** @deprecated Use authManager instead */
  apiKey?: string;
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
  /** Whether to show the enabled toggle in the header */
  showEnabledToggle?: boolean;
}

export function SingleCategorySettings({
  serverUrl,
  apiKey: _apiKey,
  authManager,
  category,
  title,
  description,
  enabledField = 'enabled',
  showEnabledToggle = false,
}: SingleCategorySettingsProps) {
  const client = useMemo(
    () => new ConfigApiClient(serverUrl, undefined, authManager),
    [serverUrl, authManager]
  );

  const [categoryConfig, setCategoryConfig] = useState<GetConfigResponse | null>(null);
  const [history, setHistory] = useState<ConfigHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const res = await client.getConfig(category, true);
      setCategoryConfig(res);
    } catch {
      setCategoryConfig(null);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [client, category]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await client.getHistory(category, 20);
      setHistory(res.history);
    } catch {
      setHistory([]);
    }
  }, [client, category]);

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory, fetchHistory]);

  // Save config
  // Note: no re-fetch after save. The PUT is a full replace so the UI already
  // holds the correct state. Re-fetching would create a new object reference
  // that resets formData in ConfigEditor, which re-triggers useAutosave and
  // causes an infinite save loop (the "stuck unsaved" bug).
  const handleSave = useCallback(async (config: Record<string, unknown>) => {
    await client.updateConfig(category, config, 'Updated via admin dashboard');
  }, [client, category]);

  // Validate config
  const handleValidate = useCallback(async (config: Record<string, unknown>) => {
    return client.validateConfig(category, config);
  }, [client, category]);

  // Toggle enabled state (optimistic update, reverted on failure)
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);
  const handleToggleEnabled = useCallback(async () => {
    if (!categoryConfig || isTogglingEnabled) return;

    const currentValue = Boolean(categoryConfig.config[enabledField]);
    const newValue = !currentValue;
    const newConfig = { ...categoryConfig.config, [enabledField]: newValue };

    // Optimistic update - this stays even if API fails (for demo/storybook mode)
    setIsTogglingEnabled(true);
    setCategoryConfig({ ...categoryConfig, config: newConfig });

    try {
      await client.updateConfig(category, newConfig, `${newValue ? 'Enabled' : 'Disabled'} via admin dashboard`);
    } catch (err) {
      // Revert optimistic update
      setCategoryConfig({ ...categoryConfig, config: { ...categoryConfig.config, [enabledField]: currentValue } });
      setError(err instanceof Error ? err.message : 'Failed to save enabled state');
    } finally {
      setIsTogglingEnabled(false);
    }
  }, [categoryConfig, client, category, enabledField, isTogglingEnabled]);

  const isEnabled = Boolean(categoryConfig?.config[enabledField]);

  if (isLoading && !categoryConfig) {
    return (
      <div className="cedros-admin__section">
        <div className="cedros-admin__loading">
          {Icons.loading} Loading {displayTitle} settings...
        </div>
      </div>
    );
  }

  return (
    <div className="cedros-admin__section">
      <ErrorBanner message={error} onRetry={fetchConfig} />
      <div className="cedros-admin__section-header">
        <div>
          <h3 className="cedros-admin__section-title">
            <span style={{ marginRight: '0.5rem' }}>{meta.icon}</span>
            {displayTitle}
          </h3>
          {displayDescription && (
            <p className="cedros-admin__text-muted" style={{ marginTop: '0.25rem' }}>
              {displayDescription}
            </p>
          )}
        </div>
        {showEnabledToggle && categoryConfig && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: isEnabled ? 'var(--cedros-admin-text, #171717)' : 'var(--cedros-admin-muted, #737373)' }}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isEnabled}
              onClick={handleToggleEnabled}
              disabled={isTogglingEnabled}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                backgroundColor: isEnabled
                  ? 'var(--cedros-admin-primary, #171717)'
                  : 'var(--cedros-admin-border, #d4d4d4)',
                cursor: isTogglingEnabled ? 'wait' : 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s',
                flexShrink: 0,
                opacity: isTogglingEnabled ? 0.6 : 1,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: isEnabled ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>
        )}
      </div>

      {categoryConfig && (
        <div
          className="cedros-admin__settings-editor"
          style={{
            marginTop: '1rem',
            opacity: showEnabledToggle && !isEnabled ? 0.6 : 1,
            pointerEvents: showEnabledToggle && !isEnabled ? 'none' : 'auto',
          }}
        >
          {showEnabledToggle && !isEnabled && (
            <div
              style={{
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                backgroundColor: 'var(--cedros-admin-warning-bg, #fef3c7)',
                border: '1px solid var(--cedros-admin-warning-border, #f59e0b)',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: 'var(--cedros-admin-warning-text, #92400e)',
                pointerEvents: 'auto',
              }}
            >
              This payment method is disabled. Enable it using the toggle above to accept payments.
            </div>
          )}
          <ConfigEditor
            category={categoryConfig.category}
            config={categoryConfig.config}
            originalConfig={categoryConfig.config}
            onSave={handleSave}
            onValidate={handleValidate}
          />
        </div>
      )}

      {showHistory && (
        <div className="cedros-admin__settings-history" style={{ marginTop: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Change History</h4>
          {history.length === 0 ? (
            <p className="cedros-admin__text-muted">No history entries found.</p>
          ) : (
            <div className="cedros-admin__settings-timeline">
              {history.map(entry => (
                <div key={entry.id} className="cedros-admin__settings-timeline-item">
                  <div className="cedros-admin__settings-timeline-dot" />
                  <div className="cedros-admin__settings-timeline-content">
                    <div className="cedros-admin__settings-timeline-header">
                      <code>{entry.configKey}</code>
                      <span className={`cedros-admin__badge cedros-admin__badge--${entry.action.toLowerCase()}`}>
                        {entry.action}
                      </span>
                    </div>
                    <div className="cedros-admin__settings-timeline-meta">
                      {formatDateTime(entry.changedAt)} by {entry.changedBy}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Validation results banner */}
      {validationResult && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: validationResult.valid
              ? 'var(--cedros-admin-success-bg, #dcfce7)'
              : 'var(--cedros-admin-error-bg, #fef2f2)',
            border: `1px solid ${validationResult.valid
              ? 'var(--cedros-admin-success-border, #86efac)'
              : 'var(--cedros-admin-error-border, #fecaca)'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 600,
                color: validationResult.valid
                  ? 'var(--cedros-admin-success, #16a34a)'
                  : 'var(--cedros-admin-error, #dc2626)',
                marginBottom: validationResult.errors.length > 0 || validationResult.warnings.length > 0 ? '0.5rem' : 0,
              }}>
                {validationResult.valid ? '✓ Configuration is valid' : '✗ Validation failed'}
              </div>
              {validationResult.errors.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--cedros-admin-error, #dc2626)', fontSize: '0.875rem' }}>
                  {validationResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
              {validationResult.warnings.length > 0 && (
                <ul style={{ margin: validationResult.errors.length > 0 ? '0.5rem 0 0' : 0, paddingLeft: '1.25rem', color: 'var(--cedros-admin-warning, #ca8a04)', fontSize: '0.875rem' }}>
                  {validationResult.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => setValidationResult(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                color: 'var(--cedros-admin-text-muted, #64748b)',
                fontSize: '1.25rem',
                lineHeight: 1,
              }}
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Bottom action buttons: History (left) and Validate (right) */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide History' : 'History'}
        </button>
        <button
          type="button"
          className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
          disabled={isValidating || !categoryConfig}
          onClick={async () => {
            if (!categoryConfig) return;
            setIsValidating(true);
            setValidationResult(null);
            try {
              const result = await handleValidate(categoryConfig.config);
              setValidationResult(result);
            } catch (err) {
              setValidationResult({
                valid: false,
                errors: [err instanceof Error ? err.message : 'Validation failed'],
                warnings: [],
              });
            } finally {
              setIsValidating(false);
            }
          }}
        >
          {isValidating ? 'Validating...' : 'Validate'}
        </button>
      </div>
    </div>
  );
}
