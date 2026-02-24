/**
 * Default timeout for HTTP requests (15 seconds)
 */
export const DEFAULT_FETCH_TIMEOUT_MS = 15000;

/**
 * Fetch with timeout utility
 *
 * Wraps fetch() with an AbortController to enforce timeout
 * Properly handles external AbortSignals while adding timeout functionality
 * Default timeout: 15 seconds
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();

  // If caller provided their own signal, check if it's already aborted
  const externalSignal = options.signal;
  if (externalSignal?.aborted) {
    // Signal already aborted before we started - abort immediately
    controller.abort();
    // Re-throw the original AbortError instead of wrapping it
    throw new DOMException('The operation was aborted', 'AbortError');
  }

  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let externalAbortHandler: (() => void) | null = null;

  if (externalSignal) {
    // Abort our controller if external signal is triggered
    externalAbortHandler = () => controller.abort();
    externalSignal.addEventListener('abort', externalAbortHandler);
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    // Check if error is due to abort
    if (error instanceof Error && error.name === 'AbortError') {
      // Check if it was the external signal that triggered abort
      if (externalSignal?.aborted) {
        // Re-throw the original AbortError for caller to detect
        throw error;
      }
      // Otherwise it was our timeout
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    // Clean up the external abort listener
    if (externalSignal && externalAbortHandler) {
      externalSignal.removeEventListener('abort', externalAbortHandler);
    }
  }
}
