import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AdminDataEvents,
  advanceDataCursor,
  consumeSse,
} from '../components/admin/AdminDataEvents';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AdminDataEvents', () => {
  it('parses fragmented SSE events and ignores keepalives', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(': keepalive\r\n\r\nevent: extension-data'));
        controller.enqueue(encoder.encode('-change\r'));
        controller.enqueue(encoder.encode('\ndata: {"cursor":7}\r\n\r\n'));
        controller.close();
      },
    });
    const events: Array<{ event: string; data: string }> = [];

    await consumeSse(stream, (event) => events.push(event));

    expect(events).toEqual([
      { event: 'extension-data-change', data: '{"cursor":7}' },
    ]);
  });

  it('rejects duplicate and out-of-order cursors and skips cache bookkeeping', () => {
    expect(advanceDataCursor(8, {
      cursor: 8,
      extensionId: 'cedros-pay',
      resourceKind: 'setting',
    })).toBeUndefined();
    expect(advanceDataCursor(8, {
      cursor: 7,
      extensionId: 'cedros-pay',
      resourceKind: 'entry',
    })).toBeUndefined();
    expect(advanceDataCursor(8, {
      cursor: 9,
      extensionId: 'other-extension',
      resourceKind: 'entry',
    })).toBeUndefined();
    expect(advanceDataCursor(8, {
      cursor: 10,
      extensionId: 'cedros-pay',
      resourceKind: 'cache',
    })).toEqual({ cursor: 10, invalidate: false });
    expect(advanceDataCursor(10, {
      cursor: 11,
      extensionId: 'cedros-pay',
      resourceKind: 'setting',
    })).toEqual({ cursor: 11, invalidate: true });
  });

  it('reconnects with the last cursor and tears down after release', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const encoder = new TextEncoder();
    const first = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(
          'event: extension-data-change\ndata: {"cursor":4,"extensionId":"cedros-pay","resourceKind":"setting"}\n\n'
        ));
        controller.close();
      },
    });
    const second = new ReadableStream<Uint8Array>({ start() {} });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(first, { status: 200 }))
      .mockResolvedValueOnce(new Response(second, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const invalidate = vi.fn();
    const events = new AdminDataEvents({
      serverUrl: 'https://data.example/extensions/cedros-pay',
      authHeaders: async () => ({ Authorization: 'Bearer test' }),
      credentials: () => 'same-origin',
      invalidate,
    });

    const release = events.retain();
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://data.example/admin/runtime/extensions/cedros-pay/data-events?after=4'
    );
    expect(invalidate).toHaveBeenCalledTimes(2); // event plus reconnect reconciliation
    release();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not invalidate successful reads after a clean release and re-retain', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const streams: ReadableStream<Uint8Array>[] = [];
    const fetchMock = vi.fn(() => {
      const stream = new ReadableStream<Uint8Array>({ start() {} });
      streams.push(stream);
      return Promise.resolve(new Response(stream, { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const invalidate = vi.fn();
    const events = new AdminDataEvents({
      serverUrl: 'https://data.example/extensions/cedros-pay',
      authHeaders: async () => ({ Authorization: 'Bearer test' }),
      credentials: () => 'same-origin',
      invalidate,
    });

    const firstRelease = events.retain();
    await vi.runOnlyPendingTimersAsync();
    firstRelease();

    const secondRelease = events.retain();
    await vi.runOnlyPendingTimersAsync();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(invalidate).not.toHaveBeenCalled();
    secondRelease();
  });
});
