/**
 * Sanctions API settings sub-tab for the Compliance section.
 *
 * Manages the dynamic sanctions list API connection (sunscreen.cedros.io).
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import type { SanctionsApiSettings } from './complianceTypes';
import type { SectionProps } from './types';
import { getLogger } from '../../utils/logger';

const DEFAULT_SETTINGS: SanctionsApiSettings = {
  apiUrl: '',
  refreshIntervalSecs: 3600,
  enabled: false,
};

export function ComplianceSanctionsApi({ serverUrl, apiKey, authManager }: SectionProps) {
  const [settings, setSettings] = useState<SanctionsApiSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchWithAuth = useCallback(async <T,>(path: string, options?: RequestInit): Promise<T> => {
    if (authManager?.isAuthenticated()) {
      return authManager.fetchWithAuth<T>(path, options);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    const res = await fetch(`${serverUrl}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }, [serverUrl, apiKey, authManager]);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWithAuth<SanctionsApiSettings>('/admin/compliance/sanctions-api');
        setSettings(data);
      } catch (e) {
        getLogger().error('[ComplianceSanctionsApi] Failed to fetch settings:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchWithAuth]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await fetchWithAuth('/admin/compliance/sanctions-api', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSuccessMsg('Settings saved');
    } catch (e) {
      getLogger().error('[ComplianceSanctionsApi] Save failed:', e);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const forceRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await fetchWithAuth('/admin/compliance/sanctions-api/refresh', { method: 'POST' });
      setSuccessMsg('Sanctions list refreshed');
    } catch (e) {
      getLogger().error('[ComplianceSanctionsApi] Refresh failed:', e);
      setError('Failed to refresh sanctions list');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="cedros-admin__loading">{Icons.loading} Loading sanctions API settings...</div>;
  }

  return (
    <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Dynamic Sanctions API</h3>
      </div>

      {error && <div className="cedros-admin__badge cedros-admin__badge--failed" style={{ padding: '0.5rem' }}>{error}</div>}
      {successMsg && <div className="cedros-admin__badge cedros-admin__badge--success" style={{ padding: '0.5rem' }}>{successMsg}</div>}

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={e => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
        />
        Enable dynamic sanctions list
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
        API URL
        <input
          type="url"
          className="cedros-admin__input"
          placeholder="https://sunscreen.cedros.io"
          value={settings.apiUrl}
          onChange={e => setSettings(prev => ({ ...prev, apiUrl: e.target.value }))}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
        Refresh interval (seconds, min 60)
        <input
          type="number"
          className="cedros-admin__input"
          min={60}
          value={settings.refreshIntervalSecs}
          onChange={e => setSettings(prev => ({ ...prev, refreshIntervalSecs: Number(e.target.value) }))}
          style={{ width: '160px' }}
        />
      </label>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          className="cedros-admin__button cedros-admin__button--primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          className="cedros-admin__button cedros-admin__button--ghost"
          onClick={forceRefresh}
          disabled={refreshing || !settings.enabled || !settings.apiUrl}
        >
          {refreshing ? 'Refreshing...' : 'Force Refresh'}
        </button>
      </div>
    </div>
  );
}
