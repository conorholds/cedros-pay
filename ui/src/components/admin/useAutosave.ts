import {
  useCedrosAutosave,
  type CedrosAutosaveState,
} from '../../autosave';

export type AutosaveStatus = CedrosAutosaveState;

interface LegacyAutosaveOptions {
  ready: boolean;
  delayMs?: number;
  resourceType?: string;
  resourceId?: string;
  extensionId?: string;
}

interface LegacyAutosaveSaveResult {
  canonicalDraftKey?: string;
}

/**
 * Admin compatibility wrapper for the shared Cedros autosave primitive.
 *
 * New surfaces should use `useCedrosAutosave` directly with typed patches and
 * resource metadata. Existing admin settings keep this wrapper while they move
 * from whole-settings PUTs to the autosave PATCH protocol.
 */
export function useAutosave(
  draftKey: string,
  save: () => Promise<void | LegacyAutosaveSaveResult>,
  {
    ready,
    delayMs = 800,
    resourceType = 'admin-settings',
    resourceId = 'default',
    extensionId,
  }: LegacyAutosaveOptions
): AutosaveStatus {
  const autosave = useCedrosAutosave<{ draftKey: string }, string>({
    resourceType,
    resourceId,
    extensionId,
    draft: draftKey,
    makePatch: (previous, current) =>
      previous === current ? null : { draftKey: current },
    save: async (_patch, _metadata) => {
      const result = await save();
      return result?.canonicalDraftKey
        ? { canonicalPatchOrResource: result.canonicalDraftKey }
        : {};
    },
    debounceProfile: delayMs,
    enabled: ready,
    getUpdateMask: () => ['draft'],
    maxRetries: 0,
  });

  return autosave.status;
}
