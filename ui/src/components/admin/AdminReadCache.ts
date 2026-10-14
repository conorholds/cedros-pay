import { getLogger } from '../../utils/logger';

interface CacheEntry {
  value: unknown;
  freshUntil: number;
  staleUntil: number;
}

interface InFlightEntry {
  generation: number;
  revision: number;
  promise: Promise<unknown>;
}

interface AdminReadCacheOptions {
  freshMs?: number;
  staleIfErrorMs?: number;
  now?: () => number;
  maxEntries?: number;
}

/**
 * Identity-scoped, memory-only admin GET cache. It coalesces concurrent reads,
 * uses a short jittered freshness window, and may preserve stale rendered data
 * after a recorded refresh error. Identity changes and successful mutations
 * fence old in-flight reads so they cannot repopulate current state.
 */
export class AdminReadCache {
  private readonly freshMs: number;
  private readonly staleIfErrorMs: number;
  private readonly now: () => number;
  private readonly maxEntries: number;
  private generation = 0;
  private revision = 0;
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, InFlightEntry>();

  constructor(options: AdminReadCacheOptions = {}) {
    this.freshMs = options.freshMs ?? 2000;
    this.staleIfErrorMs = options.staleIfErrorMs ?? 30000;
    this.now = options.now ?? Date.now;
    this.maxEntries = options.maxEntries ?? 128;
    if (!Number.isSafeInteger(this.maxEntries) || this.maxEntries <= 0) {
      throw new Error('Admin cache maxEntries must be a positive safe integer');
    }
  }

  resetIdentity(): void {
    this.generation += 1;
    this.invalidate();
    this.inFlight.clear();
  }

  invalidate(): void {
    this.revision += 1;
    this.entries.clear();
  }

  async read<T>(key: string, load: () => Promise<T>): Promise<T> {
    const now = this.now();
    this.prune(now);
    const cached = this.entries.get(key);
    if (cached && cached.freshUntil > now) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      getLogger().debug('[AdminReadCache] cache_hit');
      return clone(cached.value) as T;
    }

    const running = this.inFlight.get(key);
    if (running && running.generation === this.generation && running.revision === this.revision) {
      getLogger().debug('[AdminReadCache] request_coalesced');
      return clone(await running.promise) as T;
    }

    getLogger().debug('[AdminReadCache] cache_miss');
    const generation = this.generation;
    const revision = this.revision;
    const promise = load()
      .then((value) => this.accept(key, value, generation, revision))
      .catch((error: unknown) => this.staleOrThrow(cached, error, generation, revision));
    const entry = { generation, revision, promise };
    this.inFlight.set(key, entry);
    try {
      return clone(await promise) as T;
    } finally {
      if (this.inFlight.get(key) === entry) this.inFlight.delete(key);
    }
  }

  private accept(key: string, value: unknown, generation: number, revision: number): unknown {
    this.assertCurrent(generation, revision);
    const ttl = jitteredTtl(this.freshMs, key);
    const now = this.now();
    this.prune(now);
    this.entries.delete(key);
    this.entries.set(key, {
      value: clone(value),
      freshUntil: now + ttl,
      staleUntil: now + ttl + this.staleIfErrorMs,
    });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
    return value;
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.staleUntil <= now) this.entries.delete(key);
    }
  }

  private staleOrThrow(
    cached: CacheEntry | undefined,
    error: unknown,
    generation: number,
    revision: number
  ): unknown {
    this.assertCurrent(generation, revision);
    if (cached && cached.staleUntil > this.now()) {
      getLogger().warn('[AdminReadCache] refresh_error_stale_served');
      return cached.value;
    }
    getLogger().warn('[AdminReadCache] refresh_error_no_stale');
    throw error;
  }

  private assertCurrent(generation: number, revision: number): void {
    if (generation !== this.generation) {
      throw new Error('Admin identity changed during request');
    }
    if (revision !== this.revision) {
      throw new Error('Admin data changed during request');
    }
  }
}

function jitteredTtl(base: number, key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
  }
  return Math.max(1, Math.round(base * (0.9 + (Math.abs(hash) % 201) / 1000)));
}

function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}
