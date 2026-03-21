"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSafeStorage = getSafeStorage;
exports.readJson = readJson;
exports.writeJson = writeJson;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
function getSafeStorage() {
    return async_storage_1.default;
}
async function readJson(storage, key) {
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
async function writeJson(storage, key, value) {
    try {
        await storage.setItem(key, JSON.stringify(value));
    }
    catch {
        // ignore
    }
}
//# sourceMappingURL=storage.js.map