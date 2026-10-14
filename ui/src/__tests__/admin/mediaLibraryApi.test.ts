import { describe, expect, it } from 'vitest';
import {
  selectMediaLibraryImageUrl,
  type MediaLibraryAsset,
} from '../../components/admin/mediaLibraryApi';

describe('mediaLibraryApi', () => {
  it('selects a ready host media thumbnail and resolves relative URLs', () => {
    const asset: MediaLibraryAsset = {
      id: 'asset_1',
      filename: 'product.png',
      assetClass: 'image',
      contentType: 'image/png',
      variants: [
        {
          url: '/media/product-thumb.webp',
          contentType: 'image/webp',
          kind: 'thumbnail',
          storageStatus: 'stored',
          processingStatus: 'ready',
        },
      ],
      storage: {
        status: 'stored',
        originalUrl: '/media/product.png',
      },
    };

    expect(selectMediaLibraryImageUrl(asset, 'https://admin.example.com')).toBe(
      'https://admin.example.com/media/product-thumb.webp'
    );
  });

  it('rejects non-image or unavailable media assets', () => {
    const documentAsset: MediaLibraryAsset = {
      id: 'asset_doc',
      contentType: 'application/pdf',
      storage: {
        status: 'stored',
        originalUrl: '/media/catalog.pdf',
      },
    };
    const pendingImage: MediaLibraryAsset = {
      id: 'asset_pending',
      assetClass: 'image',
      contentType: 'image/png',
      storage: {
        status: 'pending',
        originalUrl: '/media/pending.png',
      },
    };

    expect(selectMediaLibraryImageUrl(documentAsset, 'https://admin.example.com')).toBeNull();
    expect(selectMediaLibraryImageUrl(pendingImage, 'https://admin.example.com')).toBeNull();
  });
});
