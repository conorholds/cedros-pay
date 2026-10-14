import { useState } from 'react';
import { AdminDialog } from './AdminDialog';
import type { IAdminAuthManager } from './AdminAuthManager';
import { Icons } from './icons';
import { TableEmptyRow } from './TableStateRows';
import { requireAdminAuth } from './authFetch';

type StripeImportStatus = 'new' | 'linked' | 'conflict';

interface StripeImportPreviewItem {
  title: string;
  description: string;
  stripeProductId: string;
  stripePriceId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  proposedProductId: string;
  status: StripeImportStatus;
  importable: boolean;
  existingProductId?: string | null;
  reason?: string | null;
  warnings: string[];
}

interface StripeImportPreviewResponse {
  products: StripeImportPreviewItem[];
  importable: number;
  linked: number;
  conflicts: number;
  warnings: number;
}

interface ImportStripeProductsResponse {
  imported: number;
  skipped: number;
}

interface ImportStripeProductsButtonProps {
  authManager?: IAdminAuthManager;
  onImported: (response: ImportStripeProductsResponse) => void | Promise<void>;
  onError: (message: string | null) => void;
}

export function ImportStripeProductsButton({
  authManager,
  onImported,
  onError,
}: ImportStripeProductsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<StripeImportPreviewResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<string | null>(null);
  const isAuthenticated = authManager?.isAuthenticated() === true;

  const loadPreview = async ({ preserveSummary = false }: { preserveSummary?: boolean } = {}) => {
    setIsLoadingPreview(true);
    if (!preserveSummary) {
      setSummary(null);
    }
    onError(null);
    try {
      const data = await requireAdminAuth(authManager).fetchWithAuth<StripeImportPreviewResponse>(
        '/admin/products/stripe-import-preview?limit=100'
      );
      setPreview(data);
      setSelectedIds(new Set(data.products.filter((item) => item.importable).map((item) => item.stripeProductId)));
      setIsOpen(true);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load Stripe import preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const importSelected = async () => {
    setIsImporting(true);
    setSummary(null);
    onError(null);
    try {
      const response = await requireAdminAuth(authManager).fetchWithAuth<ImportStripeProductsResponse>(
        '/admin/products/import-stripe',
        {
          method: 'POST',
          body: JSON.stringify({ stripeProductIds: Array.from(selectedIds) }),
        }
      );
      setSummary(`Imported ${response.imported}; skipped ${response.skipped}.`);
      await onImported(response);
      await loadPreview({ preserveSummary: true });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to import Stripe products');
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelected = (stripeProductId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(stripeProductId)) {
        next.delete(stripeProductId);
      } else {
        next.add(stripeProductId);
      }
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary cedros-admin__button--action"
        onClick={() => loadPreview()}
        disabled={!isAuthenticated || isLoadingPreview}
      >
        {isLoadingPreview ? Icons.loading : Icons.refresh}
        {isLoadingPreview ? 'Loading…' : 'Import from Stripe'}
      </button>

      {isOpen && preview && (
        <AdminDialog
          labelledBy="cedros-pay-stripe-import-title"
          onClose={() => setIsOpen(false)}
          size="large"
        >
            <div className="cedros-data-dialog__heading cedros-admin__section-header">
              <h3 id="cedros-pay-stripe-import-title" className="cedros-data-dialog__title cedros-admin__section-title">
                Stripe import preview
              </h3>
              <button
                type="button"
                className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-dialog__close"
                onClick={() => setIsOpen(false)}
                aria-label="Close Stripe import preview"
                title="Close"
              >
                {Icons.close}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span className="cedros-data-pill cedros-data-pill--success cedros-admin__badge cedros-admin__badge--success">
                {preview.importable} new
              </span>
              <span className="cedros-data-pill cedros-admin__badge cedros-admin__badge--muted">
                {preview.linked} linked
              </span>
              <span className="cedros-data-pill cedros-data-pill--warning cedros-admin__badge cedros-admin__badge--warning">
                {preview.conflicts} conflicts
              </span>
              <span className="cedros-data-pill cedros-admin__badge cedros-admin__badge--muted">
                {preview.warnings} warnings
              </span>
            </div>

            {summary && (
              <div style={{ marginBottom: '0.75rem', fontWeight: 600 }}>
                {summary}
              </div>
            )}

            <div className="cedros-data-table-wrap cedros-admin__table-container" style={{ maxHeight: 420, overflow: 'auto' }}>
              <table className="cedros-data-table cedros-admin__table" aria-busy={isLoadingPreview}>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Stripe product</th>
                    <th>Local ID</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.products.length === 0 ? (
                    <TableEmptyRow
                      columns={5}
                      title="No Stripe products found"
                      description="There are no Stripe products available to import."
                    />
                  ) : preview.products.map((item) => (
                    <tr key={item.stripeProductId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.stripeProductId)}
                          disabled={!item.importable}
                          onChange={() => toggleSelected(item.stripeProductId)}
                          aria-label={`Select ${item.title}`}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{item.title}</span>
                          <span style={{ opacity: 0.75 }}>{item.description}</span>
                          <code>{item.stripeProductId}</code>
                        </div>
                      </td>
                      <td>
                        <code>{item.proposedProductId}</code>
                        {item.existingProductId && (
                          <div style={{ opacity: 0.75 }}>Existing: {item.existingProductId}</div>
                        )}
                      </td>
                      <td>{formatStripePrice(item)}</td>
                      <td>
                        <StripeImportStatusCell item={item} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cedros-data-actions cedros-admin__form-actions">
              <button
                type="button"
                className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary"
                onClick={() => loadPreview()}
                disabled={isLoadingPreview || isImporting}
              >
                {isLoadingPreview ? Icons.loading : Icons.refresh}
                Refresh
              </button>
              <button
                type="button"
                className="cedros-data-btn cedros-admin__button cedros-data-btn--primary cedros-admin__button--primary"
                onClick={importSelected}
                disabled={selectedIds.size === 0 || isImporting}
              >
                {isImporting ? Icons.loading : Icons.plus}
                {isImporting ? 'Importing…' : `Import ${selectedIds.size}`}
              </button>
            </div>
        </AdminDialog>
      )}
    </>
  );
}

function StripeImportStatusCell({ item }: { item: StripeImportPreviewItem }) {
  const variant =
    item.status === 'new'
      ? 'cedros-admin__badge--success'
      : item.status === 'conflict'
        ? 'cedros-admin__badge--warning'
        : 'cedros-admin__badge--muted';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className={`cedros-data-pill cedros-admin__badge ${variant}`}>{formatStatus(item.status)}</span>
      {item.reason && <span style={{ opacity: 0.75 }}>{item.reason}</span>}
      {item.warnings.map((warning) => (
        <span key={warning} className="cedros-admin__stripe-import-warning">
          {warning}
        </span>
      ))}
    </div>
  );
}

function formatStatus(status: StripeImportStatus) {
  switch (status) {
    case 'new':
      return 'New';
    case 'linked':
      return 'Linked';
    case 'conflict':
      return 'Conflict';
  }
}

function formatStripePrice(item: StripeImportPreviewItem) {
  if (typeof item.amountCents !== 'number' || !item.currency) {
    return 'No default price';
  }
  return `${item.currency.toUpperCase()} ${(item.amountCents / 100).toFixed(2)}`;
}
