import type { CedrosAutosaveSaveResult } from './types';

export interface AutosaveProblemError extends Error {
  status: number;
  problem: {
    type: string;
    title: string;
    status: number;
    detail: string;
  };
}

export function createAutosaveSaveResult<TResource = unknown>(
  overrides: Partial<CedrosAutosaveSaveResult<TResource>> = {}
): CedrosAutosaveSaveResult<TResource> {
  return {
    resourceId: 'resource_123',
    revision: 2,
    etag: '"resource:2"',
    savedAt: '2026-07-01T12:00:00.000Z',
    warnings: [],
    ...overrides,
  };
}

export function createAutosaveProblemError(
  status: number,
  detail: string,
  title = 'Autosave failed'
): AutosaveProblemError {
  const error = new Error(detail) as AutosaveProblemError;
  error.status = status;
  error.problem = {
    type: `https://docs.cedros.example/problems/autosave/${status}`,
    title,
    status,
    detail,
  };
  return error;
}

export const autosaveFailureFixtures = {
  staleEtag: () =>
    createAutosaveProblemError(412, 'The resource changed after this draft loaded.', 'Stale revision'),
  inProgress: () =>
    createAutosaveProblemError(409, 'This idempotency key is already processing.', 'In progress'),
  invalidPatch: () =>
    createAutosaveProblemError(422, 'The patch contains a blocked field.', 'Invalid patch'),
  rateLimited: () =>
    createAutosaveProblemError(429, 'Autosave is sending too many writes.', 'Rate limited'),
  serverFailure: () =>
    createAutosaveProblemError(500, 'The server could not save this draft.', 'Server failure'),
};
