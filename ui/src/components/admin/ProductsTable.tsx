import { useMemo, useState, type ReactNode } from 'react';

import type { IAdminAuthManager } from './AdminAuthManager';
import { ActionMenu } from './ActionMenu';
import { Icons } from './icons';
import type { Product } from './types';
import { StripeProductSyncStatus } from './StripeProductSyncStatus';
import { useSyncStripeProduct } from './SyncStripeProductButton';
import { TableEmptyRow, TableErrorRow, TableLoadingRows } from './TableStateRows';
import {
  formatPrice,
  formatProductType,
  getProductImageUrl,
  getProductTitle,
  getStoreSetupSummary,
  type ProductSortKey,
} from './productDisplay';

interface ProductsTableProps {
  products: Product[];
  authManager?: IAdminAuthManager;
  inventoryEnabled?: boolean;
  locale?: string;
  isLoading?: boolean;
  hasLoaded?: boolean;
  error?: string | null;
  mutatingProductId?: string | null;
  emptyAction?: ReactNode;
  emptyDescription: string;
  emptyFiltered?: boolean;
  emptyTitle: string;
  onEdit: (product: Product) => void;
  onEditVariations: (product: Product) => void;
  onSetActive: (product: Product, active: boolean) => void;
  onDelete: (product: Product) => void;
  onSynced: () => void;
  onError: (message: string | null) => void;
  onRetry: () => void;
}

type SortConfig = { key: ProductSortKey; direction: 'asc' | 'desc' };

export function ProductsTable({
  products,
  authManager,
  inventoryEnabled = true,
  locale,
  isLoading = false,
  hasLoaded = false,
  error,
  mutatingProductId,
  emptyAction,
  emptyDescription,
  emptyFiltered = false,
  emptyTitle,
  onEdit,
  onEditVariations,
  onSetActive,
  onDelete,
  onSynced,
  onError,
  onRetry,
}: ProductsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const sortedProducts = useMemo(() => {
    if (!sortConfig) return products;
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    return [...products].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return (
        String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' }) *
        direction
      );
    });
  }, [products, sortConfig]);

  const toggleSort = (key: ProductSortKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const sortIcon = (key: ProductSortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <span className="cedros-admin__sort-icon cedros-admin__sort-icon--idle">{Icons.chevronUp}</span>;
    }
    return (
      <span className="cedros-admin__sort-icon">
        {sortConfig.direction === 'asc' ? Icons.chevronUp : Icons.chevronDown}
      </span>
    );
  };

  const ariaSort = (key: ProductSortKey) =>
    sortConfig?.key === key ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <div className="cedros-data-table-wrap cedros-admin__table-container">
      <table className="cedros-data-table cedros-admin__table" aria-busy={isLoading}>
        <thead>
          <tr>
            <SortableHeader label="ID" sortKey="id" ariaSort={ariaSort('id')} onSort={toggleSort}>
              {sortIcon('id')}
            </SortableHeader>
            <SortableHeader
              label="Product"
              sortKey="product"
              ariaSort={ariaSort('product')}
              onSort={toggleSort}
            >
              {sortIcon('product')}
            </SortableHeader>
            <SortableHeader label="Type" sortKey="type" ariaSort={ariaSort('type')} onSort={toggleSort}>
              {sortIcon('type')}
            </SortableHeader>
            <SortableHeader
              label="Price"
              sortKey="price"
              ariaSort={ariaSort('price')}
              onSort={toggleSort}
              className="cedros-admin__table-cell--numeric"
            >
              {sortIcon('price')}
            </SortableHeader>
            <SortableHeader
              label="Status"
              sortKey="status"
              ariaSort={ariaSort('status')}
              onSort={toggleSort}
            >
              {sortIcon('status')}
            </SortableHeader>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && !hasLoaded && sortedProducts.length === 0 ? (
            <TableLoadingRows columns={6} label="Loading products…" />
          ) : error && sortedProducts.length === 0 ? (
            <TableErrorRow columns={6} message={error} onRetry={onRetry} />
          ) : sortedProducts.length === 0 ? (
            <TableEmptyRow
              action={emptyAction}
              columns={6}
              description={emptyDescription}
              filtered={emptyFiltered}
              title={emptyTitle}
            />
          ) : sortedProducts.map((product) => {
            const imageUrl = getProductImageUrl(product);
            const storeSummary = getStoreSetupSummary(product);
            return (
              <tr key={product.id}>
                <td><code>{product.id}</code></td>
                <td>
                  <div className="cedros-data-table-summary cedros-admin__product-summary">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="cedros-admin__product-summary-image"
                      />
                    ) : (
                      <div className="cedros-admin__product-summary-placeholder" aria-hidden="true">
                        {Icons.image}
                      </div>
                    )}
                    <div className="cedros-admin__product-summary-copy">
                      <span className="cedros-admin__product-summary-title">
                        {getProductTitle(product)}
                      </span>
                      <span className="cedros-data-table-summary__preview">
                        {product.description}
                      </span>
                      {storeSummary ? (
                        <span className="cedros-data-table-summary__preview cedros-admin__product-summary-meta">
                          {storeSummary}
                        </span>
                      ) : null}
                      <StripeProductSyncStatus product={product} />
                    </div>
                  </div>
                </td>
                <td>{formatProductType(product.metadata?.product_type)}</td>
                <td className="cedros-admin__table-cell--numeric">{formatPrice(product.fiatAmountCents, locale)}</td>
                <td>
                  <span className={`cedros-data-pill cedros-admin__badge ${product.active ? 'cedros-data-pill--success cedros-admin__badge--success' : 'cedros-admin__badge--muted'}`}>
                    {product.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="cedros-data-row-actions cedros-admin__product-row-actions">
                    <ProductRowActions
                      product={product}
                      authManager={authManager}
                      inventoryEnabled={inventoryEnabled}
                      isMutating={mutatingProductId === product.id}
                      onEdit={onEdit}
                      onEditVariations={onEditVariations}
                      onSetActive={onSetActive}
                      onDelete={onDelete}
                      onSynced={onSynced}
                      onError={onError}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProductRowActions({
  product,
  authManager,
  inventoryEnabled,
  isMutating,
  onEdit,
  onEditVariations,
  onSetActive,
  onDelete,
  onSynced,
  onError,
}: Pick<
  ProductsTableProps,
  | 'authManager'
  | 'inventoryEnabled'
  | 'onEdit'
  | 'onEditVariations'
  | 'onSetActive'
  | 'onDelete'
  | 'onSynced'
  | 'onError'
> & { product: Product; isMutating: boolean }) {
  const title = getProductTitle(product);
  const { isAuthenticated, isSyncing, syncProduct } = useSyncStripeProduct({
    productId: product.id,
    authManager,
    onSynced,
    onError,
  });
  const actions = useMemo(() => [
    ...(inventoryEnabled ? [{ label: 'Edit variations', onSelect: () => onEditVariations(product) }] : []),
    {
      label: isSyncing ? 'Syncing…' : 'Sync Stripe',
      onSelect: syncProduct,
      disabled: !isAuthenticated || isSyncing || isMutating,
      disabledReason: !isAuthenticated ? 'Admin authentication is required to sync Stripe.' : undefined,
    },
    {
      label: isMutating ? 'Updating…' : product.active ? 'Make inactive' : 'Make active',
      onSelect: () => onSetActive(product, !product.active),
      disabled: !isAuthenticated || isMutating,
      disabledReason: !isAuthenticated ? 'Admin authentication is required to update products.' : undefined,
    },
    {
      label: 'Delete',
      onSelect: () => onDelete(product),
      disabled: !isAuthenticated || isMutating,
      disabledReason: !isAuthenticated ? 'Admin authentication is required to delete products.' : undefined,
      danger: true,
      separatorBefore: true,
    },
  ], [
    inventoryEnabled,
    isAuthenticated,
    isMutating,
    isSyncing,
    onDelete,
    onEditVariations,
    onSetActive,
    product,
    syncProduct,
  ]);

  return (
    <>
      <button
        type="button"
        className="cedros-data-btn cedros-data-btn--ghost cedros-data-btn--sm cedros-data-row-actions__icon"
        aria-label={`Edit ${title}`}
        title={`Edit ${title}`}
        onClick={() => onEdit(product)}
      >
        {Icons.edit}
      </button>
      <ActionMenu items={actions} label={`${title} actions`} />
      {isSyncing ? <span className="cedros-admin__visually-hidden" role="status">Syncing {title}…</span> : null}
    </>
  );
}

function getSortValue(product: Product, key: ProductSortKey): string | number {
  switch (key) {
    case 'product':
      return getProductTitle(product);
    case 'type':
      return formatProductType(product.metadata?.product_type);
    case 'price':
      return product.fiatAmountCents ?? 0;
    case 'status':
      return product.active ? 1 : 0;
    case 'id':
    default:
      return product.id;
  }
}

function SortableHeader({
  label,
  sortKey,
  ariaSort,
  children,
  onSort,
  className,
}: {
  label: string;
  sortKey: ProductSortKey;
  ariaSort: 'ascending' | 'descending' | 'none';
  children: ReactNode;
  onSort: (key: ProductSortKey) => void;
  className?: string;
}) {
  return (
    <th aria-sort={ariaSort} className={className}>
      <button
        type="button"
        className="cedros-data-table__sort cedros-admin__table-sort"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {children}
      </button>
    </th>
  );
}
