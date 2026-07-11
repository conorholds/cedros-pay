"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCedrosPayNativeSurface = registerCedrosPayNativeSurface;
exports.registerCedrosNativeSurface = registerCedrosNativeSurface;
const extensionManifest_1 = require("./extensionManifest");
function registerCedrosPayNativeSurface() {
    return extensionManifest_1.cedrosPayNativeExtensionBootstrap;
}
function registerCedrosNativeSurface() {
    return registerCedrosPayNativeSurface();
}
exports.default = registerCedrosPayNativeSurface;
//# sourceMappingURL=register.js.map