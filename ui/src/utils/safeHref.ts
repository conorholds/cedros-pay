export function safeHref(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, 'http://localhost');
    if (url.protocol === 'javascript:') return undefined;
    return value;
  } catch {
    return undefined;
  }
}
