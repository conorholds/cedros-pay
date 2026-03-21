import AsyncStorage from '@react-native-async-storage/async-storage';
export function getSafeStorage() {
    return AsyncStorage;
}
export async function readJson(storage, key) {
    try {
        const raw = await storage.getItem(key);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export async function writeJson(storage, key, value) {
    try {
        await storage.setItem(key, JSON.stringify(value));
    }
    catch {
        // ignore
    }
}
//# sourceMappingURL=storage.js.map