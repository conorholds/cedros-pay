/**
 * Admin Dashboard — Inventory Section
 *
 * Browse inventory adjustment history per product.
 *
 * Endpoints:
 *   GET /admin/products?limit=100&offset=0
 *     → Product[]  (id, description, …)
 *   GET /admin/products/:id/inventory/adjustments?limit=50&offset=0
 *     → { adjustments: InventoryAdjustment[] }
 */

import { useState, useEffect, useCallback } from 'react';
import { ErrorBanner } from './ErrorBanner';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { FormDropdown } from './Dropdown';
import { SortableHeader } from './SortableHeader';
import { TableEmptyRow, TableErrorRow, TableLoadingRows } from './TableStateRows';
import { useBackgroundRefresh } from './useBackgroundRefresh';
import { useTableSort, type SortValue } from './useTableSort';
import type { SectionProps, Product } from './types';
import { formatDateTime } from '../../utils/dateHelpers';
import { getLogger } from '../../utils/logger';
import { fetchAdminJson } from './authFetch';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InventoryAdjustment {
  id: string;
  tenantId: string;
  productId: string;
  variantId?: string;
  delta: number;
  quantityBefore: number;
  quantityAfter: number;
  reason?: string;
  actor?: string;
  createdAt: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

/** Stable accessor for the sortable adjustment columns (see useTableSort). */
function adjustmentSortValue(adj: InventoryAdjustment, key: string): SortValue {
  switch (key) {
    case 'delta': return adj.delta;
    case 'before': return adj.quantityBefore;
    case 'after': return adj.quantityAfter;
    case 'date': return adj.createdAt;
    default: return null;
  }
}

export function InventorySection({ serverUrl, authManager }: SectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const { sorted: sortedAdjustments, sortKey, sortDirection, toggleSort } = useTableSort(
    adjustments,
    adjustmentSortValue,
    { key: 'date', direction: 'desc' }
  );

  // ─── Shared fetch helper ──────────────────────────────────────────────────

  const adminFetch = useCallback(async <T,>(path: string): Promise<T> => {
    return fetchAdminJson<T>(authManager, path);
  }, [authManager]);

  // ─── Fetch product list on mount ──────────────────────────────────────────

  const fetchProducts = useCallback(async (isCancelled: () => boolean = () => false) => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await adminFetch<Product[]>('/admin/products?limit=100&offset=0');
      if (isCancelled()) return;
      const list = Array.isArray(data) ? data : (data as { products?: Product[] }).products ?? [];
      setProducts(list);
    } catch (err) {
      if (isCancelled()) return;
      getLogger().error('[InventorySection] Failed to load products:', err, {
        serverUrl: serverUrl.slice(0, 20) + '...',
      });
      setProductsError('Failed to load products');
    } finally {
      if (!isCancelled()) setProductsLoading(false);
    }
  }, [adminFetch, serverUrl]);

  useEffect(() => {
    let cancelled = false;
    fetchProducts(() => cancelled);
    return () => { cancelled = true; };
  }, [fetchProducts]);

  // ─── Fetch adjustments when product or page changes ───────────────────────

  const fetchAdjustments = useCallback(async (productId: string, page: number) => {
    if (!productId) return;
    setAdjustmentsLoading(true);
    setAdjustmentsError(null);
    try {
      const path = `/admin/products/${encodeURIComponent(productId)}/inventory/adjustments?limit=${PAGE_SIZE}&offset=${page}`;
      const data = await adminFetch<{ adjustments: InventoryAdjustment[] }>(path);
      setAdjustments(data.adjustments ?? []);
    } catch (err) {
      getLogger().error('[InventorySection] Failed to load adjustments:', err, {
        productId,
        serverUrl: serverUrl.slice(0, 20) + '...',
      });
      setAdjustmentsError('Failed to load inventory adjustments');
    } finally {
      setAdjustmentsLoading(false);
    }
  }, [adminFetch, serverUrl]);

  useEffect(() => {
    if (selectedProductId) fetchAdjustments(selectedProductId, offset);
  }, [fetchAdjustments, selectedProductId, offset]);

  // Keep adjustments fresh while a product is selected; idle otherwise.
  useBackgroundRefresh(
    () => fetchAdjustments(selectedProductId, offset),
    { enabled: Boolean(selectedProductId) }
  );

  const handleProductChange = (id: string) => {
    setSelectedProductId(id);
    setOffset(0);
    setAdjustments([]);
    setAdjustmentsError(null);
  };

  const handlePrev = () => setOffset((prev) => Math.max(0, prev - PAGE_SIZE));
  const handleNext = () => setOffset((prev) => prev + PAGE_SIZE);

  // ─── Render ───────────────────────────────────────────────────────────────

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="cedros-data-stack cedros-admin__page">
      {products.length > 0 ? <ErrorBanner message={productsError} onRetry={fetchProducts} /> : null}

      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Inventory adjustments</h3>
      </div>

      {/* Product selector */}
      <div className="cedros-admin__add-form" style={{ marginBottom: '1rem' }}>
        <div className="cedros-admin__form-row">
          {productsError && products.length === 0 ? (
            <div className="cedros-data-field cedros-admin__field" style={{ flex: 1 }}>
              <label className="cedros-data-label cedros-admin__field-label">Select product</label>
              <ErrorBanner message={productsError} onRetry={fetchProducts} />
            </div>
          ) : productsLoading && products.length === 0 ? (
            <div className="cedros-data-field cedros-admin__field" style={{ flex: 1 }}>
              <label className="cedros-data-label cedros-admin__field-label">Select product</label>
              <LoadingState label="Loading products…" lines={2} />
            </div>
          ) : (
            <FormDropdown
              label="Select product"
              value={selectedProductId}
              onChange={handleProductChange}
              options={[
                { value: '', label: 'Choose a product…' },
                ...products.map((p) => ({
                  value: p.id,
                  label: p.title ?? p.description ?? p.id,
                })),
              ]}
              style={{ flex: 1 }}
            />
          )}
        </div>
      </div>

      {/* Adjustments table */}
      {!selectedProductId ? (
        <EmptyState
          title="Select a product"
          description="Choose a product above to view its inventory adjustment history."
        />
      ) : (
        <>
          {selectedProduct && (
            <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem', opacity: 0.7 }}>
              Showing adjustments for: <strong>{selectedProduct.title ?? selectedProduct.description ?? selectedProduct.id}</strong>
            </p>
          )}

          {adjustments.length > 0 ? (
            <ErrorBanner message={adjustmentsError} onRetry={() => fetchAdjustments(selectedProductId, offset)} />
          ) : null}
              <div className="cedros-data-table-wrap cedros-admin__table-container">
                <table className="cedros-data-table cedros-admin__table" aria-busy={adjustmentsLoading}>
                  <thead>
                    <tr>
                      <SortableHeader label="Date" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <SortableHeader label="Delta" sortKey="delta" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <SortableHeader label="Before" sortKey="before" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <SortableHeader label="After" sortKey="after" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                      <th>Reason</th>
                      <th>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustmentsError && adjustments.length === 0 ? (
                      <TableErrorRow
                        columns={6}
                        message={adjustmentsError}
                        onRetry={() => fetchAdjustments(selectedProductId, offset)}
                      />
                    ) : adjustmentsLoading && adjustments.length === 0 ? (
                      <TableLoadingRows columns={6} label="Loading adjustments…" />
                    ) : adjustments.length === 0 ? (
                      <TableEmptyRow
                        columns={6}
                        title="No inventory adjustments"
                        description="Adjustments appear here once stock for this product changes."
                      />
                    ) : sortedAdjustments.map((adj) => (
                      <tr key={adj.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatDateTime(adj.createdAt)}
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 600,
                              color: adj.delta > 0
                                ? 'var(--pay-admin-success)'
                                : adj.delta < 0
                                  ? 'var(--pay-admin-error)'
                                  : undefined,
                            }}
                            aria-label={`Delta: ${adj.delta > 0 ? 'plus' : ''}${adj.delta}`}
                          >
                            {adj.delta > 0 ? `+${adj.delta}` : adj.delta}
                          </span>
                        </td>
                        <td>{adj.quantityBefore}</td>
                        <td>{adj.quantityAfter}</td>
                        <td>{adj.reason ?? <span style={{ opacity: 0.45 }}>—</span>}</td>
                        <td>{adj.actor ?? <span style={{ opacity: 0.45 }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {adjustments.length > 0 ? (
              <div className="cedros-data-pagination">
                <button
                  type="button"
                  className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
                  disabled={offset === 0}
                  onClick={handlePrev}
                >
                  Previous
                </button>
                <span>
                  Page {Math.floor(offset / PAGE_SIZE) + 1}
                  {' · '}
                  {adjustments.length} record{adjustments.length !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
                  disabled={adjustments.length < PAGE_SIZE}
                  onClick={handleNext}
                >
                  Next
                </button>
              </div>
              ) : null}
        </>
      )}
    </div>
  );
}
