/**
 * Compliance Section Component
 *
 * Admin dashboard for managing token holders, freeze/thaw operations,
 * compliance actions audit trail, and report generation.
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import type { SectionProps } from './types';
import { getLogger } from '../../utils/logger';
import { formatDateTime } from '../../utils/dateHelpers';
import type { TokenHolder, ComplianceAction, ComplianceReport, ComplianceTab, SanctionsSweepSettings } from './complianceTypes';
import { truncateAddress, statusBadge, actionBadge, SOLANA_EXPLORER } from './complianceTypes';
import { ComplianceSanctionsApi } from './ComplianceSanctionsApi';
import { ComplianceKycTab } from './ComplianceKycTab';

// ─── Component ──────────────────────────────────────────────────────────────

export function ComplianceSection({ serverUrl, apiKey, pageSize = 50, authManager }: SectionProps) {
  const [activeTab, setActiveTab] = useState<ComplianceTab>('holders');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Holders state
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(true);
  const [holdersFilter, setHoldersFilter] = useState<string>('');

  // Actions state
  const [actions, setActions] = useState<ComplianceAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);

  // Report state
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  // Sweep settings state
  const [sweepSettings, setSweepSettings] = useState<SanctionsSweepSettings>({ enabled: true, batchSize: 100 });
  const [sweepLoading, setSweepLoading] = useState(true);
  const [sweepSaving, setSweepSaving] = useState(false);

  // Freeze/thaw modal state
  const [modalHolder, setModalHolder] = useState<{ holder: TokenHolder; action: 'freeze' | 'thaw' } | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [modalProcessing, setModalProcessing] = useState(false);

  // ─── Fetch functions ────────────────────────────────────────────────────

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

  const fetchHolders = useCallback(async () => {
    try {
      const statusParam = holdersFilter ? `&status=${holdersFilter}` : '';
      const data = await fetchWithAuth<{ holders: TokenHolder[] }>(
        `/admin/compliance/holders?limit=${pageSize}&offset=0${statusParam}`
      );
      setHolders(data.holders || []);
    } catch (e) {
      getLogger().error('[ComplianceSection] Failed to fetch holders:', e);
      setHolders([]);
      setFetchError('Failed to load token holders');
    } finally {
      setHoldersLoading(false);
    }
  }, [fetchWithAuth, pageSize, holdersFilter]);

  const fetchActions = useCallback(async () => {
    try {
      const data = await fetchWithAuth<{ actions: ComplianceAction[] }>(
        `/admin/compliance/actions?limit=${pageSize}&offset=0`
      );
      setActions(data.actions || []);
    } catch (e) {
      getLogger().error('[ComplianceSection] Failed to fetch actions:', e);
      setActions([]);
      setFetchError('Failed to load compliance actions');
    } finally {
      setActionsLoading(false);
    }
  }, [fetchWithAuth, pageSize]);

  const fetchSweepSettings = useCallback(async () => {
    try {
      const data = await fetchWithAuth<SanctionsSweepSettings>('/admin/compliance/sweep-settings');
      setSweepSettings(data);
    } catch (e) {
      getLogger().error('[ComplianceSection] Failed to fetch sweep settings:', e);
    } finally {
      setSweepLoading(false);
    }
  }, [fetchWithAuth]);

  const saveSweepSettings = async () => {
    setSweepSaving(true);
    try {
      await fetchWithAuth('/admin/compliance/sweep-settings', {
        method: 'PUT',
        body: JSON.stringify(sweepSettings),
      });
    } catch (e) {
      getLogger().error('[ComplianceSection] Failed to save sweep settings:', e);
      setFetchError('Failed to save sweep settings');
    } finally {
      setSweepSaving(false);
    }
  };

  useEffect(() => { fetchHolders(); }, [fetchHolders]);
  useEffect(() => { fetchActions(); }, [fetchActions]);
  useEffect(() => { fetchSweepSettings(); }, [fetchSweepSettings]);

  // ─── Freeze / Thaw ─────────────────────────────────────────────────────

  const submitFreezeThaw = async () => {
    if (!modalHolder || !modalReason.trim()) return;
    setModalProcessing(true);
    try {
      const endpoint = modalHolder.action === 'freeze'
        ? '/admin/compliance/freeze'
        : '/admin/compliance/thaw';
      await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify({ holderId: modalHolder.holder.id, reason: modalReason }),
      });
      setModalHolder(null);
      setModalReason('');
      await fetchHolders();
      await fetchActions();
    } catch (e) {
      getLogger().error(`[ComplianceSection] ${modalHolder.action} failed:`, e);
      setFetchError(`Failed to ${modalHolder.action} holder`);
    } finally {
      setModalProcessing(false);
    }
  };

  // ─── Report ─────────────────────────────────────────────────────────────

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportFrom) params.set('from', new Date(reportFrom).toISOString());
      if (reportTo) params.set('to', new Date(reportTo).toISOString());
      const data = await fetchWithAuth<{ report: ComplianceReport }>(
        `/admin/compliance/report?${params.toString()}`
      );
      setReport(data.report);
    } catch (e) {
      getLogger().error('[ComplianceSection] Failed to generate report:', e);
      setFetchError('Failed to generate compliance report');
    } finally {
      setReportLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Stats ──────────────────────────────────────────────────────────────

  const totalHolders = holders.length;
  const frozenCount = holders.filter(h => h.status === 'frozen').length;
  const activeCount = holders.filter(h => h.status === 'active').length;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="cedros-admin__page">
      <ErrorBanner message={fetchError} onRetry={() => { fetchHolders(); fetchActions(); }} />
      <StatsBar
        stats={[
          { label: 'Total Holders', value: totalHolders },
          { label: 'Active', value: activeCount, variant: 'success' },
          { label: 'Frozen', value: frozenCount, variant: frozenCount > 0 ? 'warning' : 'muted' },
          { label: 'Actions Logged', value: actions.length },
        ]}
        isLoading={holdersLoading || actionsLoading}
      />

      {/* Tab navigation */}
      <div className="cedros-admin__tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['holders', 'actions', 'reports', 'sweep-settings', 'sanctions-api', 'kyc'] as ComplianceTab[]).map(tab => {
          const label = tab === 'holders' ? 'Token Holders'
            : tab === 'actions' ? 'Actions Log'
            : tab === 'reports' ? 'Reports'
            : tab === 'sweep-settings' ? 'Sweep Settings'
            : tab === 'sanctions-api' ? 'Sanctions API'
            : 'KYC & Accreditation';
          return (
            <button
              key={tab}
              type="button"
              className={`cedros-admin__button ${activeTab === tab ? 'cedros-admin__button--primary' : 'cedros-admin__button--ghost'}`}
              onClick={() => setActiveTab(tab)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ─── Token Holders Tab ─────────────────────────────────────────── */}
      {activeTab === 'holders' && (
        <>
          <div className="cedros-admin__section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h3 className="cedros-admin__section-title">Token Holders</h3>
            <select
              value={holdersFilter}
              onChange={e => { setHoldersFilter(e.target.value); setHoldersLoading(true); }}
              className="cedros-admin__input"
              style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
              <option value="thawed">Thawed</option>
            </select>
          </div>

          {holdersLoading ? (
            <div className="cedros-admin__loading">{Icons.loading} Loading holders...</div>
          ) : holders.length === 0 ? (
            <div className="cedros-admin__empty">No token holders found.</div>
          ) : (
            <div className="cedros-admin__table-container">
              <table className="cedros-admin__table">
                <thead>
                  <tr>
                    <th>Wallet</th>
                    <th>Collection</th>
                    <th>Mint</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holders.map(h => (
                    <tr key={h.id}>
                      <td><code title={h.walletAddress}>{truncateAddress(h.walletAddress)}</code></td>
                      <td><code title={h.collectionId}>{truncateAddress(h.collectionId)}</code></td>
                      <td><code title={h.mintAddress}>{truncateAddress(h.mintAddress)}</code></td>
                      <td>{h.amountMinted}</td>
                      <td>
                        <span className={`cedros-admin__badge cedros-admin__badge--${statusBadge(h.status)}`}>
                          {h.status}
                        </span>
                      </td>
                      <td>{formatDateTime(h.createdAt)}</td>
                      <td>
                        {h.status === 'active' || h.status === 'thawed' ? (
                          <button
                            className="cedros-admin__button cedros-admin__button--danger cedros-admin__button--sm"
                            onClick={() => { setModalHolder({ holder: h, action: 'freeze' }); setModalReason(''); }}
                          >
                            Freeze
                          </button>
                        ) : h.status === 'frozen' ? (
                          <button
                            className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--sm"
                            onClick={() => { setModalHolder({ holder: h, action: 'thaw' }); setModalReason(''); }}
                          >
                            Thaw
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── Actions Log Tab ───────────────────────────────────────────── */}
      {activeTab === 'actions' && (
        <>
          <div className="cedros-admin__section-header">
            <h3 className="cedros-admin__section-title">Compliance Actions</h3>
          </div>

          {actionsLoading ? (
            <div className="cedros-admin__loading">{Icons.loading} Loading actions...</div>
          ) : actions.length === 0 ? (
            <div className="cedros-admin__empty">No compliance actions recorded.</div>
          ) : (
            <div className="cedros-admin__table-container">
              <table className="cedros-admin__table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Wallet</th>
                    <th>Reason</th>
                    <th>Actor</th>
                    <th>Tx Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map(a => (
                    <tr key={a.id}>
                      <td>{formatDateTime(a.createdAt)}</td>
                      <td>
                        <span className={`cedros-admin__badge cedros-admin__badge--${actionBadge(a.actionType)}`}>
                          {a.actionType}
                        </span>
                      </td>
                      <td><code title={a.walletAddress}>{truncateAddress(a.walletAddress)}</code></td>
                      <td>{a.reason || '\u2014'}</td>
                      <td><code>{truncateAddress(a.actor)}</code></td>
                      <td>
                        {a.txSignature ? (
                          <a
                            href={`${SOLANA_EXPLORER}${a.txSignature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cedros-admin__link"
                          >
                            {truncateAddress(a.txSignature)}
                          </a>
                        ) : '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── Reports Tab ───────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <>
          <div className="cedros-admin__section-header">
            <h3 className="cedros-admin__section-title">Compliance Report</h3>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
              From
              <input type="date" className="cedros-admin__input" value={reportFrom} onChange={e => setReportFrom(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
              To
              <input type="date" className="cedros-admin__input" value={reportTo} onChange={e => setReportTo(e.target.value)} />
            </label>
            <button
              className="cedros-admin__button cedros-admin__button--primary"
              onClick={generateReport}
              disabled={reportLoading}
            >
              {reportLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>

          {report && (
            <div>
              <StatsBar
                stats={[
                  { label: 'Total Holders', value: report.totalHolders },
                  { label: 'Frozen', value: report.totalFrozen, variant: report.totalFrozen > 0 ? 'warning' : 'muted' },
                  { label: 'Freezes', value: report.freezeCount },
                  { label: 'Thaws', value: report.thawCount },
                  { label: 'Sweep Freezes', value: report.sweepFreezeCount, variant: report.sweepFreezeCount > 0 ? 'warning' : 'muted' },
                ]}
                isLoading={false}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--cedros-admin-text-muted, #888)' }}>
                  Generated {formatDateTime(report.generatedAt)} &middot; {report.actionsInPeriod} actions in period
                </span>
                <button className="cedros-admin__button cedros-admin__button--ghost" onClick={downloadReport}>
                  Download JSON
                </button>
              </div>

              {report.actions.length > 0 && (
                <div className="cedros-admin__table-container">
                  <table className="cedros-admin__table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Type</th>
                        <th>Wallet</th>
                        <th>Reason</th>
                        <th>Actor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.actions.map(a => (
                        <tr key={a.id}>
                          <td>{formatDateTime(a.createdAt)}</td>
                          <td>
                            <span className={`cedros-admin__badge cedros-admin__badge--${actionBadge(a.actionType)}`}>
                              {a.actionType}
                            </span>
                          </td>
                          <td><code title={a.walletAddress}>{truncateAddress(a.walletAddress)}</code></td>
                          <td>{a.reason || '\u2014'}</td>
                          <td><code>{truncateAddress(a.actor)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Sweep Settings Tab ──────────────────────────────────────── */}
      {activeTab === 'sweep-settings' && (
        <>
          <div className="cedros-admin__section-header">
            <h3 className="cedros-admin__section-title">Sanctions Sweep Settings</h3>
          </div>

          {sweepLoading ? (
            <div className="cedros-admin__loading">{Icons.loading} Loading settings...</div>
          ) : (
            <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={sweepSettings.enabled}
                  onChange={e => setSweepSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                Enable automated sanctions sweep
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                Batch size (1 – 10,000)
                <input
                  type="number"
                  className="cedros-admin__input"
                  min={1}
                  max={10000}
                  value={sweepSettings.batchSize}
                  onChange={e => setSweepSettings(prev => ({ ...prev, batchSize: Number(e.target.value) }))}
                  style={{ width: '160px' }}
                />
              </label>

              <button
                className="cedros-admin__button cedros-admin__button--primary"
                onClick={saveSweepSettings}
                disabled={sweepSaving}
                style={{ alignSelf: 'flex-start' }}
              >
                {sweepSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ─── Sanctions API Tab ──────────────────────────────────────── */}
      {activeTab === 'sanctions-api' && (
        <ComplianceSanctionsApi serverUrl={serverUrl} apiKey={apiKey} authManager={authManager} />
      )}

      {/* ─── KYC & Accreditation Tab ────────────────────────────────── */}
      {activeTab === 'kyc' && (
        <ComplianceKycTab serverUrl={serverUrl} apiKey={apiKey} authManager={authManager} />
      )}

      {/* ─── Freeze/Thaw Modal ─────────────────────────────────────────── */}
      {modalHolder && (
        <div className="cedros-admin__modal-overlay" onClick={() => !modalProcessing && setModalHolder(null)}>
          <div className="cedros-admin__modal" onClick={e => e.stopPropagation()}>
            <div className="cedros-admin__modal-header">
              <h4 className="cedros-admin__modal-title">
                {modalHolder.action === 'freeze' ? 'Freeze' : 'Thaw'} Token Account
              </h4>
              <button
                type="button"
                className="cedros-admin__modal-close"
                onClick={() => !modalProcessing && setModalHolder(null)}
              >
                {Icons.close}
              </button>
            </div>
            <div className="cedros-admin__modal-body">
              <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Wallet: <code>{truncateAddress(modalHolder.holder.walletAddress)}</code>
              </p>
              <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                Mint: <code>{truncateAddress(modalHolder.holder.mintAddress)}</code>
              </p>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                Reason (required)
                <textarea
                  className="cedros-admin__input"
                  rows={3}
                  value={modalReason}
                  onChange={e => setModalReason(e.target.value)}
                  placeholder={`Reason for ${modalHolder.action}...`}
                  maxLength={1024}
                />
              </label>
            </div>
            <div className="cedros-admin__modal-footer">
              <button
                className="cedros-admin__button cedros-admin__button--ghost"
                onClick={() => setModalHolder(null)}
                disabled={modalProcessing}
              >
                Cancel
              </button>
              <button
                className={`cedros-admin__button ${modalHolder.action === 'freeze' ? 'cedros-admin__button--danger' : 'cedros-admin__button--primary'}`}
                onClick={submitFreezeThaw}
                disabled={modalProcessing || !modalReason.trim()}
              >
                {modalProcessing ? 'Processing...' : modalHolder.action === 'freeze' ? 'Freeze Account' : 'Thaw Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
