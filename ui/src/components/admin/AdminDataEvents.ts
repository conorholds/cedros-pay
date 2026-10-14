import { getLogger } from '../../utils/logger';

export const ADMIN_DATA_INVALIDATED_EVENT = 'cedros-pay:data-invalidated';

export interface ExtensionDataEvent {
  cursor: number;
  extensionId: string;
  resourceKind: string;
}

export interface AdminDataEventsOptions {
  serverUrl: string;
  authHeaders: (path: string) => Promise<Record<string, string>>;
  credentials: () => RequestCredentials;
  invalidate: () => void;
}

/** One ref-counted, reconnecting Core invalidation stream per admin manager. */
export class AdminDataEvents {
  private readonly endpoint: string;
  private readonly endpointPath = '/admin/runtime/extensions/cedros-pay/data-events';
  private readonly options: AdminDataEventsOptions;
  private retainCount = 0;
  private generation = 0;
  private cursor = 0;
  private reconnects = 0;
  private connectedOnce = false;
  private abort: AbortController | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: AdminDataEventsOptions) {
    this.options = options;
    this.endpoint = `${coreServerUrl(options.serverUrl)}${this.endpointPath}`;
  }

  retain(): () => void {
    this.retainCount += 1;
    if (this.retainCount === 1) this.connectSoon(0);
    return () => {
      this.retainCount = Math.max(0, this.retainCount - 1);
      if (this.retainCount === 0) this.stop();
    };
  }

  restartIdentity(): void {
    this.cursor = 0;
    this.connectedOnce = false;
    this.reconnects = 0;
    this.stopConnection();
    if (this.retainCount > 0) this.connectSoon(0);
  }

  private connectSoon(delayMs: number): void {
    if (this.retainCount === 0) return;
    if (this.timer) clearTimeout(this.timer);
    const generation = this.generation;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (generation === this.generation) void this.connect(generation);
    }, jitter(delayMs));
  }

  private async connect(generation: number): Promise<void> {
    try {
      const path = `${this.endpointPath}?after=${this.cursor}`;
      const authHeaders = await this.options.authHeaders(path);
      if (generation !== this.generation || this.retainCount === 0) return;
      this.abort = new AbortController();
      const response = await fetch(`${this.endpoint}?after=${this.cursor}`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(this.cursor > 0 ? { 'Last-Event-ID': String(this.cursor) } : {}),
          ...authHeaders,
        },
        credentials: this.options.credentials(),
        signal: this.abort.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error(`data event stream failed with ${response.status}`);
      }
      if (this.connectedOnce) this.notifyInvalidation('reconnected');
      this.connectedOnce = true;
      this.reconnects = 0;
      await consumeSse(response.body, (event) => this.receive(event, generation));
      throw new Error('data event stream ended');
    } catch (error) {
      if (generation !== this.generation || this.retainCount === 0) return;
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.reconnects += 1;
      getLogger().warn('[AdminDataEvents] connection_failed');
      const delay = Math.min(1000 * 2 ** Math.min(this.reconnects - 1, 6), 60000);
      this.connectSoon(delay);
    }
  }

  private receive(event: ParsedSseEvent, generation: number): void {
    if (generation !== this.generation || event.event !== 'extension-data-change') return;
    let data: ExtensionDataEvent;
    try {
      data = JSON.parse(event.data) as ExtensionDataEvent;
    } catch {
      getLogger().warn('[AdminDataEvents] malformed_event');
      return;
    }
    const accepted = advanceDataCursor(this.cursor, data);
    if (!accepted) return;
    this.cursor = accepted.cursor;
    // Cache fill/eviction events are transport bookkeeping. Authoritative entry
    // and setting events drive UI reconciliation and avoid cache-fill loops.
    if (accepted.invalidate) this.notifyInvalidation('event');
  }

  private notifyInvalidation(reason: 'event' | 'reconnected'): void {
    this.options.invalidate();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ADMIN_DATA_INVALIDATED_EVENT, { detail: { reason } }));
    }
  }

  private stopConnection(): void {
    this.generation += 1;
    this.abort?.abort();
    this.abort = undefined;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private stop(): void {
    this.stopConnection();
    this.reconnects = 0;
    // A deliberate release/re-retain cycle is a new stream lifecycle, not a
    // transport reconnect. Missed events are still replayed from `cursor`, so
    // treating the next connection as a reconnect only creates a redundant
    // cache invalidation that can fence otherwise successful first-load reads.
    this.connectedOnce = false;
  }
}

interface ParsedSseEvent {
  event: string;
  data: string;
}

export function advanceDataCursor(
  current: number,
  data: ExtensionDataEvent
): { cursor: number; invalidate: boolean } | undefined {
  if (
    data.extensionId !== 'cedros-pay'
    || !Number.isSafeInteger(data.cursor)
    || data.cursor <= current
  ) return undefined;
  return { cursor: data.cursor, invalidate: data.resourceKind !== 'cache' };
}

export async function consumeSse(
  stream: ReadableStream<Uint8Array>,
  receive: (event: ParsedSseEvent) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, '\n');
      if (done) buffer = buffer.replace(/\r/g, '\n');
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseEvent(block);
        if (parsed) receive(parsed);
        boundary = buffer.indexOf('\n\n');
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseEvent(block: string): ParsedSseEvent | undefined {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue;
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    if (field === 'data') data.push(value);
  }
  return data.length > 0 ? { event, data: data.join('\n') } : undefined;
}

function coreServerUrl(serverUrl: string): string {
  return serverUrl.trim().replace(/\/+$/, '').replace(/\/extensions\/cedros-pay$/, '');
}

function jitter(delay: number): number {
  if (delay <= 0) return 0;
  return Math.max(1, Math.round(delay * (0.9 + Math.random() * 0.2)));
}
