/**
 * Lightweight UUID v4 generator using native crypto API
 *
 * Replaces the 13 KB uuid package with ~0.5 KB native implementation
 * for ~97% bundle size reduction in this dependency
 */

/**
 * Generate a RFC4122 version 4 UUID
 * Uses native crypto.randomUUID() when available, otherwise crypto.getRandomValues().
 * Throws if secure random values are unavailable.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

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

  throw new Error('Secure UUID generation requires crypto.randomUUID or crypto.getRandomValues');
}
