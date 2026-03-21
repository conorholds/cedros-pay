"use strict";
/**
 * Hook to fetch enabled payment methods from admin configuration.
 *
 * Automatically uses the adapter from CedrosShopProvider context.
 * Falls back to all methods enabled if config is not available.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePaymentMethodsConfig = usePaymentMethodsConfig;
const react_1 = require("react");
const context_1 = require("../config/context");
/** Default config when backend settings are not available */
const DEFAULT_CONFIG = {
    card: true,
    crypto: true,
    credits: false, // Credits require explicit backend setup
};
function usePaymentMethodsConfig() {
    const contextValue = (0, context_1.useOptionalCedrosShop)();
    const adapter = contextValue?.config?.adapter;
    const [config, setConfig] = (0, react_1.useState)(DEFAULT_CONFIG);
    const [isLoading, setIsLoading] = (0, react_1.useState)(!!adapter?.getPaymentMethodsConfig);
    (0, react_1.useEffect)(() => {
        if (!adapter?.getPaymentMethodsConfig) {
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        async function fetchConfig() {
            try {
                const result = await adapter.getPaymentMethodsConfig();
                if (!cancelled && result) {
                    setConfig(result);
                }
            }
            catch {
                // Config not available - use defaults
            }
            finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }
        fetchConfig();
        return () => {
            cancelled = true;
        };
    }, [adapter]);
    return { config, isLoading };
}
//# sourceMappingURL=usePaymentMethodsConfig.js.map