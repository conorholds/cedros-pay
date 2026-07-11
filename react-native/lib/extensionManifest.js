"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cedrosPayNativeExtensionBootstrap = exports.cedrosPayNativeExtensionManifest = void 0;
const extensionManifest_generated_json_1 = __importDefault(require("./extensionManifest.generated.json"));
/**
 * Native registration publishes the archive's canonical manifest byte-for-byte.
 * Run `npm run sync:extension-manifest` after changing the root manifest.
 */
exports.cedrosPayNativeExtensionManifest = extensionManifest_generated_json_1.default;
exports.cedrosPayNativeExtensionBootstrap = {
    manifest: exports.cedrosPayNativeExtensionManifest,
};
//# sourceMappingURL=extensionManifest.js.map