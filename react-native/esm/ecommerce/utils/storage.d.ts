export type StorageLike = {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
};
export declare function getSafeStorage(): StorageLike;
export declare function readJson<T>(storage: StorageLike, key: string): Promise<T | null>;
export declare function writeJson(storage: StorageLike, key: string, value: unknown): Promise<void>;
//# sourceMappingURL=storage.d.ts.map