/**
 * Admin Dashboard — Customers Section
 *
 * List, search, create, and view customer records.
 * Server: GET /admin/customers, GET /admin/customers/:id,
 *         POST /admin/customers, PUT /admin/customers/:id
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomerAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface Customer {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  phone?: string;
  addresses: CustomerAddress[];
  createdAt: string;
  updatedAt: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CustomersSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({ email: '', name: '', phone: '' });

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

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await fetchWithAuth<{ customers: Customer[] }>(
        `/admin/customers?limit=${pageSize}&offset=${offset}`
      );
      setCustomers(data.customers ?? []);
    } catch {
      setFetchError('Failed to load customers');
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, pageSize, offset]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const resetForm = () => {
    setFormData({ email: '', name: '', phone: '' });
    setEditingCustomer(null);
    setShowForm(false);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({ email: c.email, name: c.name ?? '', phone: c.phone ?? '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFetchError(null);
    try {
      if (editingCustomer) {
        await fetchWithAuth(`/admin/customers/${encodeURIComponent(editingCustomer.id)}`, {
          method: 'PUT',
          body: JSON.stringify({
            email: formData.email,
            name: formData.name || null,
            phone: formData.phone || null,
            addresses: editingCustomer.addresses,
          }),
        });
      } else {
        await fetchWithAuth('/admin/customers', {
          method: 'POST',
          body: JSON.stringify({
            email: formData.email,
            name: formData.name || null,
            phone: formData.phone || null,
            addresses: [],
          }),
        });
      }
      resetForm();
      fetchCustomers();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client-side search filter
  const filtered = searchQuery.trim()
    ? customers.filter((c) => {
        const q = searchQuery.toLowerCase();
        return c.email.toLowerCase().includes(q)
          || (c.name ?? '').toLowerCase().includes(q)
          || c.id.toLowerCase().includes(q);
      })
    : customers;

  const formatAddress = (addr: CustomerAddress): string => {
    return [addr.line1, addr.city, addr.state, addr.postalCode, addr.country]
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div>
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Customers</h3>
        <button
          type="button"
          className="cedros-admin__button cedros-admin__button--primary"
          onClick={() => { resetForm(); setShowForm(true); }}
        >
          + Add Customer
        </button>
      </div>

      <ErrorBanner message={fetchError} />

      {/* Search */}
      <div style={{ marginBottom: '1rem', maxWidth: '400px' }}>
        <input
          type="text"
          className="cedros-admin__input"
          placeholder="Search by email, name, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ fontSize: '0.85rem' }}
        />
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          border: '1px solid var(--cedros-admin-border, #e0e0e0)',
          borderRadius: '4px',
          padding: '1rem',
          marginBottom: '1.5rem',
          maxWidth: '500px',
        }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
            {editingCustomer ? 'Edit Customer' : 'New Customer'}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Email *</label>
              <input
                type="email"
                className="cedros-admin__input"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                required
                placeholder="customer@example.com"
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Name</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Phone</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="cedros-admin__button cedros-admin__button--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingCustomer ? 'Update' : 'Create'}
            </button>
            <button type="button" className="cedros-admin__button cedros-admin__button--ghost" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading customers...</div>
      ) : filtered.length === 0 ? (
        <div className="cedros-admin__empty">{searchQuery ? 'No matching customers.' : 'No customers found.'}</div>
      ) : (
        <>
          <div className="cedros-admin__table-container">
            <table className="cedros-admin__table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>{c.email}</td>
                    <td>{c.name ?? <span style={{ color: 'var(--cedros-admin-text-muted, #888)' }}>—</span>}</td>
                    <td>{c.phone ?? <span style={{ color: 'var(--cedros-admin-text-muted, #888)' }}>—</span>}</td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.addresses.length > 0 ? formatAddress(c.addresses[0]!) : '—'}
                    </td>
                    <td>{formatDateTime(c.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
            >
              Previous
            </button>
            <span>Showing {filtered.length} customer{filtered.length !== 1 ? 's' : ''}</span>
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
              disabled={customers.length < pageSize}
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
