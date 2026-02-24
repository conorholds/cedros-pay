import AsyncStorage from '@react-native-async-storage/async-storage';

export type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function getSafeStorage(): StorageLike {
  return AsyncStorage;
}

export async function readJson<T>(storage: StorageLike, key: string): Promise<T | null> {
  try {
    const raw = await storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJson(storage: StorageLike, key: string, value: unknown): Promise<void> {
  try {
    await storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}
