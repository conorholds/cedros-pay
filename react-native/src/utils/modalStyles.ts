import type { CSSProperties } from 'react';

/**
 * Shared modal UI utilities
 *
 * Provides consistent styling for modal components to avoid duplication
 */

/**
 * Get styles for modal close button (×)
 * @param surfaceText - Text color from theme tokens
 * @returns CSS properties for close button
 */
export function getModalCloseButtonStyles(surfaceText: string): CSSProperties {
  return {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: surfaceText,
    opacity: 0.6,
    padding: '0.25rem',
    lineHeight: 1,
  };
}
