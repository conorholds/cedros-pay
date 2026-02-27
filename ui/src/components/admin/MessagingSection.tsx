/** Messaging Section — email provider config, SMTP settings, and webhook configuration. */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { Toggle } from './Toggle';
import { useAutosave } from './useAutosave';
import { AutosaveIndicator } from './AutosaveIndicator';
import type { IAdminAuthManager } from './AdminAuthManager';
import { EMAIL_PROVIDERS, inferProvider } from './emailProviders';
import type { EmailProvider } from './emailProviders';

export interface MessagingSectionProps {
  serverUrl: string;
  /** @deprecated Use authManager instead */
  apiKey?: string;
  /** Admin auth manager for authenticated requests */
  authManager?: IAdminAuthManager;
}

type MessagingTab = 'messages' | 'email' | 'webhooks';

/** Messaging settings matching backend `messaging` category */
interface MessagingSettings {
  // Email settings
  email_enabled: boolean;
  email_provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  // Webhook settings
  webhook_enabled: boolean;
  webhook_url: string;
  webhook_secret: string;
  webhook_timeout: number;
}

const DEFAULT_SETTINGS: MessagingSettings = {
  email_enabled: false,
  email_provider: 'custom',
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  from_email: '',
  from_name: '',
  webhook_enabled: false,
  webhook_url: '',
  webhook_secret: '',
  webhook_timeout: 30,
};

export function MessagingSection({ serverUrl, apiKey, authManager }: MessagingSectionProps) {
  const [activeTab, setActiveTab] = useState<MessagingTab>('messages');
  const [settings, setSettings] = useState<MessagingSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Track which secret fields have been modified (to avoid sending [REDACTED] back)
  const [modifiedSecrets, setModifiedSecrets] = useState<Set<string>>(new Set());

  // Fetch messaging settings
  const fetchSettings = useCallback(async () => {
    try {
      setFetchError(null);
      let data: { config: Partial<MessagingSettings> };
      const path = '/admin/config/messaging';

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ config: Partial<MessagingSettings> }>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        data = await res.json();
      }

      const merged = { ...DEFAULT_SETTINGS, ...data.config };
      // Infer provider from smtp_host when email_provider is empty (pre-existing installs)
      if (!merged.email_provider) {
        merged.email_provider = inferProvider(merged.smtp_host);
      }
      setSettings(merged);
    } catch {
      setSettings(DEFAULT_SETTINGS);
      setFetchError('Could not load saved settings. Showing defaults.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsInitialLoad(false), 100);
    }
  }, [serverUrl, apiKey, authManager]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save settings function for autosave
  const saveSettings = useCallback(async (data: MessagingSettings) => {
    const path = '/admin/config/messaging';

    // Build payload, excluding unmodified secret fields
    const payload: Record<string, unknown> = { ...data };

    // Don't send secret fields unless they were modified
    if (!modifiedSecrets.has('smtp_password')) {
      delete payload.smtp_password;
    }
    if (!modifiedSecrets.has('webhook_secret')) {
      delete payload.webhook_secret;
    }

    const body = JSON.stringify({ config: payload });

    try {
      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth(path, { method: 'PUT', body });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { method: 'PUT', headers, body });
        if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
      }
    } catch {
      setFetchError('Failed to save messaging settings');
      throw new Error('Save failed');
    }
  }, [serverUrl, apiKey, authManager, modifiedSecrets]);

  // Autosave with debouncing
  const { status: autosaveStatus, error: autosaveError } = useAutosave({
    data: settings,
    onSave: saveSettings,
    debounceMs: 1500,
    enabled: !isInitialLoad,
  });

  const updateField = <K extends keyof MessagingSettings>(key: K, value: MessagingSettings[K]) => {
    // Track secret field modifications
    if (key === 'smtp_password' || key === 'webhook_secret') {
      setModifiedSecrets((prev) => new Set(prev).add(key));
    }
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleProviderChange = (provider: EmailProvider) => {
    const cfg = EMAIL_PROVIDERS[provider];
    setSettings((s) => ({
      ...s,
      email_provider: provider,
      smtp_host: cfg.host || s.smtp_host,
      smtp_port: 587,
      // Fixed username providers get it auto-set; others keep existing value
      smtp_username: cfg.username || (cfg.showUsername ? s.smtp_username : ''),
    }));
  };

  /** Handle credential (password/API key/token) changes, with Postmark dual-field logic */
  const handleCredentialChange = (value: string) => {
    const provider = (settings.email_provider || 'custom') as EmailProvider;
    const cfg = EMAIL_PROVIDERS[provider];
    setModifiedSecrets((prev) => new Set(prev).add('smtp_password'));
    if (cfg.usernameEqualsPassword) {
      // Postmark: server token is used as both SMTP username and password
      setSettings((s) => ({ ...s, smtp_password: value, smtp_username: value }));
    } else {
      setSettings((s) => ({ ...s, smtp_password: value }));
    }
  };

  const providerCfg = EMAIL_PROVIDERS[(settings.email_provider || 'custom') as EmailProvider] ?? EMAIL_PROVIDERS.custom;

  if (isLoading) {
    return (
      <div className="cedros-admin__messaging-settings">
        <div className="cedros-admin__page-header">
          <h2 className="cedros-admin__page-title">Store Messages</h2>
          <p className="cedros-admin__page-description">
            Configure email delivery and webhook notifications.
          </p>
        </div>
        <div className="cedros-admin__loading" style={{ marginTop: '1rem' }}>
          {Icons.loading} Loading message settings...
        </div>
      </div>
    );
  }

  return (
    <div className="cedros-admin__messaging-settings">
      {/* Page Header */}
      <div className="cedros-admin__page-header">
        <h2 className="cedros-admin__page-title">Store Messages</h2>
        <p className="cedros-admin__page-description">
          Configure email delivery and webhook notifications.
        </p>
      </div>

      {/* Tabs */}
      <div className="cedros-admin__tabs cedros-admin__tabs--line">
        <button
          type="button"
          className={`cedros-admin__tab ${activeTab === 'messages' ? 'cedros-admin__tab--active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
        <button
          type="button"
          className={`cedros-admin__tab ${activeTab === 'email' ? 'cedros-admin__tab--active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          Email
        </button>
        <button
          type="button"
          className={`cedros-admin__tab ${activeTab === 'webhooks' ? 'cedros-admin__tab--active' : ''}`}
          onClick={() => setActiveTab('webhooks')}
        >
          Webhooks
        </button>
        <div style={{ flex: 1 }} />
        <AutosaveIndicator status={autosaveStatus} error={autosaveError} />
      </div>

      <ErrorBanner message={fetchError} onRetry={fetchSettings} />

      {/* Tab Content */}
      <div className="cedros-admin__tab-content" style={{ marginTop: '1rem' }}>
        {activeTab === 'messages' && (
          <div className="cedros-admin__section">
            <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
              Enable or disable notification types. Configure the delivery settings in the Email or Webhooks tab.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Email Confirmation Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem',
                  border: '1px solid var(--cedros-admin-border, #e5e5e5)',
                  borderRadius: '0.5rem',
                }}
              >
                <Toggle
                  checked={settings.email_enabled}
                  onChange={(checked) => updateField('email_enabled', checked)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>Email Confirmation</div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', opacity: 0.6 }}>
                    Send order confirmation emails to customers after successful purchase.
                  </p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', opacity: 0.5 }}>
                    Requires Email configuration
                  </p>
                </div>
              </div>

              {/* Webhook Notification Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem',
                  border: '1px solid var(--cedros-admin-border, #e5e5e5)',
                  borderRadius: '0.5rem',
                }}
              >
                <Toggle
                  checked={settings.webhook_enabled}
                  onChange={(checked) => updateField('webhook_enabled', checked)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>Admin Purchase Notification</div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', opacity: 0.6 }}>
                    Send webhook notifications to your server when a purchase is completed.
                  </p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', opacity: 0.5 }}>
                    Requires Webhook configuration
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="cedros-admin__section">
            <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
              Select your email service provider for automatic configuration.
            </p>

            {!settings.email_enabled && (
              <div
                style={{
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  background: 'var(--cedros-admin-bg-accent, #fef3c7)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--cedros-admin-warning, #f59e0b)',
                  fontSize: '0.875rem',
                }}
              >
                Email notifications are disabled. Enable them in the Messages tab.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: settings.email_enabled ? 1 : 0.5 }}>
              {/* Provider Dropdown */}
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Email Provider</label>
                <select
                  className="cedros-admin__input"
                  value={settings.email_provider || 'custom'}
                  onChange={(e) => handleProviderChange(e.target.value as EmailProvider)}
                  disabled={!settings.email_enabled}
                >
                  {Object.entries(EMAIL_PROVIDERS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* SMTP Host + Port — only for Custom SMTP */}
              {settings.email_provider === 'custom' && (
                <>
                  <div className="cedros-admin__field">
                    <label className="cedros-admin__field-label">SMTP Host</label>
                    <input
                      type="text"
                      className="cedros-admin__input"
                      value={settings.smtp_host}
                      onChange={(e) => updateField('smtp_host', e.target.value)}
                      placeholder="smtp.example.com"
                      disabled={!settings.email_enabled}
                    />
                  </div>

                  <div className="cedros-admin__field">
                    <label className="cedros-admin__field-label">SMTP Port</label>
                    <input
                      type="number"
                      className="cedros-admin__input"
                      value={settings.smtp_port}
                      onChange={(e) => updateField('smtp_port', parseInt(e.target.value) || 587)}
                      placeholder="587"
                      disabled={!settings.email_enabled}
                      style={{ maxWidth: 120 }}
                    />
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.6 }}>
                      Common: 587 (TLS), 465 (SSL), 25 (unencrypted).
                    </p>
                  </div>
                </>
              )}

              {/* SMTP Username — shown when provider needs user-supplied username */}
              {providerCfg.showUsername && (
                <div className="cedros-admin__field">
                  <label className="cedros-admin__field-label">SMTP Username</label>
                  <input
                    type="text"
                    className="cedros-admin__input"
                    value={settings.smtp_username}
                    onChange={(e) => updateField('smtp_username', e.target.value)}
                    placeholder={settings.email_provider === 'mailgun' ? 'postmaster@your-domain.com' : 'username'}
                    disabled={!settings.email_enabled}
                  />
                </div>
              )}

              {/* Credential field (API Key / Server Token / SMTP Password) */}
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">{providerCfg.credentialLabel}</label>
                <input
                  type="password"
                  className="cedros-admin__input"
                  value={modifiedSecrets.has('smtp_password') ? settings.smtp_password : ''}
                  onChange={(e) => handleCredentialChange(e.target.value)}
                  placeholder={settings.smtp_password ? '••••••••' : `Enter ${providerCfg.credentialLabel.toLowerCase()}`}
                  disabled={!settings.email_enabled}
                />
              </div>

              {/* From fields — always shown */}
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">From Email</label>
                <input
                  type="email"
                  className="cedros-admin__input"
                  value={settings.from_email}
                  onChange={(e) => updateField('from_email', e.target.value)}
                  placeholder="noreply@example.com"
                  disabled={!settings.email_enabled}
                />
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.6 }}>
                  Default sender email address.
                </p>
              </div>

              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">From Name</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={settings.from_name}
                  onChange={(e) => updateField('from_name', e.target.value)}
                  placeholder="Your Store"
                  disabled={!settings.email_enabled}
                />
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.6 }}>
                  Default sender display name.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="cedros-admin__section">
            <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
              Configure webhook endpoint for receiving purchase notifications.
            </p>

            {!settings.webhook_enabled && (
              <div
                style={{
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  background: 'var(--cedros-admin-bg-accent, #fef3c7)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--cedros-admin-warning, #f59e0b)',
                  fontSize: '0.875rem',
                }}
              >
                Webhook notifications are disabled. Enable them in the Messages tab.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: settings.webhook_enabled ? 1 : 0.5 }}>
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Webhook URL</label>
                <input
                  type="url"
                  className="cedros-admin__input"
                  value={settings.webhook_url}
                  onChange={(e) => updateField('webhook_url', e.target.value)}
                  placeholder="https://api.yoursite.com/webhooks/orders"
                  disabled={!settings.webhook_enabled}
                />
              </div>

              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Webhook Secret</label>
                <input
                  type="password"
                  className="cedros-admin__input"
                  value={modifiedSecrets.has('webhook_secret') ? settings.webhook_secret : ''}
                  onChange={(e) => updateField('webhook_secret', e.target.value)}
                  placeholder={settings.webhook_secret ? '••••••••' : 'Enter secret for HMAC-SHA256'}
                  disabled={!settings.webhook_enabled}
                />
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.6 }}>
                  Used for HMAC-SHA256 signature verification
                </p>
              </div>

              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Timeout (seconds)</label>
                <input
                  type="number"
                  className="cedros-admin__input"
                  value={settings.webhook_timeout}
                  onChange={(e) => updateField('webhook_timeout', parseInt(e.target.value) || 30)}
                  placeholder="30"
                  disabled={!settings.webhook_enabled}
                  style={{ maxWidth: 120 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

