import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductMediaPicker } from '../../components/admin/ProductMediaPicker';

const mocks = vi.hoisted(() => ({
  fetchMediaLibraryImages: vi.fn(),
  selectMediaLibraryImageUrl: vi.fn(() => 'https://example.test/widget.png'),
}));

vi.mock('../../components/admin/mediaLibraryApi', () => ({
  fetchMediaLibraryImages: mocks.fetchMediaLibraryImages,
  selectMediaLibraryImageUrl: mocks.selectMediaLibraryImageUrl,
}));

describe('ProductMediaPicker', () => {
  beforeEach(() => {
    mocks.fetchMediaLibraryImages.mockReset();
    mocks.selectMediaLibraryImageUrl.mockClear();
  });

  it('retries a failed first load without showing a false empty state', async () => {
    mocks.fetchMediaLibraryImages
      .mockRejectedValueOnce(new Error('Media service unavailable'))
      .mockResolvedValueOnce([{
        id: 'asset-1',
        filename: 'widget.png',
        mimeType: 'image/png',
        sizeBytes: 100,
        createdAt: '2026-07-09T00:00:00Z',
      }]);

    render(
      <ProductMediaPicker
        open
        serverUrl="https://example.test"
        onClose={() => undefined}
        onSelect={() => undefined}
      />
    );

    expect(await screen.findByText('Media service unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No images found.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('option', { name: 'widget.png' })).toBeInTheDocument();
    expect(mocks.fetchMediaLibraryImages).toHaveBeenCalledTimes(2);
  });
});
