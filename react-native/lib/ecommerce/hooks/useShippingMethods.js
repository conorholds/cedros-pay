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
exports.useShippingMethods = useShippingMethods;
const React = __importStar(require("react"));
const context_1 = require("../config/context");
function useShippingMethods({ enabled, customer, }) {
    const { config } = (0, context_1.useCedrosShop)();
    const [methods, setMethods] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    // Serialize shipping address for stable dependency comparison
    const shippingAddressKey = JSON.stringify(customer.shippingAddress ?? {});
    React.useEffect(() => {
        let cancelled = false;
        if (!enabled || !config.adapter.getShippingMethods) {
            setMethods([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        config.adapter
            .getShippingMethods({ currency: config.currency, customer })
            .then((res) => {
            if (cancelled)
                return;
            setMethods(res);
        })
            .catch((e) => {
            if (cancelled)
                return;
            setError(e instanceof Error ? e.message : 'Failed to load shipping methods');
        })
            .finally(() => {
            if (cancelled)
                return;
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
        // Using individual customer properties for granular control
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.adapter, config.currency, enabled, customer.email, customer.name, shippingAddressKey]);
    return { methods, isLoading, error };
}
//# sourceMappingURL=useShippingMethods.js.map