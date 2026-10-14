/**
 * Tests for fetchWithTimeout utility
 *
 * Regression tests for timeout and abort handling:
 * - Timeout abort scenario
 * - Caller abort before timeout
 * - Already-aborted signal
 * - Cleanup of event listeners
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout } from '../fetchWithTimeout';

function mockAbortAwareFetch() {
  const signals: AbortSignal[] = [];
  (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
    (_url: string, options?: RequestInit) =>
      new Promise((_resolve, reject) => {
        if (!options?.signal) {
          reject(new Error('missing abort signal'));
          return;
        }
        signals.push(options.signal);
        options.signal.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true }
        );
      })
  );
  return signals;
}

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock fetch globally
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should complete successfully within timeout', async () => {
    const mockResponse = new Response('success', { status: 200 });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const promise = fetchWithTimeout('https://example.com/api', {}, 5000);

    // Fast-forward time but not past timeout
    vi.advanceTimersByTime(100);

    const result = await promise;
    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should abort request when timeout is reached', async () => {
    const signals = mockAbortAwareFetch();

    const promise = fetchWithTimeout('https://example.com/api', {}, 1000);

    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    const rejection = expect(promise).rejects.toThrow('Request timeout after 1000ms');
    await vi.advanceTimersByTimeAsync(1000);

    expect(signals[0].aborted).toBe(true);
    await rejection;
  });

  it('should honor caller abort signal', async () => {
    const controller = new AbortController();
    const signals = mockAbortAwareFetch();

    const promise = fetchWithTimeout('https://example.com/api', { signal: controller.signal }, 5000);

    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    controller.abort();

    expect(signals[0].aborted).toBe(true);
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('should detect already-aborted signal and reject immediately', async () => {
    const controller = new AbortController();
    controller.abort(); // Abort before calling fetchWithTimeout

    const promise = fetchWithTimeout('https://example.com/api', { signal: controller.signal }, 5000);

    await expect(promise).rejects.toThrow(/abort|operation was aborted/i);

    // fetch should never be called if signal is already aborted
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should clean up event listeners on success', async () => {
    const controller = new AbortController();
    const mockResponse = new Response('success', { status: 200 });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

    await fetchWithTimeout('https://example.com/api', { signal: controller.signal }, 5000);
    vi.advanceTimersByTime(100);

    expect(vi.getTimerCount()).toBe(0);

    // Verify cleanup
    expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('should clean up event listeners on error', async () => {
    const controller = new AbortController();
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener');

    await expect(
      fetchWithTimeout('https://example.com/api', { signal: controller.signal }, 5000)
    ).rejects.toThrow('Network error');

    vi.advanceTimersByTime(100);

    expect(vi.getTimerCount()).toBe(0);

    // Verify cleanup
    expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

});
