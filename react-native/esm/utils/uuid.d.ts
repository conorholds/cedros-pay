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
export declare function generateUUID(): string;
//# sourceMappingURL=uuid.d.ts.map