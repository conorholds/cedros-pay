/**
 * KYC & Accredited Investor tab for the Compliance section.
 *
 * Allows admins to look up a user's KYC verification status and
 * accredited investor status via the cedros-login proxy endpoint.
 */

import { useState, useCallback } from 'react';
import { Icons } from './icons';
import type { SectionProps } from './types';
import type { UserComplianceStatus, KycStatus } from './complianceTypes';
import { kycBadge } from './complianceTypes';
import { getLogger } from '../../utils/logger';
import { formatDateTime } from '../../utils/dateHelpers';

export function ComplianceKycTab({ serverUrl, apiKey, authManager }: SectionProps) {
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UserComplianceStatus | null>(null);
  const [searched, setSearched] = useState(false);

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

  const lookupUser = async () => {
    const trimmed = searchId.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);
    try {
      const data = await fetchWithAuth<UserComplianceStatus>(
        `/admin/compliance/user-status/${encodeURIComponent(trimmed)}`
      );
      setResult(data);
    } catch (e) {
      getLogger().error('[ComplianceKycTab] Lookup failed:', e);
      setError('Failed to fetch user compliance status. Ensure cedros-login is configured.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') lookupUser();
  };

  const kycLabel = (status: KycStatus): string => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'pending': return 'Pending';
      case 'expired': return 'Expired';
      case 'none': default: return 'Not Started';
    }
  };

  return (
    <div>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">KYC & Accredited Investor Status</h3>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--cedros-admin-text-muted, #888)', marginBottom: '1rem' }}>
        Look up a user's KYC verification and accredited investor status from cedros-login.
      </p>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '1.5rem', maxWidth: '500px' }}>
        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          User ID
          <input
            type="text"
            className="cedros-admin__input"
            placeholder="user_abc123"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </label>
        <button
          className="cedros-admin__button cedros-admin__button--primary"
          onClick={lookupUser}
          disabled={loading || !searchId.trim()}
        >
          {loading ? 'Looking up...' : 'Look Up'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="cedros-admin__badge cedros-admin__badge--failed" style={{ padding: '0.5rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="cedros-admin__loading">{Icons.loading} Fetching compliance status...</div>
      )}

      {/* Result */}
      {result && !loading && (
        <div style={{ maxWidth: '500px' }}>
          <div className="cedros-admin__table-container">
            <table className="cedros-admin__table">
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, width: '40%' }}>User ID</td>
                  <td><code>{result.userId}</code></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>KYC Status</td>
                  <td>
                    <span className={`cedros-admin__badge cedros-admin__badge--${kycBadge(result.kycStatus)}`}>
                      {kycLabel(result.kycStatus)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Accredited Investor</td>
                  <td>
                    <span className={`cedros-admin__badge cedros-admin__badge--${result.accreditedInvestor ? 'success' : 'muted'}`}>
                      {result.accreditedInvestor ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
                {result.accreditedVerifiedAt && (
                  <tr>
                    <td style={{ fontWeight: 600 }}>Accredited Since</td>
                    <td>{formatDateTime(result.accreditedVerifiedAt)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary message */}
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem',
            background: result.kycStatus === 'verified' ? 'var(--cedros-admin-bg-success, #f0fdf4)' : 'var(--cedros-admin-bg-muted, #f5f5f5)',
            color: 'var(--cedros-admin-text, #333)' }}>
            {result.kycStatus === 'verified' && result.accreditedInvestor
              ? 'This user is fully verified and accredited. They can access all compliance-gated products.'
              : result.kycStatus === 'verified'
              ? 'This user has KYC verification but is not an accredited investor.'
              : result.kycStatus === 'pending'
              ? 'This user has submitted KYC documents. Verification is in progress.'
              : result.kycStatus === 'expired'
              ? 'This user\'s KYC verification has expired. They will need to re-verify.'
              : 'This user has not started KYC verification.'}
          </div>
        </div>
      )}

      {/* No result after search */}
      {searched && !result && !loading && !error && (
        <div className="cedros-admin__empty">No compliance record found for this user.</div>
      )}
    </div>
  );
}
