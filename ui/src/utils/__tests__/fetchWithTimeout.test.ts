/**
 * Tests for fetchWithTimeout utility
 *
 * Regression tests for STAB-001 and STAB-003:
 * - Timeout abort scenario
 * - Caller abort before timeout
 * - Already-aborted signal
 * - Cleanup of event listeners
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout } from '../fetchWithTimeout';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    // Mock fetch to never resolve (simulating slow request)
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      new Promise((_resolve, reject) => {
        // Listen for abort signal
        setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100);
      })
    );

    const promise = fetchWithTimeout('https://example.com/api', {}, 1000);

    // Fast-forward past timeout
    vi.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow(/timeout|aborted/i);
  });

  it('should honor caller abort signal', async () => {
    const controller = new AbortController();

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      new Promise((_resolve, reject) => {
        setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100);
      })
    );

    const promise = fetchWithTimeout('https://example.com/api', { signal: controller.signal }, 5000);

    // Abort from caller before timeout
    controller.abort();
    vi.advanceTimersByTime(200);

    await expect(promise).rejects.toThrow(/abort/i);
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

    // Verify cleanup
    expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('should timeout before fetch rejects', async () => {
    // Mock fetch to never resolve (simulating slow request)
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, options?: RequestInit) =>
        new Promise((_resolve, reject) => {
          // Listen for abort on the provided signal
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        })
    );

    const timeoutPromise = fetchWithTimeout('https://example.com/api', {}, 1000);

    // Fast-forward past timeout - this should trigger abort
    vi.advanceTimersByTime(1500);

    await expect(timeoutPromise).rejects.toThrow(/timeout|abort/i);
  });

  it('should abort from caller signal', async () => {
    const controller = new AbortController();

    // Mock fetch to listen for abort
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, options?: RequestInit) =>
        new Promise((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        })
    );

    const callerPromise = fetchWithTimeout('https://example.com/api', { signal: controller.signal }, 10000);

    // Abort from caller before timeout
    controller.abort();
    vi.advanceTimersByTime(100);

    await expect(callerPromise).rejects.toThrow(/abort/i);
  });
});
