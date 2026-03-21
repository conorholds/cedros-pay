"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCedrosShop = useCedrosShop;
exports.useOptionalCedrosShop = useOptionalCedrosShop;
exports.CedrosShopProvider = CedrosShopProvider;
const react_1 = __importDefault(require("react"));
const CedrosShopContext = react_1.default.createContext(null);
function useCedrosShop() {
    const value = react_1.default.useContext(CedrosShopContext);
    if (!value) {
        throw new Error('useCedrosShop must be used within CedrosShopProvider');
    }
    return value;
}
/** Optional version that returns null when used outside CedrosShopProvider */
function useOptionalCedrosShop() {
    return react_1.default.useContext(CedrosShopContext);
}
function CedrosShopProvider({ config, children, }) {
    return (<CedrosShopContext.Provider value={{ config }}>{children}</CedrosShopContext.Provider>);
}
//# sourceMappingURL=context.js.map