import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CedrosAutosaveContext } from './provider';
import { runLatestSave } from './engine';
import {
  adoptCleanDraft,
  bindLifecycleFlush,
  bindNetworkResume,
  cleanupRefs,
  cleanupTimers,
  clearTimer,
  emitManualFlush,
  emitStatusTelemetry,
  hasDraftChanges,
  isDirtyStatus,
  readNetworkState,
  resolveDebounceMs,
  resourceKey,
  restorePersistedDraft,
  savePendingDraft,
} from './helpers';
import type { AutosaveRefs, AutosaveTimer } from './internalTypes';
import type {
  CedrosAutosaveController,
  CedrosAutosaveOptions,
  CedrosAutosaveState,
  CedrosAutosaveTelemetryEvent,
} from './types';

export function useCedrosAutosave<TPatch, TResource>(
  options: CedrosAutosaveOptions<TPatch, TResource>
): CedrosAutosaveController<TResource> {
  const context = useContext(CedrosAutosaveContext);
  const optionsRef = useLatestRef(options);
  const refs = useAutosaveRefs(options);
  const [status, setStatus] = useState<CedrosAutosaveState>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<unknown>(null);
  const [restoredDraft, setRestoredDraft] = useState<TResource | null>(null);

  const transition = useCallback(
    (next: CedrosAutosaveState, extra?: Partial<CedrosAutosaveTelemetryEvent>) => {
      refs.status.current = next;
      setStatus(next);
      optionsRef.current.onStatusChange?.(next);
      emitStatusTelemetry(context, optionsRef.current, refs, next, extra);
    },
    [context, optionsRef, refs]
  );

  const persistPending = useCallback(
    (draft: TResource) => {
      refs.pendingDraft.current = draft;
      return savePendingDraft(context, optionsRef.current, refs, draft);
    },
    [context, optionsRef, refs]
  );

  const drainQueue = useCallback(async () => {
    if (refs.inFlight.current) {
      transition('queued');
      return;
    }
    if (refs.pendingPersistence.current) {
      const persisted = await refs.pendingPersistence.current;
      if (!persisted) return;
    }
    const draft = refs.pendingDraft.current;
    if (draft === null) return;
    if (readNetworkState() === 'offline') {
      transition('offline');
      return;
    }
    await runLatestSave({
      context,
      draft,
      drainQueue,
      options: optionsRef.current,
      refs,
      setLastError,
      setLastSavedAt,
      setRetryCount,
      transition,
    });
  }, [context, optionsRef, refs, transition]);

  const scheduleDraft = useCallback(
    (draft: TResource) => {
      clearTimer(refs.savedTimer);
      clearTimer(refs.debounceTimer);
      const pendingPersistence = persistPending(draft).then(
        () => true,
        (error) => {
          setLastError(error);
          optionsRef.current.onPermanentFailure?.(error, draft);
          transition('failed');
          return false;
        }
      );
      const trackedPersistence = pendingPersistence.finally(() => {
        if (refs.pendingPersistence.current === trackedPersistence) {
          refs.pendingPersistence.current = null;
        }
      });
      refs.pendingPersistence.current = trackedPersistence;
      if (readNetworkState() === 'offline') {
        transition('offline');
        return;
      }
      const delayMs = resolveDebounceMs(optionsRef.current, context.debounceProfiles);
      transition(delayMs > 0 ? 'debouncing' : 'queued');
      refs.debounceTimer.current = setTimeout(() => void drainQueue(), delayMs);
    },
    [context.debounceProfiles, drainQueue, optionsRef, persistPending, refs, transition]
  );

  useEffect(() => {
    refs.draft.current = options.draft;
    const enabled = options.enabled !== false;
    if (!enabled) {
      refs.wasEnabled.current = false;
      adoptCleanDraft(refs, options.draft);
      return;
    }
    if (!refs.wasEnabled.current) {
      refs.wasEnabled.current = true;
      adoptCleanDraft(refs, options.draft);
      transition('idle');
      return;
    }
    if (!hasDraftChanges(optionsRef.current, refs, options.draft)) {
      adoptCleanDraft(refs, options.draft);
      transition('idle');
      return;
    }
    scheduleDraft(options.draft);
  }, [options.draft, options.enabled, options.resourceId, options.resourceType, optionsRef, refs, scheduleDraft, transition]);

  useEffect(() => {
    if (options.baseRevision !== undefined) refs.baseRevision.current = options.baseRevision;
    if (options.etag !== undefined) refs.etag.current = options.etag;
  }, [options.baseRevision, options.etag, refs]);

  useEffect(
    () => restorePersistedDraft(context, optionsRef.current, setRestoredDraft),
    [context, options.persistenceKey, options.resourceId, options.resourceType, optionsRef]
  );

  useEffect(() => bindNetworkResume(refs, transition, drainQueue), [drainQueue, refs, transition]);

  useEffect(() => () => cleanupRefs(refs), [refs]);

  const flush = useCallback(async () => {
    clearTimer(refs.debounceTimer);
    emitManualFlush(context, optionsRef.current, refs);
    await drainQueue();
    await refs.activeSave.current;
    await drainQueue();
  }, [context, drainQueue, optionsRef, refs]);

  useEffect(
    () =>
      bindLifecycleFlush(refs, flush, {
        flushOnBlur: options.flushOnBlur,
        flushOnPageLifecycle: options.flushOnPageLifecycle,
        warnOnUnload: options.warnOnUnload,
      }),
    [
      flush,
      options.flushOnBlur,
      options.flushOnPageLifecycle,
      options.warnOnUnload,
      refs,
    ]
  );

  const retry = useCallback(async () => {
    clearTimer(refs.retryTimer);
    transition('queued');
    await drainQueue();
  }, [drainQueue, refs, transition]);

  const discard = useCallback(async () => {
    cleanupTimers(refs);
    refs.pendingDraft.current = null;
    refs.confirmed.current = refs.draft.current;
    await context.persistence?.remove(optionsRef.current.persistenceKey ?? resourceKey(optionsRef.current));
    transition('idle', { event: 'autosave_discarded', queueDepth: 0 });
  }, [context.persistence, optionsRef, refs, transition]);

  return useMemo(
    () => ({
      status,
      retryCount,
      isDirty: isDirtyStatus(status),
      lastSavedAt,
      lastError,
      restoredDraft,
      flush,
      retry,
      discard,
    }),
    [discard, flush, lastError, lastSavedAt, restoredDraft, retry, retryCount, status]
  );
}

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function useAutosaveRefs<TResource>(options: {
  draft: TResource;
  baseRevision?: number | string;
  etag?: string;
  enabled?: boolean;
}): AutosaveRefs<TResource> {
  const activeSave = useRef<Promise<void> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const baseRevision = useRef(options.baseRevision);
  const confirmed = useRef(options.draft);
  const debounceTimer = useRef<AutosaveTimer | null>(null);
  const draft = useRef(options.draft);
  const etag = useRef(options.etag);
  const inFlight = useRef(false);
  const pendingDraft = useRef<TResource | null>(null);
  const pendingPersistence = useRef<Promise<boolean> | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<AutosaveTimer | null>(null);
  const savedTimer = useRef<AutosaveTimer | null>(null);
  const seq = useRef(0);
  const status = useRef<CedrosAutosaveState>('idle');
  const wasEnabled = useRef(options.enabled !== false);

  return useMemo(
    () => ({
      activeSave,
      abort,
      baseRevision,
      confirmed,
      debounceTimer,
      draft,
      etag,
      inFlight,
      pendingDraft,
      pendingPersistence,
      retryCount,
      retryTimer,
      savedTimer,
      seq,
      status,
      wasEnabled,
    }),
    [
      abort,
      activeSave,
      baseRevision,
      confirmed,
      debounceTimer,
      draft,
      etag,
      inFlight,
      pendingDraft,
      pendingPersistence,
      retryCount,
      retryTimer,
      savedTimer,
      seq,
      status,
      wasEnabled,
    ]
  );
}
