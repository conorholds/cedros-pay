import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AutosaveStatusIndicator,
  CedrosAutosaveProvider,
  autosaveFailureFixtures,
  createMemoryAutosavePersistence,
  createAutosaveSaveResult,
  type CedrosAutosaveSaveMetadata,
  useCedrosAutosave,
  type AutosavePersistenceAdapter,
  type CedrosAutosaveSaveResult,
} from '../../autosave';

interface Draft {
  title: string;
}

type Patch = { title: string };
type SaveFn = (
  patch: Patch,
  metadata: CedrosAutosaveSaveMetadata
) => Promise<CedrosAutosaveSaveResult<Draft>>;

function makePatch(previous: Draft, current: Draft) {
  return previous.title === current.title ? null : { title: current.title };
}

function renderAutosave(save: SaveFn, draft: Draft = { title: 'one' }) {
  return renderHook(
    ({ value }) =>
      useCedrosAutosave({
        resourceType: 'article-draft',
        resourceId: 'article_1',
        baseRevision: 1,
        draft: value,
        makePatch,
        save,
        debounceProfile: 100,
      }),
    { initialProps: { value: draft } }
  );
}

function providerWrapper(persistence = createMemoryAutosavePersistence()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <CedrosAutosaveProvider persistence={persistence}>
        {children}
      </CedrosAutosaveProvider>
    );
  };
}

describe('useCedrosAutosave', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('debounces a changed draft and sends autosave metadata', async () => {
    vi.useFakeTimers();
    const save = vi.fn<SaveFn>(async () => createAutosaveSaveResult<Draft>());
    const { result, rerender } = renderAutosave(save);

    rerender({ value: { title: 'two' } });

    expect(result.current.status).toBe('debouncing');
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toEqual({ title: 'two' });
    expect(save.mock.calls[0][1]).toMatchObject({
      autosave: true,
      resourceType: 'article-draft',
      resourceId: 'article_1',
      baseRevision: 1,
      clientSeq: 1,
      updateMask: ['title'],
    });
    expect(result.current.status).toBe('saved');
  });

  it('keeps one in-flight save and sends only the latest pending draft next', async () => {
    const pending: Array<(result: CedrosAutosaveSaveResult<Draft>) => void> = [];
    const save = vi.fn<SaveFn>(
      () =>
        new Promise<CedrosAutosaveSaveResult<Draft>>((resolve) => {
          pending.push(resolve);
        })
    );
    const { rerender } = renderHook(
      ({ value }) =>
        useCedrosAutosave({
          resourceType: 'article-draft',
          resourceId: 'article_1',
          draft: value,
          makePatch,
          save,
          debounceProfile: 0,
        }),
      { initialProps: { value: { title: 'one' } } }
    );

    rerender({ value: { title: 'two' } });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));

    rerender({ value: { title: 'three' } });
    rerender({ value: { title: 'four' } });
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending[0](createAutosaveSaveResult({ revision: 2, etag: '"article:2"' }));
      await Promise.resolve();
    });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0]).toEqual({ title: 'four' });
    expect(save.mock.calls[1][1]).toMatchObject({
      baseRevision: 2,
      etag: '"article:2"',
      clientSeq: 2,
    });
    await act(async () => {
      pending[1](createAutosaveSaveResult<Draft>({ revision: 3 }));
      await Promise.resolve();
    });
  });

  it('persists pending drafts before starting the network save', async () => {
    vi.useFakeTimers();
    let releasePersistence!: () => void;
    const persistence: AutosavePersistenceAdapter = {
      load: vi.fn(async () => null),
      save: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            releasePersistence = resolve;
          })
      ),
      remove: vi.fn(async () => undefined),
    };
    const save = vi.fn<SaveFn>(async () => createAutosaveSaveResult<Draft>());
    const { rerender } = renderHook(
      ({ value }) =>
        useCedrosAutosave({
          resourceType: 'article-draft',
          resourceId: 'article_1',
          draft: value,
          makePatch,
          save,
          debounceProfile: 0,
          persistenceKey: 'draft:article_1',
        }),
      {
        initialProps: { value: { title: 'one' } },
        wrapper: providerWrapper(persistence),
      }
    );

    rerender({ value: { title: 'two' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(persistence.save).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      releasePersistence();
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('uses the canonical saved resource as the next confirmed baseline', async () => {
    vi.useFakeTimers();
    const save = vi.fn<SaveFn>(async () =>
      createAutosaveSaveResult<Draft>({
        canonicalPatchOrResource: { title: 'two canonical' },
      })
    );
    const { rerender } = renderAutosave(save);

    rerender({ value: { title: 'two' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);

    rerender({ value: { title: 'two canonical' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures using the shared retry policy', async () => {
    vi.useFakeTimers();
    const save = vi
      .fn<SaveFn>()
      .mockRejectedValueOnce(autosaveFailureFixtures.serverFailure())
      .mockResolvedValueOnce(createAutosaveSaveResult<Draft>());
    const { result, rerender } = renderHook(
      ({ value }) =>
        useCedrosAutosave({
          resourceType: 'article-draft',
          resourceId: 'article_1',
          draft: value,
          makePatch,
          save,
          debounceProfile: 0,
          retryDelayMs: 50,
          maxRetries: 1,
        }),
      { initialProps: { value: { title: 'one' } } }
    );

    rerender({ value: { title: 'two' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('retrying');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('saved');
  });

  it('flushes a pending debounced save on focusout', async () => {
    vi.useFakeTimers();
    const save = vi.fn<SaveFn>(async () => createAutosaveSaveResult<Draft>());
    const { rerender } = renderAutosave(save);

    rerender({ value: { title: 'two' } });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      document.dispatchEvent(new Event('focusout'));
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toEqual({ title: 'two' });
  });

  it('warns before unload while autosave work is pending', () => {
    vi.useFakeTimers();
    const save = vi.fn<SaveFn>(async () => createAutosaveSaveResult<Draft>());
    const { rerender } = renderAutosave(save);

    rerender({ value: { title: 'two' } });
    const event = new Event('beforeunload', { cancelable: true });

    expect(window.dispatchEvent(event)).toBe(false);
  });

  it('restores persisted unsent drafts on mount', async () => {
    const persistence = createMemoryAutosavePersistence();
    await persistence.save<Draft>('draft:article_1', {
      resourceType: 'article-draft',
      resourceId: 'article_1',
      draft: { title: 'restored' },
      updatedAt: new Date().toISOString(),
    });
    const onRestore = vi.fn();
    const save = vi.fn<SaveFn>(async () => createAutosaveSaveResult<Draft>());

    const { result } = renderHook(
      () =>
        useCedrosAutosave({
          resourceType: 'article-draft',
          resourceId: 'article_1',
          draft: { title: 'one' },
          makePatch,
          save,
          persistenceKey: 'draft:article_1',
          onRestore,
        }),
      { wrapper: providerWrapper(persistence) }
    );

    await waitFor(() => expect(onRestore).toHaveBeenCalledWith({ title: 'restored' }));
    expect(result.current.restoredDraft).toEqual({ title: 'restored' });
  });

  it('expires old persisted drafts', async () => {
    const persistence = createMemoryAutosavePersistence();
    await persistence.save<Draft>('draft:expired', {
      resourceType: 'article-draft',
      resourceId: 'article_1',
      draft: { title: 'expired' },
      updatedAt: '2020-01-01T00:00:00.000Z',
    });

    expect(await persistence.load('draft:expired')).toBeNull();
  });

  it('replaces restored data when the identity-scoped persistence key changes', async () => {
    const persistence = createMemoryAutosavePersistence();
    const updatedAt = new Date().toISOString();
    await persistence.save<Draft>('scope-a', {
      resourceType: 'article-draft', resourceId: 'article_1',
      draft: { title: 'alpha' }, updatedAt,
    });
    await persistence.save<Draft>('scope-b', {
      resourceType: 'article-draft', resourceId: 'article_1',
      draft: { title: 'beta' }, updatedAt,
    });
    const onRestore = vi.fn();
    const save = vi.fn<SaveFn>(async () => createAutosaveSaveResult<Draft>());
    const { result, rerender } = renderHook(
      ({ persistenceKey }) => useCedrosAutosave({
        resourceType: 'article-draft', resourceId: persistenceKey,
        draft: { title: 'local' }, makePatch, save, persistenceKey, onRestore,
      }),
      { initialProps: { persistenceKey: 'scope-a' }, wrapper: providerWrapper(persistence) }
    );

    await waitFor(() => expect(result.current.restoredDraft).toEqual({ title: 'alpha' }));
    rerender({ persistenceKey: 'scope-b' });
    await waitFor(() => expect(result.current.restoredDraft).toEqual({ title: 'beta' }));
  });

  it('does not send parallel writes across hook instances for one resource', async () => {
    const pending: Array<(result: CedrosAutosaveSaveResult<Draft>) => void> = [];
    const save = vi.fn<SaveFn>(
      () =>
        new Promise<CedrosAutosaveSaveResult<Draft>>((resolve) => {
          pending.push(resolve);
        })
    );
    const options = (value: Draft) => ({
      resourceType: 'article-draft',
      resourceId: 'article_1',
      draft: value,
      makePatch,
      save,
      debounceProfile: 0,
    });
    const first = renderHook(({ value }) => useCedrosAutosave(options(value)), {
      initialProps: { value: { title: 'one' } },
    });
    const second = renderHook(({ value }) => useCedrosAutosave(options(value)), {
      initialProps: { value: { title: 'one' } },
    });

    first.rerender({ value: { title: 'two' } });
    second.rerender({ value: { title: 'three' } });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toEqual({ title: 'two' });

    await act(async () => {
      pending[0](createAutosaveSaveResult<Draft>({ revision: 2 }));
      await Promise.resolve();
    });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0]).toEqual({ title: 'three' });
    await act(async () => {
      pending[1](createAutosaveSaveResult<Draft>({ revision: 3 }));
      await Promise.resolve();
    });
  });

  it('surfaces stale revision conflicts for review', async () => {
    const onConflict = vi.fn();
    const save = vi.fn<SaveFn>(async () => {
      throw autosaveFailureFixtures.staleEtag();
    });
    const { result, rerender } = renderHook(
      ({ value }) =>
        useCedrosAutosave({
          resourceType: 'article-draft',
          resourceId: 'article_1',
          draft: value,
          makePatch,
          save,
          debounceProfile: 0,
          onConflict,
        }),
      { initialProps: { value: { title: 'one' } } }
    );

    rerender({ value: { title: 'two' } });

    await waitFor(() => expect(result.current.status).toBe('conflict'));
    expect(onConflict).toHaveBeenCalledTimes(1);
  });

  it('renders accessible shared status language', () => {
    render(
      <CedrosAutosaveProvider>
        <AutosaveStatusIndicator status="offline" />
      </CedrosAutosaveProvider>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Offline - changes will sync');
  });
});
