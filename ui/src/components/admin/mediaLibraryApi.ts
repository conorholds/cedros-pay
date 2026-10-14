import type { IAdminAuthManager } from './AdminAuthManager';
import { requireAdminAuth } from './authFetch';

export interface MediaLibraryVariant {
  url?: string;
  contentType?: string;
  kind?: string;
  storageStatus?: string;
  processingStatus?: string;
}

export interface MediaLibraryAsset {
  id: string;
  filename?: string;
  assetClass?: string;
  contentType?: string;
  variants?: MediaLibraryVariant[];
  storage?: {
    status?: string;
    originalUrl?: string;
  };
}

export interface FetchMediaLibraryImagesOptions {
  query?: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function fetchMediaLibraryImages(
  authManager: IAdminAuthManager | undefined,
  serverUrl: string,
  options: FetchMediaLibraryImagesOptions = {}
): Promise<MediaLibraryAsset[]> {
  const params = new URLSearchParams();
  const query = options.query?.trim();
  if (query) params.set('query', query);
  params.set('limit', String(options.limit ?? 48));
  params.set('offset', '0');

  const assets = await requireAdminAuth(authManager).fetchWithAuth<MediaLibraryAsset[]>(
    `/admin/media/assets?${params.toString()}`,
    { signal: options.signal }
  );

  return assets.filter((asset) => selectMediaLibraryImageUrl(asset, serverUrl) !== null);
}

export function selectMediaLibraryImageUrl(
  asset: MediaLibraryAsset,
  serverUrl: string
): string | null {
  if (!isImageAsset(asset)) return null;

  const variants = asset.variants ?? [];
  const thumbnail = variants.find(
    (variant) => isReadyImageVariant(variant) && variant.kind === 'thumbnail'
  );
  const renderableVariant =
    thumbnail ?? variants.find((variant) => isReadyImageVariant(variant));

  if (renderableVariant?.url) {
    return resolveMediaUrl(serverUrl, renderableVariant.url);
  }

  if (asset.storage?.status === 'stored' && asset.storage.originalUrl?.trim()) {
    return resolveMediaUrl(serverUrl, asset.storage.originalUrl);
  }

  return null;
}

function isImageAsset(asset: MediaLibraryAsset): boolean {
  return asset.assetClass === 'image' || isImageContentType(asset.contentType);
}

function isReadyImageVariant(variant: MediaLibraryVariant): boolean {
  return (
    variant.storageStatus === 'stored' &&
    variant.processingStatus === 'ready' &&
    Boolean(variant.url?.trim()) &&
    isImageContentType(variant.contentType)
  );
}

function isImageContentType(contentType: string | undefined): boolean {
  return typeof contentType === 'string' && contentType.toLowerCase().startsWith('image/');
}

function resolveMediaUrl(serverUrl: string, url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/iu.test(trimmed)) return trimmed;
  if (!trimmed.startsWith('/')) return trimmed;

  try {
    return new URL(trimmed, serverUrl).toString();
  } catch {
    return trimmed;
  }
}
