/**
 * Admin Dashboard - Products Section
 *
 * Product management interface with variations support for the admin panel.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { AdminDialog } from './AdminDialog';
import { DestructiveConfirmDialog } from './DestructiveConfirmDialog';
import { ErrorBanner } from './ErrorBanner';
import { FilterDropdown } from './Dropdown';
import { ImportStripeProductsButton } from './ImportStripeProductsButton';
import { ProductAddPage } from './ProductAddPage';
import { ProductEditPage } from './ProductEditPage';
import { ProductVariationsEditor } from './ProductVariationsEditor';
import { ProductsTable } from './ProductsTable';
import { StatsBar } from './StatsBar';
import { SyncStripeCatalogButton } from './SyncStripeCatalogButton';
import { fetchAdminJson, requireAdminAuth } from './authFetch';
import { useCommerceFeatureFlags } from './commerceFeatureSettings';
import { Icons } from './icons';
import {
  getProductTitle,
  productMatchesFilters,
  type AdminProductType,
} from './productDisplay';
import { buildUpdatePayload, formFromProduct } from './productEditPayload';
import type { Product, SectionProps } from './types';
import { useBackgroundRefresh } from './useBackgroundRefresh';

export function ProductsSection({
  pageSize = 20,
  authManager,
  serverUrl,
  locale,
  onDetailViewChange,
}: SectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [editingVariationsProduct, setEditingVariationsProduct] = useState<Product | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | AdminProductType>('all');
  const fetchGeneration = useRef(0);
  const { flags } = useCommerceFeatureFlags(serverUrl, authManager);

  const fetchProducts = useCallback(async () => {
    const generation = ++fetchGeneration.current;
    setIsLoading(true);
    try {
      setFetchError(null);
      const data = await fetchAdminJson<{ products: Product[] }>(
        authManager,
        `/admin/products?limit=${pageSize}`
      );
      if (generation !== fetchGeneration.current) return;
      setProducts(data.products || []);
      setHasLoaded(true);
    } catch {
      if (generation !== fetchGeneration.current) return;
      setFetchError('Failed to load products');
    } finally {
      if (generation === fetchGeneration.current) setIsLoading(false);
    }
  }, [pageSize, authManager]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => () => onDetailViewChange?.(false), [onDetailViewChange]);

  useEffect(() => {
    if (!flags.subscriptions && typeFilter === 'subscription') {
      setTypeFilter('all');
    }
  }, [flags.subscriptions, typeFilter]);

  useBackgroundRefresh(fetchProducts);

  const stats = useMemo(() => {
    const activeCount = products.filter((product) => product.active).length;
    const totalSkus = products.reduce((sum, product) => {
      const variationCount = product.variations?.length ?? 0;
      return sum + (variationCount > 0 ? variationCount : 1);
    }, 0);
    return { activeCount, totalSkus };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) =>
      productMatchesFilters(product, query, statusFilter, typeFilter)
    );
  }, [products, search, statusFilter, typeFilter]);

  const hasActiveFilters =
    search.trim() !== '' || statusFilter !== 'all' || typeFilter !== 'all';

  const returnToList = () => {
    onDetailViewChange?.(false);
    setView('list');
    setProductToEdit(null);
  };

  const setProductActive = async (product: Product, active: boolean) => {
    setUpdatingProductId(product.id);
    try {
      setFetchError(null);
      const form = { ...formFromProduct(product), active };
      const updated = await requireAdminAuth(authManager).fetchWithAuth<Product>(
        `/admin/products/${encodeURIComponent(product.id)}`,
        { method: 'PUT', body: JSON.stringify(buildUpdatePayload(form, product)) }
      );
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? updated : item))
      );
    } catch {
      setFetchError(
        `Failed to make “${getProductTitle(product)}” ${active ? 'active' : 'inactive'}`
      );
    } finally {
      setUpdatingProductId(null);
    }
  };

  const deleteProduct = async () => {
    if (!pendingDeleteProduct) return;
    const product = pendingDeleteProduct;
    setDeletingProductId(product.id);
    try {
      setFetchError(null);
      await requireAdminAuth(authManager).fetchWithAuth(
        `/admin/products/${encodeURIComponent(product.id)}`,
        { method: 'DELETE' }
      );
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setPendingDeleteProduct(null);
    } catch {
      setPendingDeleteProduct(null);
      setFetchError(`Failed to delete “${getProductTitle(product)}”`);
    } finally {
      setDeletingProductId(null);
    }
  };

  if (view === 'create') {
    return (
      <ProductAddPage
        key="create"
        authManager={authManager}
        serverUrl={serverUrl}
        features={flags}
        onBack={returnToList}
        onCreated={() => {
          returnToList();
          fetchProducts();
        }}
      />
    );
  }

  if (view === 'edit' && productToEdit) {
    return (
      <ProductEditPage
        key={productToEdit.id}
        product={productToEdit}
        authManager={authManager}
        serverUrl={serverUrl}
        features={flags}
        onBack={returnToList}
        onSaved={() => {
          fetchProducts();
        }}
      />
    );
  }

  return (
    <div className="cedros-data-stack cedros-admin__page">
      <ErrorBanner message={hasLoaded ? fetchError : null} />
      <StatsBar
        stats={[
          { label: 'Total products', value: products.length, description: 'In the catalog' },
          {
            label: 'Active',
            value: stats.activeCount,
            description: 'Sellable now',
          },
          { label: 'Total SKUs', value: stats.totalSkus, description: 'Across all variations' },
        ]}
        isLoading={isLoading && !hasLoaded}
      />

      <ProductFilters
        search={search}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onTypeFilterChange={setTypeFilter}
        subscriptionsEnabled={flags.subscriptions}
        actions={(
          <div className="cedros-data-toolbar__right">
            <SyncStripeCatalogButton
              products={products}
              authManager={authManager}
              onSynced={fetchProducts}
              onError={setFetchError}
            />
            <ImportStripeProductsButton
              authManager={authManager}
              onImported={fetchProducts}
              onError={setFetchError}
            />
            <button
              type="button"
              className="cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary cedros-admin__button--action"
              onClick={() => {
                onDetailViewChange?.(true);
                setView('create');
              }}
            >
              {Icons.plus}
              Add product
            </button>
          </div>
        )}
      />

      <ProductsTable
        products={filteredProducts}
        authManager={authManager}
        inventoryEnabled={flags.inventory}
        locale={locale}
        isLoading={isLoading}
        hasLoaded={hasLoaded}
        error={hasLoaded ? null : fetchError}
        mutatingProductId={updatingProductId}
        onRetry={fetchProducts}
        emptyTitle={hasActiveFilters ? 'No matching products' : 'No products yet'}
        emptyDescription={
          hasActiveFilters
            ? 'Try adjusting your search or filters.'
            : 'Add your first product to start selling through the paywall.'
        }
        emptyFiltered={hasActiveFilters}
        emptyAction={hasActiveFilters ? (
            <button
              type="button"
              className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
            >
              Clear filters
            </button>
          ) : undefined}
        onEdit={(product) => {
          onDetailViewChange?.(true);
          setProductToEdit(product);
          setView('edit');
        }}
        onEditVariations={setEditingVariationsProduct}
        onSetActive={setProductActive}
        onDelete={setPendingDeleteProduct}
        onSynced={fetchProducts}
        onError={setFetchError}
      />

      {editingVariationsProduct && (
        <AdminDialog
          labelledBy="cedros-pay-product-variations-title"
          onClose={() => setEditingVariationsProduct(null)}
          size="large"
        >
            <ProductVariationsEditor
              productId={editingVariationsProduct.id}
              productTitle={getProductTitle(editingVariationsProduct)}
              defaultPrice={(editingVariationsProduct.fiatAmountCents ?? 0) / 100}
              authManager={authManager}
              onClose={() => setEditingVariationsProduct(null)}
            />
        </AdminDialog>
      )}

      {pendingDeleteProduct && (
        <DestructiveConfirmDialog
          title={`Delete “${getProductTitle(pendingDeleteProduct)}”?`}
          impact="This permanently removes the product from the catalog and makes it unavailable to customers."
          confirmLabel="Delete product"
          isConfirming={deletingProductId === pendingDeleteProduct.id}
          onCancel={() => setPendingDeleteProduct(null)}
          onConfirm={deleteProduct}
        />
      )}
    </div>
  );
}

function ProductFilters({
  search,
  statusFilter,
  typeFilter,
  onSearchChange,
  onStatusFilterChange,
  onTypeFilterChange,
  subscriptionsEnabled,
  actions,
}: {
  search: string;
  statusFilter: 'all' | 'active' | 'inactive';
  typeFilter: 'all' | AdminProductType;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  onTypeFilterChange: (value: 'all' | AdminProductType) => void;
  subscriptionsEnabled: boolean;
  actions: ReactNode;
}) {
  const typeOptions = [
    { value: 'all', label: 'All types' },
    { value: 'one_time', label: 'One-time purchase' },
    { value: 'pay_per_access', label: 'Pay per access' },
    ...(subscriptionsEnabled ? [{ value: 'subscription', label: 'Subscription' }] : []),
  ];

  return (
    <div className="cedros-data-toolbar cedros-admin__toolbar">
      {/* Host toolbar anatomy: filters in `__left`, actions in `__right`. */}
      <div className="cedros-data-toolbar__left">
      <div className="cedros-admin__filter cedros-admin__toolbar-search">
        <label className="cedros-admin__filter-label" htmlFor="cedros-pay-product-filter">Search</label>
        <div className="cedros-admin__search-field">
          <span className="cedros-admin__search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id="cedros-pay-product-filter"
            type="search"
            className="cedros-data-input cedros-admin__input"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter products…"
          />
          {search ? (
            <button
              type="button"
              className="cedros-admin__search-clear"
              aria-label="Clear search"
              title="Clear search"
              onClick={() => onSearchChange('')}
            >
              {Icons.close}
            </button>
          ) : null}
        </div>
      </div>
      <div className="cedros-admin__filter">
        <span className="cedros-admin__filter-label">Status</span>
        <FilterDropdown
          ariaLabel="Status"
          value={statusFilter}
          onChange={(value) => onStatusFilterChange(value as 'all' | 'active' | 'inactive')}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </div>
      <div className="cedros-admin__filter">
        <span className="cedros-admin__filter-label">Type</span>
        <FilterDropdown
          ariaLabel="Type"
          value={typeFilter}
          onChange={(value) => onTypeFilterChange(value as 'all' | AdminProductType)}
          options={typeOptions}
        />
      </div>
      </div>
      {actions}
    </div>
  );
}
