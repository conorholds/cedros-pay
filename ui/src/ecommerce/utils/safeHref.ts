/**
 * Validates a URL string for safe use in `<a href>` attributes.
 *
 * Returns the URL if it uses a safe protocol (https, http), otherwise returns
 * undefined. This prevents `javascript:`, `data:`, and other dangerous schemes
 * from being rendered as clickable links.
 */
export function safeHref(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url, 'https://placeholder.invalid');
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return url;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
