import type { ReactNode } from 'react';

export type CedrosAutosaveState =
  | 'idle'
  | 'dirty'
  | 'debouncing'
  | 'queued'
  | 'saving'
  | 'saved'
  | 'retrying'
  | 'offline'
  | 'conflict'
  | 'failed';

export type CedrosAutosaveDebounceProfile =
  | 'text'
  | 'longDraft'
  | 'selectToggle'
  | 'background'
  | 'control'
  | 'none';

export type CedrosAutosaveConflictStrategy =
  | 'reject'
  | 'fieldMerge'
  | 'lastWriterWinsApproved'
  | 'customReview'
  | 'field-level-merge'
  | 'last-writer-wins-approved'
  | 'custom-review';

export interface CedrosAutosaveSaveMetadata {
  autosave: true;
  resourceType: string;
  resourceId: string;
  extensionId?: string;
  baseRevision?: number | string;
  etag?: string;
  clientMutationId: string;
  editingSessionId: string;
  clientSeq: number;
  updateMask: string[];
  idempotencyKey: string;
  signal: AbortSignal;
}

export interface CedrosAutosaveSaveResult<TResource = unknown> {
  resourceId?: string;
  revision?: number | string;
  etag?: string;
  savedAt?: string;
  canonicalPatchOrResource?: TResource;
  warnings?: string[];
  traceId?: string;
}

export interface CedrosAutosaveValidationResult {
  valid: boolean;
  reason?: string;
}

export type CedrosAutosavePatchValidation =
  | { ok: true }
  | { ok: false; message: string }
  | CedrosAutosaveValidationResult;

export interface CedrosAutosaveTelemetryEvent {
  event:
    | 'autosave_dirty'
    | 'autosave_queued'
    | 'autosave_started'
    | 'autosave_succeeded'
    | 'autosave_failed'
    | 'autosave_retrying'
    | 'autosave_conflict'
    | 'autosave_offline_paused'
    | 'autosave_resumed'
    | 'autosave_discarded'
    | 'autosave_local_restore'
    | 'autosave_manual_flush';
  resourceType: string;
  resourceId: string;
  extensionId?: string;
  status: CedrosAutosaveState;
  durationMs?: number;
  retryCount: number;
  conflictType?: string;
  payloadSizeBucket?: string;
  queueDepth: number;
  networkState: 'online' | 'offline' | 'unknown';
  requestId?: string;
  traceId?: string;
}

export type CedrosAutosaveTelemetryHook = (
  event: CedrosAutosaveTelemetryEvent
) => void;

export interface CedrosAutosaveDebounceProfiles {
  text: number;
  longDraft: number;
  selectToggle: number;
  background: number;
  control: number;
  none: number;
}

export interface AutosavePersistedDraft<TResource = unknown> {
  resourceType: string;
  resourceId: string;
  extensionId?: string;
  draft: TResource;
  baseRevision?: number | string;
  etag?: string;
  updatedAt: string;
}

export interface AutosavePersistenceAdapter {
  load<TResource>(key: string): Promise<AutosavePersistedDraft<TResource> | null>;
  save<TResource>(key: string, draft: AutosavePersistedDraft<TResource>): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface CedrosAutosaveProviderValue {
  debounceProfiles: CedrosAutosaveDebounceProfiles;
  editingSessionId: string;
  persistence?: AutosavePersistenceAdapter;
  telemetry?: CedrosAutosaveTelemetryHook;
  createId: () => string;
}

export interface CedrosAutosaveOptions<TPatch, TResource> {
  resourceType: string;
  resourceId: string;
  extensionId?: string;
  baseRevision?: number | string;
  etag?: string;
  draft: TResource;
  makePatch: (previous: TResource, current: TResource) => TPatch | null | undefined;
  validatePatch?: (
    patch: TPatch
  ) =>
    | void
    | string
    | CedrosAutosavePatchValidation
    | Promise<void | string | CedrosAutosavePatchValidation>;
  save: (
    patch: TPatch,
    metadata: CedrosAutosaveSaveMetadata
  ) => Promise<CedrosAutosaveSaveResult<TResource>>;
  debounceProfile?: CedrosAutosaveDebounceProfile | number;
  conflictStrategy?: CedrosAutosaveConflictStrategy;
  persistenceKey?: string;
  enabled?: boolean;
  blockedFields?: string[];
  getUpdateMask?: (patch: TPatch) => string[];
  isRetryableError?: (error: unknown) => boolean;
  maxRetries?: number;
  retryDelayMs?: number;
  onSaved?: (result: CedrosAutosaveSaveResult<TResource>, draft: TResource) => void;
  onConflict?: (error: unknown, draft: TResource) => void;
  onPermanentFailure?: (error: unknown, draft: TResource) => void;
  onRestore?: (draft: TResource) => void;
  onStatusChange?: (status: CedrosAutosaveState) => void;
  flushOnBlur?: boolean;
  flushOnPageLifecycle?: boolean;
  warnOnUnload?: boolean;
}

export interface CedrosAutosaveController<TResource = unknown> {
  status: CedrosAutosaveState;
  retryCount: number;
  isDirty: boolean;
  lastSavedAt: string | null;
  lastError: unknown;
  restoredDraft: TResource | null;
  flush: () => Promise<void>;
  retry: () => Promise<void>;
  discard: () => Promise<void>;
}

export interface AutosaveResourceDefinition<TPatch = unknown> {
  extensionId: string;
  resourceType: string;
  deriveResourceId: (resource: unknown) => string;
  patchSchema: unknown;
  allowedAutosaveFields: string[];
  blockedFields: string[];
  debounceProfile: CedrosAutosaveDebounceProfile;
  optimisticUi: boolean;
  conflictStrategy: CedrosAutosaveConflictStrategy;
  validatePatch: (patch: TPatch) => CedrosAutosavePatchValidation;
  authzRequirements: string[];
  dataSensitivity: 'low' | 'moderate' | 'high' | 'restricted';
  payloadSizeExpectation: string;
  localPersistence: boolean;
  telemetryLabels: Record<string, string>;
  migrationNotes: string;
}

export interface AutosaveStatusIndicatorProps {
  status: CedrosAutosaveState;
  className?: string;
  lastSavedAt?: string | null;
  error?: unknown;
}

export interface AutosaveRetryBannerProps {
  status: CedrosAutosaveState;
  error?: unknown;
  onRetry: () => void;
}

export interface AutosaveConflictDialogProps {
  open: boolean;
  title?: string;
  children?: ReactNode;
  onReview: () => void;
  onDiscard: () => void;
}
