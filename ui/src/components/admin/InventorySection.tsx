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
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps, Product } from './types';
import { formatDateTime } from '../../utils/dateHelpers';
import { getLogger } from '../../utils/logger';

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

export function InventorySection({ serverUrl, apiKey, authManager }: SectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  // ─── Shared fetch helper ──────────────────────────────────────────────────

  const adminFetch = useCallback(async <T,>(path: string): Promise<T> => {
    if (authManager?.isAuthenticated()) {
      return authManager.fetchWithAuth<T>(path);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    const res = await fetch(`${serverUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }, [serverUrl, apiKey, authManager]);

  // ─── Fetch product list on mount ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    setProductsError(null);

    adminFetch<Product[]>('/admin/products?limit=100&offset=0')
      .then((data) => {
        if (cancelled) return;
        // Server may return array directly or wrapped
        const list = Array.isArray(data) ? data : (data as { products?: Product[] }).products ?? [];
        setProducts(list);
      })
      .catch((err) => {
        if (cancelled) return;
        getLogger().error('[InventorySection] Failed to load products:', err, {
          serverUrl: serverUrl.slice(0, 20) + '...',
        });
        setProductsError('Failed to load products');
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    return () => { cancelled = true; };
  }, [adminFetch, serverUrl]);

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
      setAdjustments([]);
    } finally {
      setAdjustmentsLoading(false);
    }
  }, [adminFetch, serverUrl]);

  useEffect(() => {
    if (selectedProductId) fetchAdjustments(selectedProductId, offset);
  }, [fetchAdjustments, selectedProductId, offset]);

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
    <div className="cedros-admin__page">
      <ErrorBanner message={productsError ?? adjustmentsError} />

      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Inventory Adjustments</h3>
      </div>

      {/* Product selector */}
      <div className="cedros-admin__add-form" style={{ marginBottom: '1rem' }}>
        <div className="cedros-admin__form-row">
          <div className="cedros-admin__field" style={{ flex: 1 }}>
            <label htmlFor="inventory-product-select" className="cedros-admin__field-label">
              Select Product
            </label>
            {productsLoading ? (
              <div className="cedros-admin__loading">{Icons.loading} Loading products...</div>
            ) : (
              <select
                id="inventory-product-select"
                className="cedros-admin__input"
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                aria-label="Select product to view inventory adjustments"
              >
                <option value="">-- Choose a product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title ?? p.description ?? p.id}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Adjustments table */}
      {!selectedProductId ? (
        <div className="cedros-admin__empty">Select a product to view its inventory adjustments.</div>
      ) : adjustmentsLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading adjustments...</div>
      ) : (
        <>
          {selectedProduct && (
            <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem', opacity: 0.7 }}>
              Showing adjustments for: <strong>{selectedProduct.title ?? selectedProduct.description ?? selectedProduct.id}</strong>
            </p>
          )}

          {adjustments.length === 0 ? (
            <div className="cedros-admin__empty">No inventory adjustments found.</div>
          ) : (
            <>
              <div className="cedros-admin__table-container">
                <table className="cedros-admin__table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Delta</th>
                      <th>Before</th>
                      <th>After</th>
                      <th>Reason</th>
                      <th>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.map((adj) => (
                      <tr key={adj.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatDateTime(adj.createdAt)}
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 600,
                              color: adj.delta > 0
                                ? 'var(--cedros-success, #16a34a)'
                                : adj.delta < 0
                                  ? 'var(--cedros-danger, #dc2626)'
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                <button
                  type="button"
                  className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
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
                  className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                  disabled={adjustments.length < PAGE_SIZE}
                  onClick={handleNext}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
