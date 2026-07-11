"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicMaterialDigest = publicMaterialDigest;
const sha2_js_1 = require("@noble/hashes/sha2.js");
const utils_js_1 = require("@noble/hashes/utils.js");
const canonicalJson_1 = require("./canonicalJson");
/** PII-safe deterministic binding for the complete public request material. */
function publicMaterialDigest(scope, request) {
    const bytes = (0, sha2_js_1.sha256)((0, utils_js_1.utf8ToBytes)((0, canonicalJson_1.canonicalJson)({ scope, request })));
    return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}
//# sourceMappingURL=publicMaterial.js.map