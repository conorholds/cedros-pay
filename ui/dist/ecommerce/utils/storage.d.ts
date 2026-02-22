export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export declare function getSafeStorage(): StorageLike | null;
export declare function readJson<T>(storage: StorageLike, key: string): T | null;
export declare function writeJson(storage: StorageLike, key: string, value: unknown): boolean;
//# sourceMappingURL=storage.d.ts.map