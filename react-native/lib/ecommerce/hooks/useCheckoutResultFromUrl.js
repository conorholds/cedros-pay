"use strict";
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
exports.useCheckoutResultFromUrl = useCheckoutResultFromUrl;
const React = __importStar(require("react"));
const context_1 = require("../config/context");
const checkoutReturn_1 = require("./checkoutReturn");
function searchParamsToRecord(params) {
    const out = {};
    params.forEach((value, key) => {
        out[key] = value;
    });
    return out;
}
function parseUrlQuery(url) {
    try {
        const parsed = new URL(url);
        return searchParamsToRecord(parsed.searchParams);
    }
    catch {
        // Fallback for non-standard URLs
        const queryIndex = url.indexOf('?');
        if (queryIndex === -1)
            return {};
        const search = url.slice(queryIndex + 1);
        return searchParamsToRecord(new URLSearchParams(search));
    }
}
function useCheckoutResultFromUrl(options) {
    const { config } = (0, context_1.useCedrosShop)();
    const [result, setResult] = React.useState({ kind: 'idle' });
    const { url } = options;
    React.useEffect(() => {
        if (!url)
            return;
        const query = parseUrlQuery(url);
        (async () => {
            try {
                const resolved = config.adapter.resolveCheckoutReturn
                    ? await config.adapter.resolveCheckoutReturn({ query })
                    : (0, checkoutReturn_1.parseCheckoutReturn)(query);
                if (resolved.kind === 'success' && resolved.orderId && config.adapter.getOrderById) {
                    const order = await config.adapter.getOrderById(resolved.orderId);
                    if (order) {
                        setResult({ kind: 'success', orderId: resolved.orderId, order });
                        return;
                    }
                }
                setResult(resolved);
            }
            catch (e) {
                setResult({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to resolve checkout' });
            }
        })();
    }, [config.adapter, url]);
    return result;
}
//# sourceMappingURL=useCheckoutResultFromUrl.js.map