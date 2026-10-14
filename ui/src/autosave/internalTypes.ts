import type {
  CedrosAutosaveSaveMetadata,
  CedrosAutosaveState,
} from './types';

export type AutosaveTimer = ReturnType<typeof setTimeout>;

export interface PreparedMutation<TPatch> {
  patch: TPatch;
  metadata: CedrosAutosaveSaveMetadata;
  payloadSizeBucket: string;
}

export interface AutosaveRefs<TResource> {
  activeSave: { current: Promise<void> | null };
  abort: { current: AbortController | null };
  baseRevision: { current: number | string | undefined };
  confirmed: { current: TResource };
  debounceTimer: { current: AutosaveTimer | null };
  draft: { current: TResource };
  etag: { current: string | undefined };
  inFlight: { current: boolean };
  pendingDraft: { current: TResource | null };
  pendingPersistence: { current: Promise<boolean> | null };
  retryCount: { current: number };
  retryTimer: { current: AutosaveTimer | null };
  savedTimer: { current: AutosaveTimer | null };
  seq: { current: number };
  status: { current: CedrosAutosaveState };
  wasEnabled: { current: boolean };
}
