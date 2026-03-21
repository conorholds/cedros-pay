"use strict";
/**
 * Runtime check for optional Solana dependencies
 * Returns helpful error message if dependencies are missing
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSolanaAvailability = checkSolanaAvailability;
exports.requireSolana = requireSolana;
let solanaChecked = false;
let solanaAvailable = false;
async function checkSolanaAvailability() {
    // Return cached result if already checked
    if (solanaChecked) {
        return solanaAvailable
            ? { available: true }
            : {
                available: false,
                error: getSolanaInstallError(),
            };
    }
    try {
        // Try to dynamically import @solana/web3.js
        await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
        solanaChecked = true;
        solanaAvailable = true;
        return { available: true };
    }
    catch {
        solanaChecked = true;
        solanaAvailable = false;
        return {
            available: false,
            error: getSolanaInstallError(),
        };
    }
}
async function requireSolana() {
    const check = await checkSolanaAvailability();
    if (!check.available) {
        throw new Error(check.error);
    }
}
function getSolanaInstallError() {
    return ('Solana dependencies not installed. To use crypto payments, install them with:\n\n' +
        'npm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-react @solana/wallet-adapter-base @solana/wallet-adapter-phantom @solana/wallet-adapter-solflare\n\n' +
        'Or if you only need Stripe payments, hide the crypto button with:\n' +
        '<CedrosPay showCrypto={false} />');
}
//# sourceMappingURL=solanaCheck.js.map