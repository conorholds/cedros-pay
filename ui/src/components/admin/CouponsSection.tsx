/**
 * Coupons Section Component
 *
 * Admin dashboard component for managing discount coupons.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import { FormDropdown } from './Dropdown';
import type { SectionProps, Coupon, CouponScope, CouponPaymentMethod, CouponAppliesAt } from './types';
import { getLogger } from '../../utils/logger';

export function CouponsSection({ serverUrl, apiKey, pageSize = 20, authManager }: SectionProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: 'code' | 'discount' | 'usage' | 'status'; direction: 'asc' | 'desc' } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    usageLimit: undefined as number | undefined,
    expiresAt: '' as string,
    // Scope and targeting
    scope: 'all_products' as CouponScope,
    productIdsCsv: '',
    categoryIdsCsv: '',
    // Payment and application
    paymentMethod: 'any' as CouponPaymentMethod,
    autoApply: false,
    appliesAt: 'both' as CouponAppliesAt,
    startsAt: '' as string,
    // Advanced fields
    minimumAmountUsd: '' as '' | number,
    usageLimitPerCustomer: undefined as number | undefined,
    firstPurchaseOnly: false,
  });

  const fetchCoupons = useCallback(async () => {
    try {
      setFetchError(null);
      let data: { coupons: Coupon[] };
      const path = `/admin/coupons?limit=${pageSize}`;

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<{ coupons: Coupon[] }>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;

        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch coupons: ${res.status}`);
        data = await res.json();
      }

      setCoupons(data.coupons || []);
    } catch (error) {
      getLogger().error('[CouponsSection] Failed to fetch coupons:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
        hasApiKey: !!apiKey,
      });
      setCoupons([]);
      setFetchError('Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, apiKey, pageSize, authManager]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || newCoupon.discountValue <= 0) return;

    setIsSubmitting(true);
    try {
      // Convert USD to cents for minimum amount
      const minimumAmountCents = newCoupon.minimumAmountUsd
        ? Math.round(Number(newCoupon.minimumAmountUsd) * 100)
        : undefined;

      // Parse product IDs from CSV
      const productIds = newCoupon.productIdsCsv
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      // Parse category IDs from CSV
      const categoryIds = newCoupon.categoryIdsCsv
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      const payload = {
        code: newCoupon.code,
        discountType: newCoupon.discountType,
        discountValue: newCoupon.discountValue,
        usageLimit: newCoupon.usageLimit,
        active: true,
        usageCount: 0,
        // Scope and targeting
        scope: newCoupon.scope,
        ...(productIds.length ? { productIds } : {}),
        ...(categoryIds.length ? { categoryIds } : {}),
        // Payment and application
        ...(newCoupon.paymentMethod !== 'any' ? { paymentMethod: newCoupon.paymentMethod } : {}),
        ...(newCoupon.autoApply ? { autoApply: true } : {}),
        ...(newCoupon.appliesAt !== 'both' ? { appliesAt: newCoupon.appliesAt } : {}),
        ...(newCoupon.startsAt ? { startsAt: newCoupon.startsAt } : {}),
        ...(newCoupon.expiresAt ? { expiresAt: newCoupon.expiresAt } : {}),
        // Advanced
        ...(minimumAmountCents ? { minimumAmountCents } : {}),
        ...(newCoupon.usageLimitPerCustomer ? { usageLimitPerCustomer: newCoupon.usageLimitPerCustomer } : {}),
        ...(newCoupon.firstPurchaseOnly ? { firstPurchaseOnly: true } : {}),
      };

      if (authManager?.isAuthenticated()) {
        await authManager.fetchWithAuth('/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}/admin/coupons`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Failed to create coupon: ${res.status}`);
      }

      // Reset form and refresh list
      setNewCoupon({
        code: '', discountType: 'percentage', discountValue: 0, usageLimit: undefined, expiresAt: '',
        scope: 'all_products', productIdsCsv: '', categoryIdsCsv: '',
        paymentMethod: 'any', autoApply: false, appliesAt: 'both', startsAt: '',
        minimumAmountUsd: '', usageLimitPerCustomer: undefined, firstPurchaseOnly: false,
      });
      setShowAddForm(false);
      fetchCoupons();
    } catch (error) {
      getLogger().error('[CouponsSection] Failed to add coupon:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
        hasApiKey: !!apiKey,
      });
      setFetchError('Failed to create coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute stats
  const activeCoupons = coupons.filter(c => c.active).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usageCount ?? 0), 0);

  const toggleSort = (key: 'code' | 'discount' | 'usage' | 'status') => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const getSortIcon = (key: 'code' | 'discount' | 'usage' | 'status') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <span className="cedros-admin__sort-icon cedros-admin__sort-icon--idle">{Icons.chevronUp}</span>;
    }
    return (
      <span className="cedros-admin__sort-icon">
        {sortConfig.direction === 'asc' ? Icons.chevronUp : Icons.chevronDown}
      </span>
    );
  };

  const sortedCoupons = useMemo(() => {
    if (!sortConfig) return coupons;
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    const getValue = (coupon: Coupon) => {
      switch (sortConfig.key) {
        case 'discount':
          return coupon.discountValue ?? 0;
        case 'usage':
          return coupon.usageCount ?? 0;
        case 'status':
          return coupon.active ? 1 : 0;
        case 'code':
        default:
          return coupon.code;
      }
    };
    return [...coupons].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' }) * direction;
    });
  }, [coupons, sortConfig]);

  return (
    <div className="cedros-admin__page">
      <ErrorBanner message={fetchError} onRetry={fetchCoupons} />
      <StatsBar
        stats={[
          { label: 'Total Coupons', value: coupons.length },
          { label: 'Active', value: activeCoupons, variant: activeCoupons > 0 ? 'success' : 'muted' },
          { label: 'Redemptions', value: totalRedemptions },
        ]}
        isLoading={isLoading}
      />

      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Discount Coupons</h3>
        <button
          className="cedros-admin__button cedros-admin__button--primary cedros-admin__button--action"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? Icons.close : Icons.plus}
          {showAddForm ? 'Cancel' : 'Add Coupon'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCoupon} className="cedros-admin__add-form">
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Coupon Code</label>
              <input
                type="text"
                className="cedros-admin__input"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon(c => ({ ...c, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., SAVE20"
                required
              />
            </div>
            <FormDropdown
              value={newCoupon.discountType}
              onChange={(val) => setNewCoupon(c => ({ ...c, discountType: val as 'percentage' | 'fixed' }))}
              options={[
                { value: 'percentage', label: 'Percentage (%)' },
                { value: 'fixed', label: 'Fixed Amount ($)' },
              ]}
              label="Discount Type"
            />
          </div>
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">
                Discount Value {newCoupon.discountType === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newCoupon.discountValue || ''}
                onChange={(e) => setNewCoupon(c => ({ ...c, discountValue: parseFloat(e.target.value) || 0 }))}
                placeholder={newCoupon.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 10.00'}
                min="0"
                step={newCoupon.discountType === 'percentage' ? '1' : '0.01'}
                required
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Usage Limit (optional)</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newCoupon.usageLimit || ''}
                onChange={(e) => setNewCoupon(c => ({ ...c, usageLimit: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="Leave empty for unlimited"
                min="1"
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Expiration Date (optional)</label>
              <input
                type="date"
                className="cedros-admin__input"
                value={newCoupon.expiresAt}
                onChange={(e) => setNewCoupon(c => ({ ...c, expiresAt: e.target.value }))}
              />
            </div>
          </div>
          <div className="cedros-admin__form-row">
            <FormDropdown
              value={newCoupon.scope}
              onChange={(val) => setNewCoupon(c => ({ ...c, scope: val as CouponScope }))}
              options={[
                { value: 'all_products', label: 'All Products' },
                { value: 'specific_products', label: 'Specific Products' },
                { value: 'specific_categories', label: 'Specific Categories' },
              ]}
              label="Scope"
            />
            <FormDropdown
              value={newCoupon.paymentMethod}
              onChange={(val) => setNewCoupon(c => ({ ...c, paymentMethod: val as CouponPaymentMethod }))}
              options={[
                { value: 'any', label: 'Any Payment Method' },
                { value: 'stripe', label: 'Stripe (Card) Only' },
                { value: 'x402', label: 'Crypto (x402) Only' },
                { value: 'credits', label: 'Credits Only' },
              ]}
              label="Payment Method"
            />
            <FormDropdown
              value={newCoupon.appliesAt}
              onChange={(val) => setNewCoupon(c => ({ ...c, appliesAt: val as CouponAppliesAt }))}
              options={[
                { value: 'both', label: 'Cart & Checkout' },
                { value: 'cart', label: 'Cart Only' },
                { value: 'checkout', label: 'Checkout Only' },
              ]}
              label="Applies At"
            />
          </div>
          {newCoupon.scope === 'specific_products' && (
            <div className="cedros-admin__form-row">
              <div className="cedros-admin__field" style={{ flex: 1 }}>
                <label className="cedros-admin__field-label">Product IDs</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={newCoupon.productIdsCsv}
                  onChange={(e) => setNewCoupon(c => ({ ...c, productIdsCsv: e.target.value }))}
                  placeholder="e.g., prod_123, prod_456"
                />
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                  Comma-separated product IDs this coupon applies to.
                </div>
              </div>
            </div>
          )}
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Start Date (optional)</label>
              <input
                type="date"
                className="cedros-admin__input"
                value={newCoupon.startsAt}
                onChange={(e) => setNewCoupon(c => ({ ...c, startsAt: e.target.value }))}
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Auto Apply</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={newCoupon.autoApply}
                  onChange={(e) => setNewCoupon(c => ({ ...c, autoApply: e.target.checked }))}
                />
                Automatically apply when conditions met
              </label>
            </div>
          </div>
          <div className="cedros-admin__form-row">
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Minimum Purchase (USD)</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newCoupon.minimumAmountUsd === '' ? '' : newCoupon.minimumAmountUsd}
                onChange={(e) => setNewCoupon(c => ({ ...c, minimumAmountUsd: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                placeholder="e.g., 50.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">Per-Customer Limit</label>
              <input
                type="number"
                className="cedros-admin__input"
                value={newCoupon.usageLimitPerCustomer || ''}
                onChange={(e) => setNewCoupon(c => ({ ...c, usageLimitPerCustomer: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="Leave empty for unlimited"
                min="1"
              />
            </div>
            <div className="cedros-admin__field">
              <label className="cedros-admin__field-label">First Purchase Only</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={newCoupon.firstPurchaseOnly}
                  onChange={(e) => setNewCoupon(c => ({ ...c, firstPurchaseOnly: e.target.checked }))}
                />
                New customers only
              </label>
            </div>
          </div>
          {newCoupon.scope === 'specific_categories' && (
            <div className="cedros-admin__form-row">
              <div className="cedros-admin__field" style={{ flex: 1 }}>
                <label className="cedros-admin__field-label">Category IDs</label>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={newCoupon.categoryIdsCsv}
                  onChange={(e) => setNewCoupon(c => ({ ...c, categoryIdsCsv: e.target.value }))}
                  placeholder="e.g., cat_apparel, cat_accessories"
                />
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
                  Comma-separated category IDs this coupon applies to.
                </div>
              </div>
            </div>
          )}
          <div className="cedros-admin__form-actions">
            <button type="submit" className="cedros-admin__button cedros-admin__button--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading coupons...</div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th aria-sort={sortConfig?.key === 'code' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('code')}>
                    Code
                    {getSortIcon('code')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'discount' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('discount')}>
                    Discount
                    {getSortIcon('discount')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'usage' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('usage')}>
                    Usage
                    {getSortIcon('usage')}
                  </button>
                </th>
                <th aria-sort={sortConfig?.key === 'status' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="cedros-admin__table-sort" onClick={() => toggleSort('status')}>
                    Status
                    {getSortIcon('status')}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCoupons.map((coupon) => (
                <tr key={coupon.code}>
                  <td><code>{coupon.code}</code></td>
                  <td>
                    {coupon.discountType === 'percentage'
                      ? `${coupon.discountValue}%`
                      : `$${coupon.discountValue.toFixed(2)}`}
                  </td>
                  <td>
                    {coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                  </td>
                  <td>
                    <span className={`cedros-admin__badge ${coupon.active ? 'cedros-admin__badge--success' : 'cedros-admin__badge--muted'}`}>
                      {coupon.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="cedros-admin__button cedros-admin__button--ghost">Edit</button>
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
