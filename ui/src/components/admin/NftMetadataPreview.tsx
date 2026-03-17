/**
 * Admin Dashboard — NFT Metadata Preview
 *
 * Fetches and displays the on-chain NFT metadata JSON for a product.
 * Uses the public endpoint: GET /paywall/v1/products/{id}/nft-metadata
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';

interface NftAttribute {
  trait_type: string;
  value: string;
}

interface NftMetadata {
  name: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes: NftAttribute[];
}

interface NftMetadataPreviewProps {
  serverUrl: string;
  productId: string;
  productTitle: string;
  apiKey?: string;
  authManager?: { isAuthenticated(): boolean; fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> };
  onClose: () => void;
}

export function NftMetadataPreview({
  serverUrl,
  productId,
  productTitle,
  apiKey,
  authManager,
  onClose,
}: NftMetadataPreviewProps) {
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const path = `/paywall/v1/products/${encodeURIComponent(productId)}/nft-metadata`;
      let data: NftMetadata;

      if (authManager?.isAuthenticated()) {
        data = await authManager.fetchWithAuth<NftMetadata>(path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['X-API-Key'] = apiKey;
        const res = await fetch(`${serverUrl}${path}`, { headers });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        data = await res.json();
      }

      setMetadata(data);
    } catch {
      setError('Failed to load NFT metadata. Ensure this product exists and the server is running.');
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, productId, apiKey, authManager]);

  useEffect(() => { fetchMetadata(); }, [fetchMetadata]);

  return (
    <div>
      <div className="cedros-admin__section-header" style={{ marginBottom: '1rem' }}>
        <h3 className="cedros-admin__section-title" style={{ fontSize: '1rem' }}>
          NFT Metadata — {productTitle}
        </h3>
        <button
          type="button"
          className="cedros-admin__button cedros-admin__button--ghost"
          onClick={onClose}
        >
          {Icons.close} Close
        </button>
      </div>

      <ErrorBanner message={error} onRetry={fetchMetadata} />

      {isLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading metadata...</div>
      ) : metadata ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Visual preview */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            border: '1px solid var(--cedros-admin-border, #e0e0e0)',
            borderRadius: '8px',
          }}>
            {metadata.image && (
              <img
                src={metadata.image}
                alt={metadata.name}
                style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600 }}>
                {metadata.name}
              </h4>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--cedros-admin-text-muted, #888)' }}>
                {metadata.description}
              </p>
              {metadata.external_url && (
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem' }}>
                  <strong>URL:</strong> <code>{metadata.external_url}</code>
                </p>
              )}
              {metadata.attributes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {metadata.attributes.map((attr) => (
                    <div
                      key={attr.trait_type}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: '1px solid var(--cedros-admin-border, #e0e0e0)',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span style={{ color: 'var(--cedros-admin-text-muted, #888)' }}>{attr.trait_type}:</span>{' '}
                      <strong>{attr.value}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON */}
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              Raw JSON (stored on-chain URI)
            </h4>
            <pre style={{
              background: 'var(--cedros-admin-bg-muted, #f5f5f5)',
              border: '1px solid var(--cedros-admin-border, #e0e0e0)',
              borderRadius: '4px',
              padding: '0.75rem',
              fontSize: '0.8rem',
              overflow: 'auto',
              maxHeight: '300px',
            }}>
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
