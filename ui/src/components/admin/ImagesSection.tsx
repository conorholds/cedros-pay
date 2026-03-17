/**
 * Admin Dashboard — Images Section
 *
 * Upload images via multipart POST /admin/images/upload and manage
 * session-scoped uploads. No gallery browsing — server has no list endpoint.
 *
 * Endpoints:
 *   POST /admin/images/upload  multipart { file } → { url, thumbUrl }
 *   DELETE /admin/images       JSON { url }        → { deleted: true }
 */

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import type { SectionProps } from './types';
import { formatDateTime } from '../../utils/dateHelpers';
import { getLogger } from '../../utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UploadedImage {
  url: string;
  thumbUrl: string;
  uploadedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function uploadImage(
  serverUrl: string,
  apiKey: string | undefined,
  authManager: SectionProps['authManager'],
  file: File,
): Promise<{ url: string; thumbUrl: string }> {
  const form = new FormData();
  form.append('file', file);

  if (authManager?.isAuthenticated()) {
    // Must NOT set Content-Type — browser sets multipart boundary automatically.
    return authManager.fetchWithAuth<{ url: string; thumbUrl: string }>(
      '/admin/images/upload',
      { method: 'POST', body: form, headers: {} },
    );
  }

  const headers: Record<string, string> = {};
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(`${serverUrl}/admin/images/upload`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

async function deleteImage(
  serverUrl: string,
  apiKey: string | undefined,
  authManager: SectionProps['authManager'],
  url: string,
): Promise<void> {
  const body = JSON.stringify({ url });

  if (authManager?.isAuthenticated()) {
    await authManager.fetchWithAuth('/admin/images', {
      method: 'DELETE',
      body,
    });
    return;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(`${serverUrl}/admin/images`, {
    method: 'DELETE',
    headers,
    body,
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ImagesSection({ serverUrl, apiKey, authManager }: SectionProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadImage(serverUrl, apiKey, authManager, file);
      setImages((prev) => [
        { url: result.url, thumbUrl: result.thumbUrl, uploadedAt: new Date().toISOString() },
        ...prev,
      ]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      getLogger().error('[ImagesSection] Upload failed:', err, {
        serverUrl: serverUrl.slice(0, 20) + '...',
      });
      setError('Upload failed. Check file type and try again.');
    } finally {
      setIsUploading(false);
    }
  }, [serverUrl, apiKey, authManager]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
  };

  const handleUploadClick = () => {
    if (selectedFile) handleUpload(selectedFile);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError(null);
    } else if (file) {
      setError('Only image files are accepted.');
    }
  };

  const handleDelete = useCallback(async (url: string) => {
    setDeletingUrl(url);
    setError(null);
    try {
      await deleteImage(serverUrl, apiKey, authManager, url);
      setImages((prev) => prev.filter((img) => img.url !== url));
    } catch (err) {
      getLogger().error('[ImagesSection] Delete failed:', err, {
        serverUrl: serverUrl.slice(0, 20) + '...',
      });
      setError('Failed to delete image.');
    } finally {
      setDeletingUrl(null);
    }
  }, [serverUrl, apiKey, authManager]);

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  };

  const dropZoneClass = [
    'cedros-admin__drop-zone',
    isDragOver ? 'cedros-admin__drop-zone--active' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="cedros-admin__page">
      <ErrorBanner message={error} />

      {/* Upload area */}
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">Image Upload</h3>
      </div>

      <div
        className={dropZoneClass}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="Image drop zone"
        style={{
          border: '2px dashed',
          borderColor: isDragOver ? 'var(--cedros-accent, #6366f1)' : 'var(--cedros-border, #e2e8f0)',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          textAlign: 'center',
          marginBottom: '1rem',
          transition: 'border-color 0.15s',
          backgroundColor: isDragOver ? 'var(--cedros-accent-subtle, rgba(99,102,241,0.06))' : undefined,
        }}
      >
        <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem', opacity: 0.7 }}>
          Drag and drop an image here, or select a file below
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            id="cedros-image-file-input"
            type="file"
            accept="image/*"
            className="cedros-admin__input"
            style={{ maxWidth: 260 }}
            onChange={handleFileChange}
            aria-label="Select image file"
          />
          <button
            type="button"
            className="cedros-admin__button cedros-admin__button--primary"
            onClick={handleUploadClick}
            disabled={!selectedFile || isUploading}
            aria-busy={isUploading}
          >
            {isUploading ? <>{Icons.loading} Uploading...</> : 'Upload'}
          </button>
        </div>

        {selectedFile && !isUploading && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.65 }}>
            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Session uploads */}
      <div className="cedros-admin__section-header">
        <h3 className="cedros-admin__section-title">
          Uploaded This Session
          {images.length > 0 && (
            <span className="cedros-admin__section-badge" style={{ marginLeft: '0.5rem' }}>
              {images.length}
            </span>
          )}
        </h3>
      </div>

      {images.length === 0 ? (
        <div className="cedros-admin__empty">No images uploaded yet.</div>
      ) : (
        <div className="cedros-admin__table-container">
          <table className="cedros-admin__table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>URL</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img.url}>
                  <td style={{ width: 72 }}>
                    <img
                      src={img.thumbUrl}
                      alt="Thumbnail preview"
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: 'cover',
                        borderRadius: '0.25rem',
                        display: 'block',
                      }}
                    />
                  </td>
                  <td style={{ maxWidth: 320, wordBreak: 'break-all' }}>
                    <code style={{ fontSize: '0.8rem' }}>{img.url}</code>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatDateTime(img.uploadedAt)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="cedros-admin__button cedros-admin__button--ghost"
                        onClick={() => handleCopy(img.url)}
                        aria-label="Copy URL to clipboard"
                        title="Copy URL"
                      >
                        {copiedUrl === img.url ? Icons.check : Icons.eye}
                        {copiedUrl === img.url ? 'Copied' : 'Copy URL'}
                      </button>
                      <button
                        type="button"
                        className="cedros-admin__button cedros-admin__button--destructive"
                        onClick={() => handleDelete(img.url)}
                        disabled={deletingUrl === img.url}
                        aria-label="Delete image"
                        title="Delete"
                      >
                        {deletingUrl === img.url ? Icons.loading : Icons.trash}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
