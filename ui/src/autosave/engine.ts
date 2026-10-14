import type {
  CedrosAutosaveOptions,
  CedrosAutosaveProviderValue,
  CedrosAutosaveSaveMetadata,
  CedrosAutosaveSaveResult,
  CedrosAutosaveState,
  CedrosAutosaveTelemetryEvent,
} from './types';
import type { AutosaveRefs, PreparedMutation } from './internalTypes';
import {
  adoptCleanDraft,
  clearTimer,
  hasPatch,
  inferUpdateMask,
  isConflictError,
  nowMs,
  payloadSizeBucket,
  readErrorStatus,
  readNetworkState,
  resourceKey,
  shouldRetry,
  validatePatch,
} from './helpers';

interface SaveState<TPatch, TResource> {
  context: CedrosAutosaveProviderValue;
  drainQueue: () => Promise<void>;
  options: CedrosAutosaveOptions<TPatch, TResource>;
  refs: AutosaveRefs<TResource>;
  setLastError: (error: unknown) => void;
  setLastSavedAt: (value: string | null) => void;
  setRetryCount: (value: number) => void;
  transition: (next: CedrosAutosaveState, extra?: Partial<CedrosAutosaveTelemetryEvent>) => void;
}

const resourceLocks = new Map<string, Promise<void>>();

export async function runLatestSave<TPatch, TResource>({
  context,
  draft: initialDraft,
  drainQueue,
  options,
  refs,
  setLastError,
  setLastSavedAt,
  setRetryCount,
  transition,
}: SaveState<TPatch, TResource> & { draft: TResource }) {
  const key = resourceKey(options);
  const draft = await waitForResourceTurn(key, refs, initialDraft, transition);
  if (draft === null) return;

  let prepared: PreparedMutation<TPatch> | null;
  try {
    prepared = await prepareMutation(options, context, refs, draft);
  } catch (error) {
    refs.pendingDraft.current = draft;
    refs.inFlight.current = false;
    setLastError(error);
    options.onPermanentFailure?.(error, draft);
    transition('failed', { payloadSizeBucket: 'unknown' });
    return;
  }
  if (!prepared) {
    adoptCleanDraft(refs, draft);
    transition('idle');
    return;
  }
  refs.pendingDraft.current = null;
  refs.inFlight.current = true;
  transition(refs.retryCount.current > 0 ? 'retrying' : 'saving', {
    payloadSizeBucket: prepared.payloadSizeBucket,
  });
  const savePromise = savePreparedMutation(prepared, draft, {
    context,
    drainQueue,
    options,
    refs,
    setLastError,
    setLastSavedAt,
    setRetryCount,
    transition,
  });
  refs.activeSave.current = savePromise;
  setResourceLock(key, savePromise);
  await savePromise;
  refs.activeSave.current = null;
}

async function waitForResourceTurn<TResource>(
  key: string,
  refs: AutosaveRefs<TResource>,
  draft: TResource,
  transition: (next: CedrosAutosaveState, extra?: Partial<CedrosAutosaveTelemetryEvent>) => void
): Promise<TResource | null> {
  const prior = resourceLocks.get(key);
  if (!prior) return draft;
  transition('queued');
  await prior.catch(() => undefined);
  return refs.pendingDraft.current ?? draft;
}

function setResourceLock(key: string, save: Promise<void>) {
  const tracked = save.finally(() => {
    if (resourceLocks.get(key) === tracked) resourceLocks.delete(key);
  });
  resourceLocks.set(key, tracked);
}

async function prepareMutation<TPatch, TResource>(
  options: CedrosAutosaveOptions<TPatch, TResource>,
  context: CedrosAutosaveProviderValue,
  refs: AutosaveRefs<TResource>,
  draft: TResource
): Promise<PreparedMutation<TPatch> | null> {
  const patch = options.makePatch(refs.confirmed.current, draft);
  if (!hasPatch(patch)) return null;
  const updateMask = options.getUpdateMask?.(patch) ?? inferUpdateMask(patch);
  const blocked = updateMask.find((field) => options.blockedFields?.includes(field));
  if (blocked) throw new Error(`Autosave blocked field: ${blocked}`);
  const validationError = await validatePatch(options, patch);
  if (validationError) throw new Error(validationError);
  const controller = new AbortController();
  refs.abort.current = controller;
  return {
    patch,
    metadata: buildMetadata(options, context, refs, updateMask, controller.signal),
    payloadSizeBucket: payloadSizeBucket(patch),
  };
}

async function savePreparedMutation<TPatch, TResource>(
  prepared: PreparedMutation<TPatch>,
  draft: TResource,
  state: SaveState<TPatch, TResource>
) {
  const started = nowMs();
  try {
    const result = await state.options.save(prepared.patch, prepared.metadata);
    completeSave(state, draft, result, started);
  } catch (error) {
    handleSaveFailure(state, draft, error, prepared.payloadSizeBucket, started);
  }
}

function completeSave<TPatch, TResource>(
  state: SaveState<TPatch, TResource>,
  draft: TResource,
  result: CedrosAutosaveSaveResult<TResource>,
  started: number
) {
  const savedAt = result.savedAt ?? new Date().toISOString();
  state.refs.inFlight.current = false;
  if (result.revision !== undefined) state.refs.baseRevision.current = result.revision;
  if (result.etag !== undefined) state.refs.etag.current = result.etag;
  state.refs.retryCount.current = 0;
  state.setRetryCount(0);
  state.setLastError(null);
  state.setLastSavedAt(savedAt);
  const confirmedDraft = result.canonicalPatchOrResource ?? draft;
  state.refs.confirmed.current = confirmedDraft;
  state.options.onSaved?.({ ...result, savedAt }, confirmedDraft);
  if (state.refs.pendingDraft.current !== null) {
    state.transition('queued');
    void state.drainQueue();
    return;
  }
  void state.context.persistence?.remove(
    state.options.persistenceKey ?? resourceKey(state.options)
  );
  state.transition('saved', { durationMs: nowMs() - started, traceId: result.traceId });
  clearTimer(state.refs.savedTimer);
  state.refs.savedTimer.current = setTimeout(() => state.transition('idle'), 1500);
}

function handleSaveFailure<TPatch, TResource>(
  state: SaveState<TPatch, TResource>,
  draft: TResource,
  error: unknown,
  payloadSizeBucketValue: string,
  started: number
) {
  state.refs.inFlight.current = false;
  state.refs.pendingDraft.current ??= draft;
  state.setLastError(error);
  if (readNetworkState() === 'offline') {
    state.transition('offline', {
      durationMs: nowMs() - started,
      payloadSizeBucket: payloadSizeBucketValue,
    });
    return;
  }
  if (isConflictError(error)) {
    state.options.onConflict?.(error, draft);
    state.transition('conflict', {
      conflictType: String(readErrorStatus(error)),
      payloadSizeBucket: payloadSizeBucketValue,
    });
    return;
  }
  if (shouldRetry(state.options, error, state.refs.retryCount.current)) {
    state.refs.retryCount.current += 1;
    state.setRetryCount(state.refs.retryCount.current);
    scheduleRetry(state, payloadSizeBucketValue);
    return;
  }
  state.options.onPermanentFailure?.(error, draft);
  state.transition('failed', {
    durationMs: nowMs() - started,
    payloadSizeBucket: payloadSizeBucketValue,
  });
}

function scheduleRetry<TPatch, TResource>(
  state: SaveState<TPatch, TResource>,
  payloadSizeBucketValue: string
) {
  const delay = state.options.retryDelayMs ?? 1000;
  state.transition('retrying', { payloadSizeBucket: payloadSizeBucketValue });
  clearTimer(state.refs.retryTimer);
  state.refs.retryTimer.current = setTimeout(() => {
    state.transition('queued', { payloadSizeBucket: payloadSizeBucketValue });
    void state.drainQueue();
  }, delay);
}

function buildMetadata<TPatch, TResource>(
  options: CedrosAutosaveOptions<TPatch, TResource>,
  context: CedrosAutosaveProviderValue,
  refs: AutosaveRefs<TResource>,
  updateMask: string[],
  signal: AbortSignal
): CedrosAutosaveSaveMetadata {
  refs.seq.current += 1;
  return {
    autosave: true,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    extensionId: options.extensionId,
    baseRevision: refs.baseRevision.current,
    etag: refs.etag.current,
    clientMutationId: context.createId(),
    editingSessionId: context.editingSessionId,
    clientSeq: refs.seq.current,
    updateMask,
    idempotencyKey: context.createId(),
    signal,
  };
}
