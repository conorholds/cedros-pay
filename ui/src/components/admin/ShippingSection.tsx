/**
 * Admin Dashboard — Shipping Section
 *
 * List shipping profiles; click to view/manage rates per profile.
 * Create/edit profiles and rates, delete both.
 * Server: GET/POST/PUT/DELETE /admin/shipping/profiles,
 *         GET/POST /admin/shipping/profiles/:id/rates,
 *         PUT/DELETE /admin/shipping/rates/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ShippingProfile {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  countries: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShippingRate {
  id: string;
  tenantId: string;
  profileId: string;
  name: string;
  rateType: 'flat' | 'price' | 'weight';
  amountAtomic: number;
  currency: string;
  minSubtotal?: number;
  maxSubtotal?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProfileForm { name: string; description: string; countries: string; active: boolean; }
interface RateForm { name: string; rateType: 'flat' | 'price' | 'weight'; amountAtomic: string; currency: string; minSubtotal: string; maxSubtotal: string; active: boolean; }

const BLANK_PROFILE: ProfileForm = { name: '', description: '', countries: '', active: true };
const BLANK_RATE: RateForm = { name: '', rateType: 'flat', amountAtomic: '', currency: 'USD', minSubtotal: '', maxSubtotal: '', active: true };

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtAtomic = (amount: number, currency: string): string =>
  `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;

// ─── Component ──────────────────────────────────────────────────────────────

export function ShippingSection({ serverUrl, apiKey, authManager }: SectionProps) {
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ShippingProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(BLANK_PROFILE);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState<ShippingProfile | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);

  const [showRateForm, setShowRateForm] = useState(false);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [rateForm, setRateForm] = useState<RateForm>(BLANK_RATE);
  const [isSavingRate, setIsSavingRate] = useState(false);

  // ─── Auth helper ──────────────────────────────────────────────────────

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

  // ─── Profiles ────────────────────────────────────────────────────────

  const fetchProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    setFetchError(null);
    try {
      const data = await fetchWithAuth<{ profiles: ShippingProfile[] }>('/admin/shipping/profiles?limit=50&offset=0');
      setProfiles(data.profiles ?? []);
    } catch {
      setFetchError('Failed to load shipping profiles');
      setProfiles([]);
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const openEditProfile = (p: ShippingProfile) => {
    setEditingProfile(p);
    setProfileForm({ name: p.name, description: p.description ?? '', countries: p.countries.join(', '), active: p.active });
    setShowProfileForm(true);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setActionError(null);
    try {
      const body = {
        name: profileForm.name,
        description: profileForm.description || undefined,
        countries: profileForm.countries.split(',').map((c) => c.trim()).filter(Boolean),
        active: profileForm.active,
      };
      if (editingProfile) {
        await fetchWithAuth(`/admin/shipping/profiles/${encodeURIComponent(editingProfile.id)}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await fetchWithAuth('/admin/shipping/profiles', { method: 'POST', body: JSON.stringify(body) });
      }
      setShowProfileForm(false);
      setEditingProfile(null);
      fetchProfiles();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!window.confirm('Delete this shipping profile?')) return;
    setActionError(null);
    try {
      await fetchWithAuth(`/admin/shipping/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' });
      fetchProfiles();
    } catch {
      setActionError('Failed to delete profile');
    }
  };

  // ─── Rates ───────────────────────────────────────────────────────────

  const loadRates = useCallback(async (profile: ShippingProfile) => {
    setIsLoadingRates(true);
    setFetchError(null);
    try {
      const data = await fetchWithAuth<{ rates: ShippingRate[] }>(
        `/admin/shipping/profiles/${encodeURIComponent(profile.id)}/rates?limit=50&offset=0`
      );
      setRates(data.rates ?? []);
    } catch {
      setFetchError('Failed to load rates');
      setRates([]);
    } finally {
      setIsLoadingRates(false);
    }
  }, [fetchWithAuth]);

  const openProfile = (profile: ShippingProfile) => {
    setSelectedProfile(profile);
    setShowRateForm(false);
    setEditingRate(null);
    loadRates(profile);
  };

  const openEditRate = (r: ShippingRate) => {
    setEditingRate(r);
    setRateForm({
      name: r.name, rateType: r.rateType, amountAtomic: String(r.amountAtomic), currency: r.currency,
      minSubtotal: r.minSubtotal != null ? String(r.minSubtotal) : '',
      maxSubtotal: r.maxSubtotal != null ? String(r.maxSubtotal) : '',
      active: r.active,
    });
    setShowRateForm(true);
  };

  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    setIsSavingRate(true);
    setActionError(null);
    try {
      const body = {
        name: rateForm.name, rateType: rateForm.rateType, amountAtomic: parseInt(rateForm.amountAtomic, 10),
        currency: rateForm.currency, active: rateForm.active, profileId: selectedProfile.id,
        minSubtotal: rateForm.minSubtotal ? parseInt(rateForm.minSubtotal, 10) : undefined,
        maxSubtotal: rateForm.maxSubtotal ? parseInt(rateForm.maxSubtotal, 10) : undefined,
      };
      if (editingRate) {
        await fetchWithAuth(`/admin/shipping/rates/${encodeURIComponent(editingRate.id)}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await fetchWithAuth(`/admin/shipping/profiles/${encodeURIComponent(selectedProfile.id)}/rates`, { method: 'POST', body: JSON.stringify(body) });
      }
      setShowRateForm(false);
      setEditingRate(null);
      loadRates(selectedProfile);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save rate');
    } finally {
      setIsSavingRate(false);
    }
  };

  const deleteRate = async (id: string) => {
    if (!window.confirm('Delete this rate?') || !selectedProfile) return;
    setActionError(null);
    try {
      await fetchWithAuth(`/admin/shipping/rates/${encodeURIComponent(id)}`, { method: 'DELETE' });
      loadRates(selectedProfile);
    } catch {
      setActionError('Failed to delete rate');
    }
  };

  // ─── Profile detail view ─────────────────────────────────────────────

  if (selectedProfile) {
    return (
      <div>
        <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
          onClick={() => { setSelectedProfile(null); setShowRateForm(false); setFetchError(null); setActionError(null); }}
          style={{ marginBottom: '1rem' }}>
          &larr; Back to profiles
        </button>

        <div className="cedros-admin__section-header">
          <h3 className="cedros-admin__section-title">
            {selectedProfile.name}
            <span className={`cedros-admin__badge cedros-admin__badge--${selectedProfile.active ? 'success' : 'muted'}`} style={{ marginLeft: '0.5rem' }}>
              {selectedProfile.active ? 'Active' : 'Inactive'}
            </span>
          </h3>
          <button type="button" className="cedros-admin__button cedros-admin__button--primary" onClick={() => { setEditingRate(null); setRateForm(BLANK_RATE); setShowRateForm(true); }}>
            + Add Rate
          </button>
        </div>

        <ErrorBanner message={fetchError} />
        <ErrorBanner message={actionError} />

        <p style={{ fontSize: '0.8rem', color: 'var(--cedros-admin-text-muted, #888)', margin: '0 0 1rem' }}>
          {selectedProfile.description && <>{selectedProfile.description} &middot; </>}
          Countries: {selectedProfile.countries.length > 0 ? selectedProfile.countries.join(', ') : 'All'}
        </p>

        {showRateForm && (
          <form onSubmit={saveRate} style={{ border: '1px solid var(--cedros-admin-border, #e0e0e0)', borderRadius: '4px', padding: '1rem', marginBottom: '1.5rem', maxWidth: '520px' }}>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>{editingRate ? 'Edit Rate' : 'New Rate'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="cedros-admin__field">
                <label className="cedros-admin__field-label">Name *</label>
                <input type="text" className="cedros-admin__input" required value={rateForm.name}
                  onChange={(e) => setRateForm((p) => ({ ...p, name: e.target.value }))} placeholder="Standard Shipping" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="cedros-admin__field" style={{ flex: 1 }}>
                  <label className="cedros-admin__field-label">Rate Type *</label>
                  <select className="cedros-admin__input" value={rateForm.rateType}
                    onChange={(e) => setRateForm((p) => ({ ...p, rateType: e.target.value as RateForm['rateType'] }))}>
                    <option value="flat">Flat</option>
                    <option value="price">Price-based</option>
                    <option value="weight">Weight-based</option>
                  </select>
                </div>
                <div className="cedros-admin__field" style={{ flex: 1 }}>
                  <label className="cedros-admin__field-label">Amount (atomic) *</label>
                  <input type="number" className="cedros-admin__input" required min={0} value={rateForm.amountAtomic}
                    onChange={(e) => setRateForm((p) => ({ ...p, amountAtomic: e.target.value }))} placeholder="500" />
                </div>
                <div className="cedros-admin__field" style={{ width: '80px' }}>
                  <label className="cedros-admin__field-label">Currency</label>
                  <input type="text" className="cedros-admin__input" value={rateForm.currency} maxLength={3}
                    onChange={(e) => setRateForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} placeholder="USD" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="cedros-admin__field" style={{ flex: 1 }}>
                  <label className="cedros-admin__field-label">Min Subtotal</label>
                  <input type="number" className="cedros-admin__input" min={0} value={rateForm.minSubtotal}
                    onChange={(e) => setRateForm((p) => ({ ...p, minSubtotal: e.target.value }))} placeholder="0" />
                </div>
                <div className="cedros-admin__field" style={{ flex: 1 }}>
                  <label className="cedros-admin__field-label">Max Subtotal</label>
                  <input type="number" className="cedros-admin__input" min={0} value={rateForm.maxSubtotal}
                    onChange={(e) => setRateForm((p) => ({ ...p, maxSubtotal: e.target.value }))} placeholder="10000" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="rate-active" checked={rateForm.active}
                  onChange={(e) => setRateForm((p) => ({ ...p, active: e.target.checked }))} />
                <label htmlFor="rate-active" className="cedros-admin__field-label" style={{ margin: 0 }}>Active</label>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="cedros-admin__button cedros-admin__button--primary" disabled={isSavingRate}>
                {isSavingRate ? 'Saving...' : editingRate ? 'Update' : 'Create'}
              </button>
              <button type="button" className="cedros-admin__button cedros-admin__button--ghost"
                onClick={() => { setShowRateForm(false); setEditingRate(null); }}>Cancel</button>
            </div>
          </form>
        )}

        {isLoadingRates ? (
          <div className="cedros-admin__loading">{Icons.loading} Loading rates...</div>
        ) : rates.length === 0 ? (
          <div className="cedros-admin__empty">No rates yet. Add one above.</div>
        ) : (
          <div className="cedros-admin__table-container">
            <table className="cedros-admin__table">
              <thead>
                <tr><th>Name</th><th>Type</th><th>Amount</th><th>Min / Max Subtotal</th><th>Status</th><th>Updated</th><th></th></tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td style={{ fontSize: '0.85rem' }}>{r.rateType}</td>
                    <td style={{ fontSize: '0.85rem' }}>{fmtAtomic(r.amountAtomic, r.currency)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--cedros-admin-text-muted, #888)' }}>
                      {r.minSubtotal != null ? fmtAtomic(r.minSubtotal, r.currency) : '—'}
                      {' / '}
                      {r.maxSubtotal != null ? fmtAtomic(r.maxSubtotal, r.currency) : '—'}
                    </td>
                    <td>
                      <span className={`cedros-admin__badge cedros-admin__badge--${r.active ? 'success' : 'muted'}`}>
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDateTime(r.updatedAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm" onClick={() => openEditRate(r)}>Edit</button>
                        <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                          onClick={() => deleteRate(r.id)} style={{ color: 'var(--cedros-admin-danger, #c00)' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ─── Profiles list view ──────────────────────────────────────────────

  return (
    <div>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Shipping</h3>
        <button type="button" className="cedros-admin__button cedros-admin__button--primary"
          onClick={() => { setEditingProfile(null); setProfileForm(BLANK_PROFILE); setShowProfileForm(true); }}>
          + Add Profile
        </button>
      </div>

      <ErrorBanner message={fetchError} />
      <ErrorBanner message={actionError} />

      {showProfileForm && (
        <form onSubmit={saveProfile} style={{ border: '1px solid var(--cedros-admin-border, #e0e0e0)', borderRadius: '4px', padding: '1rem', marginBottom: '1.5rem', maxWidth: '500px' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>{editingProfile ? 'Edit Profile' : 'New Profile'}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Name *</label>
              <input type="text" className="cedros-admin__input" required value={profileForm.name}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} placeholder="Domestic Shipping" />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Description</label>
              <input type="text" className="cedros-admin__input" value={profileForm.description}
                onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Countries (comma-separated ISO codes)</label>
              <input type="text" className="cedros-admin__input" value={profileForm.countries}
                onChange={(e) => setProfileForm((p) => ({ ...p, countries: e.target.value }))} placeholder="US, CA, GB" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="profile-active" checked={profileForm.active}
                onChange={(e) => setProfileForm((p) => ({ ...p, active: e.target.checked }))} />
              <label htmlFor="profile-active" className="cedros-admin__field-label" style={{ margin: 0 }}>Active</label>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="cedros-admin__button cedros-admin__button--primary" disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving...' : editingProfile ? 'Update' : 'Create'}
            </button>
            <button type="button" className="cedros-admin__button cedros-admin__button--ghost"
              onClick={() => { setShowProfileForm(false); setEditingProfile(null); }}>Cancel</button>
          </div>
        </form>
      )}

      {isLoadingProfiles ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading profiles...</div>
      ) : profiles.length === 0 ? (
        <div className="cedros-admin__empty">No shipping profiles found.</div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr><th>Name</th><th>Countries</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, color: 'var(--cedros-admin-text, #333)', fontSize: '0.9rem' }}
                      onClick={() => openProfile(p)}>
                      {p.name}
                    </button>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--cedros-admin-text-muted, #888)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.countries.length > 0 ? p.countries.join(', ') : 'All'}
                  </td>
                  <td>
                    <span className={`cedros-admin__badge cedros-admin__badge--${p.active ? 'success' : 'muted'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{formatDateTime(p.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm" onClick={() => openProfile(p)}>Rates</button>
                      <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm" onClick={() => openEditProfile(p)}>Edit</button>
                      <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                        onClick={() => deleteProfile(p.id)} style={{ color: 'var(--cedros-admin-danger, #c00)' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
