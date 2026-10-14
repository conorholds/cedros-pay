import { createContext, useMemo, type ReactNode } from 'react';
import { createCedrosAutosavePersistence } from './persistence';
import type {
  AutosavePersistenceAdapter,
  CedrosAutosaveDebounceProfiles,
  CedrosAutosaveProviderValue,
  CedrosAutosaveTelemetryHook,
} from './types';

export const DEFAULT_AUTOSAVE_DEBOUNCE_PROFILES: CedrosAutosaveDebounceProfiles = {
  text: 800,
  longDraft: 1200,
  selectToggle: 150,
  background: 2000,
  control: 150,
  none: 0,
};

export const CedrosAutosaveContext = createContext<CedrosAutosaveProviderValue>({
  debounceProfiles: DEFAULT_AUTOSAVE_DEBOUNCE_PROFILES,
  editingSessionId: createAutosaveId(),
  persistence: createCedrosAutosavePersistence(),
  createId: createAutosaveId,
});

export function createAutosaveId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `autosave_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function CedrosAutosaveProvider({
  children,
  debounceProfiles,
  editingSessionId,
  persistence,
  telemetry,
}: {
  children: ReactNode;
  debounceProfiles?: Partial<CedrosAutosaveDebounceProfiles>;
  editingSessionId?: string;
  persistence?: AutosavePersistenceAdapter;
  telemetry?: CedrosAutosaveTelemetryHook;
}) {
  const value = useMemo<CedrosAutosaveProviderValue>(
    () => ({
      debounceProfiles: {
        ...DEFAULT_AUTOSAVE_DEBOUNCE_PROFILES,
        ...debounceProfiles,
      },
      editingSessionId: editingSessionId ?? createAutosaveId(),
      persistence: persistence ?? createCedrosAutosavePersistence(),
      telemetry,
      createId: createAutosaveId,
    }),
    [debounceProfiles, editingSessionId, persistence, telemetry]
  );

  return (
    <CedrosAutosaveContext.Provider value={value}>
      {children}
    </CedrosAutosaveContext.Provider>
  );
}
