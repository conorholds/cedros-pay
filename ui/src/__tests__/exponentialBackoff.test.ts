import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { retryWithBackoff, RETRY_PRESETS, RetryableHttpError } from '../utils/exponentialBackoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('honors Retry-After when retrying an idempotent write', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new RetryableHttpError('Too many requests', 429, 2500))
      .mockResolvedValueOnce('ok');

    const resultPromise = retryWithBackoff(operation, {
      ...RETRY_PRESETS.IDEMPOTENT_WRITE,
      jitter: false,
      name: 'retry-after-test',
    });

    await vi.advanceTimersByTimeAsync(2499);
    expect(operation).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(resultPromise).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('coalesces identical in-flight retries behind one promise', async () => {
    let resolveOperation: ((value: string) => void) | undefined;
    const operation = vi.fn(() => new Promise<string>((resolve) => {
      resolveOperation = resolve;
    }));

    const first = retryWithBackoff(operation, {
      ...RETRY_PRESETS.IDEMPOTENT_WRITE,
      inFlightKey: 'shared-write',
      name: 'coalesce-test',
    });
    const second = retryWithBackoff(operation, {
      ...RETRY_PRESETS.IDEMPOTENT_WRITE,
      inFlightKey: 'shared-write',
      name: 'coalesce-test',
    });

    expect(operation).toHaveBeenCalledTimes(1);

    resolveOperation?.('done');
    await expect(first).resolves.toBe('done');
    await expect(second).resolves.toBe('done');
  });
});
