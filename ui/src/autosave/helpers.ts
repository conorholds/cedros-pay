import type { AutosavePersistedDraft } from './types';
import type {
  CedrosAutosaveDebounceProfiles,
  CedrosAutosaveOptions,
  CedrosAutosaveProviderValue,
  CedrosAutosaveState,
  CedrosAutosaveTelemetryEvent,
} from './types';
import type { AutosaveRefs, AutosaveTimer } from './internalTypes';

export function hasDraftChanges<TPatch, TResource>(
  options: CedrosAutosaveOptions<TPatch, TResource>,
  refs: AutosaveRefs<TResource>,
  draft: TResource
): boolean {
  return hasPatch(options.makePatch(refs.confirmed.current, draft));
}

export function hasPatch<TPatch>(patch: TPatch | null | undefined): patch is TPatch {
  if (patch === null || patch === undefined) return false;
  if (Array.isArray(patch)) return patch.length > 0;
  if (typeof patch === 'object') return Object.keys(patch).length > 0;
  return true;
}

export async function validatePatch<TPatch, TResource>(
  options: CedrosAutosaveOptions<TPatch, TResource>,
  patch: TPatch
): Promise<string | null> {
  const result = await options.validatePatch?.(patch);
  if (!result) return null;
  if (typeof result === 'string') return result;
  if ('ok' in result) return result.ok ? null : result.message;
  return result.valid ? null : (result.reason ?? 'Autosave patch is invalid');
}

export function inferUpdateMask(patch: unknown): string[] {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return [];
  return Object.keys(patch as Record<string, unknown>);
}

export function resolveDebounceMs<TPatch, TResource>(
  options: CedrosAutosaveOptions<TPatch, TResource>,
  profiles: CedrosAutosaveDebounceProfiles
): number {
  const profile = options.debounceProfile ?? 'text';
  if (profile === 'control') return profiles.selectToggle;
  return typeof profile === 'number' ? profile : profiles[profile];
}

export function shouldRetry<TPatch, TResource>(
  options: CedrosAutosaveOptions<TPatch, TResource>,
  error: unknown,
  retryCount: number
): boolean {
  if (readNetworkState() === 'offline') return false;
  const maxRetries = options.maxRetries ?? 2;
  if (retryCount >= maxRetries) return false;
  return options.isRetryableError?.(error) ?? isRetryableStatus(readErrorStatus(error));
}

export function isConflictError(error: unknown): boolean {
  const status = readErrorStatus(error);
  return status === 409 || status === 412;
}

export function readErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('status' in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

export function adoptCleanDraft<TResource>(
  refs: AutosaveRefs<TResource>,
  draft: TResource
) {
  cleanupTimers(refs);
  refs.confirmed.current = draft;
  refs.pendingDraft.current = null;
}

export function cleanupRefs<TResource>(refs: AutosaveRefs<TResource>) {
  cleanupTimers(refs);
  refs.abort.current?.abort();
}

export function cleanupTimers<TResource>(refs: AutosaveRefs<TResource>) {
  clearTimer(refs.debounceTimer);
  clearTimer(refs.retryTimer);
  clearTimer(refs.savedTimer);
}

export function clearTimer(ref: { current: AutosaveTimer | null }) {
  if (ref.current) clearTimeout(ref.current);
  ref.current = null;
}

export async function savePendingDraft<TPatch, TResource>(
  context: CedrosAutosaveProviderValue,
  options: CedrosAutosaveOptions<TPatch, TResource>,
  refs: AutosaveRefs<TResource>,
  draft: TResource
) {
  const persistenceKey = options.persistenceKey;
  if (!persistenceKey || !context.persistence) return;
  const persisted: AutosavePersistedDraft<TResource> = {
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    extensionId: options.extensionId,
    draft,
    baseRevision: refs.baseRevision.current,
    etag: refs.etag.current,
    updatedAt: new Date().toISOString(),
  };
  await context.persistence.save(persistenceKey, persisted);
}

export function restorePersistedDraft<TPatch, TResource>(
  context: CedrosAutosaveProviderValue,
  options: CedrosAutosaveOptions<TPatch, TResource>,
  setRestoredDraft: (draft: TResource | null) => void
) {
  setRestoredDraft(null);
  if (!options.persistenceKey || !context.persistence) return;
  let cancelled = false;
  void context.persistence.load<TResource>(options.persistenceKey).then((persisted) => {
    if (cancelled || !persisted) return;
    setRestoredDraft(persisted.draft);
    options.onRestore?.(persisted.draft);
    emitTelemetry(context, options, 'autosave_local_restore', 'dirty', 1);
  });
  return () => {
    cancelled = true;
  };
}

export function bindNetworkResume<TResource>(
  refs: AutosaveRefs<TResource>,
  transition: (next: CedrosAutosaveState, extra?: Partial<CedrosAutosaveTelemetryEvent>) => void,
  drainQueue: () => Promise<void>
) {
  if (typeof window === 'undefined') return;
  const resume = () => {
    if (refs.pendingDraft.current === null) return;
    transition('queued', { event: 'autosave_resumed' });
    void drainQueue();
  };
  const pause = () => {
    if (refs.pendingDraft.current !== null || refs.inFlight.current) transition('offline');
  };
  window.addEventListener('online', resume);
  window.addEventListener('offline', pause);
  return () => {
    window.removeEventListener('online', resume);
    window.removeEventListener('offline', pause);
  };
}

export function bindLifecycleFlush<TResource>(
  refs: AutosaveRefs<TResource>,
  flush: () => Promise<void>,
  {
    flushOnBlur = true,
    flushOnPageLifecycle = true,
    warnOnUnload = true,
  }: {
    flushOnBlur?: boolean;
    flushOnPageLifecycle?: boolean;
    warnOnUnload?: boolean;
  }
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const flushIfPending = () => {
    if (hasUnsettledChanges(refs)) void flush();
  };
  const flushWhenHidden = () => {
    if (document.visibilityState === 'hidden') flushIfPending();
  };
  const warnBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasUnsettledChanges(refs)) return;
    event.preventDefault();
    event.returnValue = '';
  };

  if (flushOnBlur) document.addEventListener('focusout', flushIfPending);
  if (flushOnPageLifecycle) {
    document.addEventListener('visibilitychange', flushWhenHidden);
    window.addEventListener('pagehide', flushIfPending);
  }
  if (warnOnUnload) window.addEventListener('beforeunload', warnBeforeUnload);

  return () => {
    document.removeEventListener('focusout', flushIfPending);
    document.removeEventListener('visibilitychange', flushWhenHidden);
    window.removeEventListener('pagehide', flushIfPending);
    window.removeEventListener('beforeunload', warnBeforeUnload);
  };
}

export function emitStatusTelemetry<TPatch, TResource>(
  context: CedrosAutosaveProviderValue,
  options: CedrosAutosaveOptions<TPatch, TResource>,
  refs: AutosaveRefs<TResource>,
  status: CedrosAutosaveState,
  extra: Partial<CedrosAutosaveTelemetryEvent> = {}
) {
  emitTelemetry(
    context,
    options,
    extra.event ?? eventForStatus(status),
    status,
    queueDepth(refs),
    refs,
    extra
  );
}

export function emitManualFlush<TPatch, TResource>(
  context: CedrosAutosaveProviderValue,
  options: CedrosAutosaveOptions<TPatch, TResource>,
  refs: AutosaveRefs<TResource>
) {
  emitTelemetry(
    context,
    options,
    'autosave_manual_flush',
    refs.status.current,
    queueDepth(refs),
    refs
  );
}

export function emitTelemetry<TPatch, TResource>(
  context: CedrosAutosaveProviderValue,
  options: CedrosAutosaveOptions<TPatch, TResource>,
  event: CedrosAutosaveTelemetryEvent['event'],
  status: CedrosAutosaveState,
  queueDepthValue: number,
  refs?: AutosaveRefs<TResource>,
  extra: Partial<CedrosAutosaveTelemetryEvent> = {}
) {
  context.telemetry?.({
    event,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    extensionId: options.extensionId,
    status,
    retryCount: refs?.retryCount.current ?? 0,
    queueDepth: queueDepthValue,
    networkState: readNetworkState(),
    ...extra,
  });
}

export function payloadSizeBucket(value: unknown): string {
  const size = JSON.stringify(value).length;
  if (size <= 1024) return '0-1kb';
  if (size <= 10 * 1024) return '1-10kb';
  if (size <= 100 * 1024) return '10-100kb';
  return '100kb+';
}

export function readNetworkState(): 'online' | 'offline' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  return navigator.onLine ? 'online' : 'offline';
}

export function isDirtyStatus(status: CedrosAutosaveState): boolean {
  return !['idle', 'saved'].includes(status);
}

function hasUnsettledChanges<TResource>(refs: AutosaveRefs<TResource>): boolean {
  return (
    refs.pendingDraft.current !== null ||
    refs.inFlight.current ||
    ['dirty', 'debouncing', 'queued', 'saving', 'retrying', 'offline', 'conflict', 'failed']
      .includes(refs.status.current)
  );
}

export function nowMs(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

export function resourceKey(options: { resourceType: string; resourceId: string }) {
  return `${options.resourceType}:${options.resourceId}`;
}

function isRetryableStatus(status: number | null): boolean {
  return status === 408 || status === 429 || (status !== null && status >= 500);
}

function eventForStatus(status: CedrosAutosaveState): CedrosAutosaveTelemetryEvent['event'] {
  if (status === 'saving') return 'autosave_started';
  if (status === 'saved') return 'autosave_succeeded';
  if (status === 'failed') return 'autosave_failed';
  if (status === 'retrying') return 'autosave_retrying';
  if (status === 'conflict') return 'autosave_conflict';
  if (status === 'offline') return 'autosave_offline_paused';
  if (status === 'queued') return 'autosave_queued';
  return 'autosave_dirty';
}

function queueDepth<TResource>(refs: AutosaveRefs<TResource>): number {
  return refs.pendingDraft.current === null ? 0 : 1;
}
