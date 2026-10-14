import type {
  AutosavePersistedDraft,
  AutosavePersistenceAdapter,
} from './types';

const DB_NAME = 'cedros-autosave';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;
export const AUTOSAVE_DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function createCedrosAutosavePersistence(
  namespace = 'cedros:autosave'
): AutosavePersistenceAdapter {
  return createIndexedDbAutosavePersistence(namespace);
}

export function createIndexedDbAutosavePersistence(
  namespace = 'cedros:autosave'
): AutosavePersistenceAdapter {
  const memory = createMemoryAutosavePersistence(namespace);
  let dbPromise: Promise<IDBDatabase | null> | null = null;

  async function db() {
    dbPromise ??= openAutosaveDb().catch(() => null);
    return dbPromise;
  }

  return {
    async load<TResource>(key: string) {
      const database = await db();
      if (!database) return memory.load<TResource>(key);
      const scopedKey = storageKey(namespace, key);
      const draft = await readFromIndexedDb<TResource>(database, scopedKey);
      if (isFreshDraft(draft)) return draft;
      if (draft) await deleteFromIndexedDb(database, scopedKey);
      return null;
    },
    async save<TResource>(key: string, draft: AutosavePersistedDraft<TResource>) {
      const database = await db();
      if (!database) return memory.save(key, draft);
      await writeToIndexedDb(database, storageKey(namespace, key), draft);
    },
    async remove(key: string) {
      const database = await db();
      if (!database) return memory.remove(key);
      await deleteFromIndexedDb(database, storageKey(namespace, key));
    },
  };
}

export function createLocalStorageAutosavePersistence(
  namespace = 'cedros:autosave'
): AutosavePersistenceAdapter {
  const memory = createMemoryAutosavePersistence(namespace);
  return {
    async load<TResource>(key: string) {
      const storage = getLocalStorage();
      if (!storage) return memory.load<TResource>(key);
      const raw = storage.getItem(storageKey(namespace, key));
      if (!raw) return null;
      try {
        const draft = JSON.parse(raw) as AutosavePersistedDraft<TResource>;
        if (isFreshDraft(draft)) return draft;
        storage.removeItem(storageKey(namespace, key));
        return null;
      } catch {
        storage.removeItem(storageKey(namespace, key));
        return null;
      }
    },
    async save<TResource>(key: string, draft: AutosavePersistedDraft<TResource>) {
      const storage = getLocalStorage();
      if (!storage) return memory.save(key, draft);
      storage.setItem(storageKey(namespace, key), JSON.stringify(draft));
    },
    async remove(key: string) {
      const storage = getLocalStorage();
      if (!storage) return memory.remove(key);
      storage.removeItem(storageKey(namespace, key));
    },
  };
}

export function createMemoryAutosavePersistence(
  namespace = 'cedros:autosave'
): AutosavePersistenceAdapter {
  const drafts = new Map<string, AutosavePersistedDraft>();
  return {
    async load<TResource>(key: string) {
      const scopedKey = storageKey(namespace, key);
      const draft = (drafts.get(scopedKey) ?? null) as AutosavePersistedDraft<TResource> | null;
      if (isFreshDraft(draft)) return draft;
      if (draft) drafts.delete(scopedKey);
      return null;
    },
    async save<TResource>(key: string, draft: AutosavePersistedDraft<TResource>) {
      drafts.set(storageKey(namespace, key), draft as AutosavePersistedDraft);
    },
    async remove(key: string) {
      drafts.delete(storageKey(namespace, key));
    },
  };
}

function openAutosaveDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

function readFromIndexedDb<TResource>(
  database: IDBDatabase,
  key: string
): Promise<AutosavePersistedDraft<TResource> | null> {
  return runStoreRequest(database, 'readonly', (store) => store.get(key)).then((row) =>
    row ? ((row as PersistedRow<TResource>).draft ?? null) : null
  );
}

function writeToIndexedDb<TResource>(
  database: IDBDatabase,
  key: string,
  draft: AutosavePersistedDraft<TResource>
): Promise<void> {
  return runStoreRequest(database, 'readwrite', (store) =>
    store.put({ key, draft, updatedAt: draft.updatedAt })
  ).then(() => undefined);
}

function deleteFromIndexedDb(database: IDBDatabase, key: string): Promise<void> {
  return runStoreRequest(database, 'readwrite', (store) => store.delete(key)).then(
    () => undefined
  );
}

function runStoreRequest<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  build: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, mode);
    const request = build(tx.objectStore(STORE_NAME));
    let result: T;
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      result = request.result;
    };
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve(result);
  });
}

function storageKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

function isFreshDraft(draft: AutosavePersistedDraft | null): boolean {
  if (!draft) return false;
  const updatedAt = Date.parse(draft.updatedAt);
  if (!Number.isFinite(updatedAt)) return false;
  const age = Date.now() - updatedAt;
  return age >= -5 * 60 * 1000 && age <= AUTOSAVE_DRAFT_MAX_AGE_MS;
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface PersistedRow<TResource> {
  key: string;
  draft: AutosavePersistedDraft<TResource>;
  updatedAt: string;
}
