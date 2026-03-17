/**
 * Admin Dashboard — Tax Rates Section
 *
 * List, create, edit, and delete tax rates.
 * Server: GET /admin/tax/rates, GET /admin/tax/rates/:id,
 *         POST /admin/tax/rates, PUT /admin/tax/rates/:id,
 *         DELETE /admin/tax/rates/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TaxRate {
  id: string;
  tenantId: string;
  name: string;
  country: string;
  region?: string;
  rateBps: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaxRateForm {
  name: string;
  country: string;
  region: string;
  ratePercent: string;
  active: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert basis points to display string: 825 → "8.25%" */
const bpsToPercent = (bps: number): string => (bps / 100).toFixed(2) + '%';

/** Convert percentage string to basis points: "8.25" → 825 */
const percentToBps = (pct: string): number => Math.round(parseFloat(pct) * 100);

const EMPTY_FORM: TaxRateForm = { name: '', country: '', region: '', ratePercent: '', active: true };

// ─── Component ──────────────────────────────────────────────────────────────

export function TaxSection({ serverUrl, apiKey, pageSize = 50, authManager }: SectionProps) {
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [formData, setFormData] = useState<TaxRateForm>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', String(pageSize));
      qs.set('offset', String(offset));

      const data = await fetchWithAuth<{ rates: TaxRate[] }>(`/admin/tax/rates?${qs.toString()}`);
      setRates(data.rates ?? []);
    } catch {
      setFetchError('Failed to load tax rates');
      setRates([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, pageSize, offset]);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingRate(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setEditingRate(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (rate: TaxRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      country: rate.country,
      region: rate.region ?? '',
      ratePercent: (rate.rateBps / 100).toFixed(2),
      active: rate.active,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateValue = parseFloat(formData.ratePercent);
    if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
      setFetchError('Rate must be a number between 0 and 100');
      return;
    }
    setIsSubmitting(true);
    setFetchError(null);
    try {
      const body = {
        name: formData.name.trim(),
        country: formData.country.trim().toUpperCase(),
        region: formData.region.trim() || undefined,
        rateBps: percentToBps(formData.ratePercent),
        active: formData.active,
      };
      if (editingRate) {
        await fetchWithAuth(`/admin/tax/rates/${encodeURIComponent(editingRate.id)}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
      } else {
        await fetchWithAuth('/admin/tax/rates', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      resetForm();
      fetchRates();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to save tax rate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setDeletingId(id);
    setFetchError(null);
    try {
      await fetchWithAuth(`/admin/tax/rates/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setConfirmDeleteId(null);
      fetchRates();
    } catch {
      setFetchError('Failed to delete tax rate');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Tax Rates</h3>
        <button
          type="button"
          className="cedros-admin__button cedros-admin__button--primary"
          onClick={openCreate}
        >
          + Add Rate
        </button>
      </div>

      <ErrorBanner message={fetchError} />

      {/* Create / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: '1px solid var(--cedros-admin-border, #e0e0e0)',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '1.5rem',
            maxWidth: '500px',
          }}
        >
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
            {editingRate ? 'Edit Tax Rate' : 'New Tax Rate'}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Name *</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="e.g. US Sales Tax"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="cedros-admin__field" style={{ flex: 1 }}>
                <label className="cedros-admin__field-label">Country (2-letter) *</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={formData.country}
                  onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value.toUpperCase().slice(0, 2) }))}
                  required
                  maxLength={2}
                  placeholder="US"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="cedros-admin__field" style={{ flex: 1 }}>
                <label className="cedros-admin__field-label">Region (optional)</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={formData.region}
                  onChange={(e) => setFormData((p) => ({ ...p, region: e.target.value }))}
                  placeholder="e.g. CA"
                />
              </div>
            </div>

            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Rate (%) *</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={formData.ratePercent}
                onChange={(e) => setFormData((p) => ({ ...p, ratePercent: e.target.value }))}
                required
                min="0"
                max="100"
                step="0.01"
                placeholder="8.25"
                style={{ maxWidth: '140px' }}
              />
              {formData.ratePercent && !isNaN(parseFloat(formData.ratePercent)) && (
                <span style={{ fontSize: '0.8rem', color: 'var(--cedros-admin-text-muted, #888)', marginLeft: '0.5rem' }}>
                  = {percentToBps(formData.ratePercent)} bps
                </span>
              )}
            </div>

            <div className="cedros-admin__field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData((p) => ({ ...p, active: e.target.checked }))}
                />
                Active
              </label>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              className="cedros-admin__button cedros-admin__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingRate ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost"
              onClick={resetForm}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading tax rates...</div>
      ) : rates.length === 0 ? (
        <div className="cedros-admin__empty">No tax rates configured.</div>
      ) : (
        <>
          <div className="cedros-admin__table-container">
            <table className="cedros-admin__table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Country</th>
                  <th>Region</th>
                  <th>Rate</th>
                  <th>Active</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.id}>
                    <td>{rate.name}</td>
                    <td style={{ fontWeight: 500 }}>{rate.country.toUpperCase()}</td>
                    <td>{rate.region ?? <span style={{ color: 'var(--cedros-admin-text-muted, #888)' }}>—</span>}</td>
                    <td>{bpsToPercent(rate.rateBps)}</td>
                    <td>
                      <span className={`cedros-admin__badge cedros-admin__badge--${rate.active ? 'success' : 'muted'}`}>
                        {rate.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDateTime(rate.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          type="button"
                          className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                          onClick={() => openEdit(rate)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                          style={confirmDeleteId === rate.id ? { color: 'var(--cedros-admin-error, #e53e3e)' } : undefined}
                          disabled={deletingId === rate.id}
                          onClick={() => handleDelete(rate.id)}
                          onBlur={() => setConfirmDeleteId(null)}
                        >
                          {deletingId === rate.id
                            ? 'Deleting...'
                            : confirmDeleteId === rate.id
                              ? 'Confirm?'
                              : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
            >
              Previous
            </button>
            <span>Showing {rates.length} rate{rates.length !== 1 ? 's' : ''}</span>
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
              disabled={rates.length < pageSize}
              onClick={() => setOffset(offset + pageSize)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
