/**
 * Coupons Section Component
 *
 * Admin dashboard component for managing discount coupons.
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { AdminDialog } from './AdminDialog';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { FormDropdown } from './Dropdown';
import type { SectionProps, Coupon, CouponScope, CouponPaymentMethod, CouponAppliesAt, DiscountType } from './types';
import { getLogger } from '../../utils/logger';
import { fetchAdminJson, requireAdminAuth } from './authFetch';
import { AdvancedDetails } from './contentSettingsLayout';
import { CouponsTable } from './CouponsTable';
import { UnsupportedCheckoutOptionsNotice } from './CouponCheckoutSupportNotice';

function createCouponDraft() {
  return {
    code: '',
    discountType: 'percentage' as DiscountType,
    discountValue: 0,
    usageLimit: undefined as number | undefined,
    expiresAt: '',
    scope: 'all_products' as CouponScope,
    productIdsCsv: '',
    categoryIdsCsv: '',
    paymentMethod: 'any' as CouponPaymentMethod,
    autoApply: false,
    appliesAt: 'both' as CouponAppliesAt,
    startsAt: '',
    minimumAmountUsd: '' as '' | number,
    usageLimitPerCustomer: undefined as number | undefined,
    firstPurchaseOnly: false,
  };
}

export function CouponsSection({ serverUrl, pageSize = 20, authManager, locale }: SectionProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState(createCouponDraft);

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      setLoadError(null);
      const path = `/admin/coupons?limit=${pageSize}`;
      const data = await fetchAdminJson<{ coupons: Coupon[] }>(authManager, path);

      setCoupons(data.coupons || []);
      setHasLoaded(true);
    } catch (error) {
      getLogger().error('[CouponsSection] Failed to fetch coupons:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
      });
      setLoadError('Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, pageSize, authManager]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useBackgroundRefresh(fetchCoupons);

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || newCoupon.discountValue <= 0) return;

    setCreateError(null);
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

      await requireAdminAuth(authManager).fetchWithAuth('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Reset form and refresh list
      setNewCoupon(createCouponDraft());
      setShowDiscardConfirm(false);
      setShowAddForm(false);
      fetchCoupons();
    } catch (error) {
      getLogger().error('[CouponsSection] Failed to add coupon:', error, {
        serverUrl: serverUrl.slice(0, 20) + '...',
      });
      setCreateError('Failed to create coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute stats
  const activeCoupons = coupons.filter(c => c.active).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usageCount ?? 0), 0);

  const couponDraftIsDirty = JSON.stringify(newCoupon) !== JSON.stringify(createCouponDraft());
  const requestCloseCouponDialog = () => {
    if (isSubmitting) return;
    if (showDiscardConfirm) {
      setShowDiscardConfirm(false);
      return;
    }
    if (couponDraftIsDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    setShowAddForm(false);
  };
  const discardCouponDraft = () => {
    setNewCoupon(createCouponDraft());
    setCreateError(null);
    setShowDiscardConfirm(false);
    setShowAddForm(false);
  };

  return (
    <div className="cedros-data-stack cedros-admin__page">
      <ErrorBanner message={hasLoaded ? loadError : null} />
      <StatsBar
        stats={[
          { label: 'Total coupons', value: coupons.length },
          { label: 'Active', value: activeCoupons, variant: activeCoupons > 0 ? 'success' : 'muted' },
          { label: 'Redemptions', value: totalRedemptions },
        ]}
        isLoading={isLoading && !hasLoaded}
      />

      <div className="cedros-data-toolbar">
        <div className="cedros-data-toolbar__right">
          <button
            type="button"
            className="cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary cedros-admin__button--action"
            onClick={() => {
              setCreateError(null);
              setShowDiscardConfirm(false);
              setShowAddForm(true);
            }}
          >
            {Icons.plus}
            Add coupon
          </button>
        </div>
      </div>

      {showAddForm && (
        <AdminDialog
          labelledBy="cedros-pay-add-coupon-title"
          describedBy="cedros-pay-add-coupon-description"
          onClose={requestCloseCouponDialog}
          size="large"
        >
          {showDiscardConfirm ? (
            <div className="cedros-admin__coupon-dialog-form">
              <div className="cedros-admin__modal-header">
                <div>
                  <h2 id="cedros-pay-add-coupon-title" className="cedros-admin__modal-title">Discard coupon?</h2>
                  <p id="cedros-pay-add-coupon-description" className="cedros-admin__section-subtitle">
                    Your coupon draft has unsaved changes.
                  </p>
                </div>
                <button
                  type="button"
                  className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm cedros-admin__modal-close"
                  aria-label="Close discard confirmation"
                  title="Close"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  {Icons.close}
                </button>
              </div>
              <div className="cedros-admin__modal-body">
                <p className="cedros-admin__coupon-dialog-copy">This draft will be removed. This cannot be undone.</p>
              </div>
              <div className="cedros-data-actions cedros-admin__modal-footer">
                <button type="button" className="cedros-data-btn cedros-data-btn--ghost" onClick={() => setShowDiscardConfirm(false)} autoFocus>
                  Keep editing
                </button>
                <button type="button" className="cedros-data-btn cedros-data-btn--danger" onClick={discardCouponDraft}>
                  Discard draft
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddCoupon} className="cedros-admin__coupon-dialog-form">
              <div className="cedros-admin__modal-header">
                <div>
                  <h2 id="cedros-pay-add-coupon-title" className="cedros-admin__modal-title">Add coupon</h2>
                  <p id="cedros-pay-add-coupon-description" className="cedros-admin__section-subtitle">
                    Create a discount code and choose where it applies.
                  </p>
                </div>
                <button
                  type="button"
                  className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm cedros-admin__modal-close"
                  aria-label="Close add coupon dialog"
                  title="Close"
                  onClick={requestCloseCouponDialog}
                  disabled={isSubmitting}
                >
                  {Icons.close}
                </button>
              </div>
              <div className="cedros-admin__modal-body cedros-admin__coupon-dialog-body">
                <ErrorBanner message={createError} />
                <div className="cedros-admin__form-row">
                  <div className="cedros-data-field cedros-admin__field">
                    <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-coupon-code">Coupon code</label>
                    <input
                      id="cedros-pay-coupon-code"
                      type="text"
                      className="cedros-data-input cedros-admin__input"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon(c => ({ ...c, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., SAVE20"
                      autoFocus
                      required
                    />
                  </div>
                  <FormDropdown
                    value={newCoupon.discountType}
                    onChange={(val) => setNewCoupon(c => ({ ...c, discountType: val as DiscountType }))}
                    options={[
                      { value: 'percentage', label: 'Percentage (%)' },
                      { value: 'fixed', label: 'Fixed amount ($)' },
                    ]}
                    label="Discount type"
                  />
                </div>
                <div className="cedros-admin__form-row">
                  <div className="cedros-data-field cedros-admin__field">
                    <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-coupon-value">
                      Discount value {newCoupon.discountType === 'percentage' ? '(%)' : '($)'}
                    </label>
                    <input
                      id="cedros-pay-coupon-value"
                      type="number"
                      className="cedros-data-input cedros-admin__input"
                      value={newCoupon.discountValue || ''}
                      onChange={(e) => setNewCoupon(c => ({ ...c, discountValue: parseFloat(e.target.value) || 0 }))}
                      placeholder={newCoupon.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 10.00'}
                      min={newCoupon.discountType === 'percentage' ? '1' : '0.01'}
                      max={newCoupon.discountType === 'percentage' ? '100' : undefined}
                      step={newCoupon.discountType === 'percentage' ? '1' : '0.01'}
                      required
                    />
                  </div>
                  <div className="cedros-data-field cedros-admin__field">
                    <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-coupon-expiration">Expiration date (optional)</label>
                    <input
                      id="cedros-pay-coupon-expiration"
                      type="date"
                      className="cedros-data-input cedros-admin__input"
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
                      { value: 'all_products', label: 'All products' },
                      { value: 'specific_products', label: 'Specific products' },
                      { value: 'specific_categories', label: 'Specific categories' },
                    ]}
                    label="Scope"
                  />
                  <FormDropdown
                    value={newCoupon.paymentMethod}
                    onChange={(val) => setNewCoupon(c => ({ ...c, paymentMethod: val as CouponPaymentMethod }))}
                    options={[
                      { value: 'any', label: 'Any payment method' },
                      { value: 'stripe', label: 'Stripe only' },
                      { value: 'x402', label: 'Crypto (x402) only' },
                      { value: 'credits', label: 'Credits only' },
                    ]}
                    label="Payment method"
                  />
                  <FormDropdown
                    value={newCoupon.appliesAt}
                    onChange={(val) => setNewCoupon(c => ({ ...c, appliesAt: val as CouponAppliesAt }))}
                    options={[
                      { value: 'both', label: 'Cart and checkout' },
                      { value: 'cart', label: 'Cart only' },
                      { value: 'checkout', label: 'Checkout only' },
                    ]}
                    label="Applies at"
                  />
                </div>
                {newCoupon.scope === 'specific_products' && (
                  <div className="cedros-admin__form-row">
                    <div className="cedros-data-field cedros-admin__field">
                      <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-coupon-product-ids">Product IDs</label>
                      <input
                        id="cedros-pay-coupon-product-ids"
                        type="text"
                        className="cedros-data-input cedros-admin__input"
                        value={newCoupon.productIdsCsv}
                        onChange={(e) => setNewCoupon(c => ({ ...c, productIdsCsv: e.target.value }))}
                        placeholder="e.g., prod_123, prod_456"
                      />
                      <div className="cedros-admin__field-description">
                        Comma-separated product IDs this coupon applies to.
                      </div>
                    </div>
                  </div>
                )}
                {newCoupon.scope === 'specific_categories' && (
                  <div className="cedros-admin__form-row">
                    <div className="cedros-data-field cedros-admin__field">
                      <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-coupon-category-ids">Category IDs</label>
                      <input
                        id="cedros-pay-coupon-category-ids"
                        type="text"
                        className="cedros-data-input cedros-admin__input"
                        value={newCoupon.categoryIdsCsv}
                        onChange={(e) => setNewCoupon(c => ({ ...c, categoryIdsCsv: e.target.value }))}
                        placeholder="e.g., cat_apparel, cat_accessories"
                      />
                      <div className="cedros-admin__field-description">
                        Comma-separated category IDs this coupon applies to.
                      </div>
                    </div>
                  </div>
                )}
                <AdvancedDetails label="Advanced options">
                  <div className="cedros-admin__disclosure-content">
                    <div className="cedros-admin__form-row">
                      <div className="cedros-data-field cedros-admin__field">
                        <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-coupon-usage-limit">Usage limit (optional)</label>
                        <input
                          id="cedros-pay-coupon-usage-limit"
                          type="number"
                          className="cedros-data-input cedros-admin__input"
                          value={newCoupon.usageLimit || ''}
                          onChange={(e) => setNewCoupon(c => ({ ...c, usageLimit: e.target.value ? parseInt(e.target.value) : undefined }))}
                          placeholder="Leave empty for unlimited"
                          min="1"
                        />
                      </div>
                      <div className="cedros-data-field cedros-admin__field">
                        <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-coupon-start">Start date (optional)</label>
                        <input
                          id="cedros-pay-coupon-start"
                          type="date"
                          className="cedros-data-input cedros-admin__input"
                          value={newCoupon.startsAt}
                          onChange={(e) => setNewCoupon(c => ({ ...c, startsAt: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="cedros-admin__form-row">
                      <div className="cedros-data-field cedros-admin__field">
                        <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-coupon-minimum">Minimum purchase (USD)</label>
                        <input
                          id="cedros-pay-coupon-minimum"
                          type="number"
                          className="cedros-data-input cedros-admin__input"
                          value={newCoupon.minimumAmountUsd === '' ? '' : newCoupon.minimumAmountUsd}
                          onChange={(e) => setNewCoupon(c => ({ ...c, minimumAmountUsd: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 }))}
                          placeholder="e.g., 50.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="cedros-data-field cedros-admin__field">
                        <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-coupon-customer-limit">Per-customer limit</label>
                        <input
                          id="cedros-pay-coupon-customer-limit"
                          type="number"
                          className="cedros-data-input cedros-admin__input"
                          value={newCoupon.usageLimitPerCustomer || ''}
                          onChange={(e) => setNewCoupon(c => ({ ...c, usageLimitPerCustomer: e.target.value ? parseInt(e.target.value) : undefined }))}
                          placeholder="Leave empty for unlimited"
                          min="1"
                        />
                      </div>
                    </div>
                    <div className="cedros-admin__form-row">
                      <div className="cedros-data-field cedros-admin__field">
                        <label className="cedros-admin__checkbox-option">
                          <input
                            type="checkbox"
                            checked={newCoupon.autoApply}
                            onChange={(e) => setNewCoupon(c => ({ ...c, autoApply: e.target.checked }))}
                          />
                          Automatically apply when conditions met
                        </label>
                      </div>
                      <div className="cedros-data-field cedros-admin__field">
                        <label className="cedros-admin__checkbox-option">
                          <input
                            type="checkbox"
                            checked={newCoupon.firstPurchaseOnly}
                            onChange={(e) => setNewCoupon(c => ({ ...c, firstPurchaseOnly: e.target.checked }))}
                          />
                          New customers only
                        </label>
                      </div>
                    </div>
                  </div>
                </AdvancedDetails>
                <UnsupportedCheckoutOptionsNotice coupon={newCoupon} />
              </div>
              <div className="cedros-data-actions cedros-admin__modal-footer">
                <button
                  type="button"
                  className="cedros-data-btn cedros-data-btn--ghost"
                  onClick={requestCloseCouponDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create coupon'}
                </button>
              </div>
            </form>
          )}
        </AdminDialog>
      )}

      <CouponsTable coupons={coupons} isLoading={isLoading} hasLoaded={hasLoaded} loadError={loadError} onRetry={fetchCoupons} locale={locale} />
    </div>
  );
}
