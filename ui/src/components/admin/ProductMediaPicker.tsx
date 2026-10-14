import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner } from './ErrorBanner';
import { LoadingState } from './LoadingState';
import { AdminDialog } from './AdminDialog';
import { Icons } from './icons';
import type { IAdminAuthManager } from './AdminAuthManager';
import {
  fetchMediaLibraryImages,
  selectMediaLibraryImageUrl,
  type MediaLibraryAsset,
} from './mediaLibraryApi';
import { useScrollEdges } from './useScrollEdges';

interface ProductMediaPickerProps {
  open: boolean;
  serverUrl: string;
  authManager?: IAdminAuthManager;
  onClose: () => void;
  onSelect: (url: string) => void;
}

const LIBRARY_LIMIT = 48;

export function ProductMediaPicker({
  open,
  serverUrl,
  authManager,
  onClose,
  onSelect,
}: ProductMediaPickerProps) {
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<MediaLibraryAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const mediaGridRef = useScrollEdges<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchMediaLibraryImages(authManager, serverUrl, {
      query,
      limit: LIBRARY_LIMIT,
      signal: controller.signal,
    })
      .then(setAssets)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setAssets([]);
        setError(cause instanceof Error ? cause.message : 'Failed to load media library.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [authManager, open, query, requestVersion, serverUrl]);

  const assetTiles = useMemo(
    () =>
      assets
        .map((asset) => ({
          asset,
          url: selectMediaLibraryImageUrl(asset, serverUrl),
          label: asset.filename || asset.id,
        }))
        .filter((entry): entry is { asset: MediaLibraryAsset; url: string; label: string } =>
          entry.url !== null
        ),
    [assets, serverUrl]
  );

  if (!open) return null;

  return (
    <AdminDialog labelledBy="cedros-pay-product-image-title" onClose={onClose} size="large">
        <div className="cedros-data-dialog__heading cedros-admin__modal-header">
          <h3 id="cedros-pay-product-image-title" className="cedros-data-dialog__title cedros-admin__modal-title">
            Product image
          </h3>
          <button
            type="button"
            className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-data-dialog__close"
            onClick={onClose}
            aria-label="Close product image picker"
            title="Close"
          >
            {Icons.close}
          </button>
        </div>

        <ErrorBanner message={error} onRetry={() => setRequestVersion((version) => version + 1)} />

        <div className="cedros-data-field cedros-admin__field" style={{ marginBottom: '1rem' }}>
          <label className="cedros-data-label cedros-admin__field-label" htmlFor="cedros-pay-media-search">Search media library</label>
          <input
            id="cedros-pay-media-search"
            type="search"
            className="cedros-data-input cedros-admin__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by filename…"
          />
        </div>

        <div
          ref={mediaGridRef}
          className="cedros-admin__grid cedros-admin__grid--media cedros-admin__stagger-reveal cedros-admin__scroll-edge"
          role="listbox"
          aria-busy={isLoading}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '0.75rem',
            maxHeight: 420,
            overflow: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          {isLoading && assetTiles.length === 0 ? (
            <LoadingState label="Loading media library…" />
          ) : error && assetTiles.length === 0 ? null : assetTiles.length === 0 ? (
            <div className="cedros-data-empty cedros-admin__empty">No images found.</div>
          ) : (
            assetTiles.map(({ asset, label, url }) => (
              <button
                key={asset.id}
                type="button"
                role="option"
                aria-selected={false}
                className="cedros-admin__media-tile"
                onClick={() => {
                  onSelect(url);
                  onClose();
                }}
              >
                <span className="cedros-admin__media-tile-frame">
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </span>
                <span className="cedros-admin__media-tile-label">
                  {label}
                </span>
              </button>
            ))
          )}
        </div>
    </AdminDialog>
  );
}
