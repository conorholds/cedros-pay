/**
 * Lightweight UUID v4 generator using native crypto API
 *
 * Replaces the 13 KB uuid package with ~0.5 KB native implementation
 * for ~97% bundle size reduction in this dependency
 */

/**
 * Generate a RFC4122 version 4 UUID
 * Uses native crypto.randomUUID() when available (modern browsers)
 * Falls back to Math.random() for older environments
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID() if available
  // Available in: Chrome 92+, Safari 15.4+, Firefox 95+, Edge 92+
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation for older browsers
  // Uses crypto.getRandomValues() for better randomness than Math.random()
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version (4) and variant bits per RFC4122
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // SECURITY WARNING: This final fallback uses Math.random() which is NOT cryptographically secure.
  // Only used in environments without crypto API (very rare - legacy browsers).
  // For production use, ensure crypto.randomUUID or crypto.getRandomValues is available.
  // eslint-disable-next-line no-console
  console.warn('[uuid] Using insecure Math.random() fallback. Upgrade browser for secure UUID generation.');

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
