import { IAdminAuthManager } from './AdminAuthManager';
export interface ProductVariationsEditorProps {
    serverUrl: string;
    productId: string;
    productTitle?: string;
    defaultPrice?: number;
    currencySymbol?: string;
    /** @deprecated Use authManager instead */
    apiKey?: string;
    authManager?: IAdminAuthManager;
    onClose?: () => void;
}
export declare function ProductVariationsEditor({ serverUrl, productId, productTitle, defaultPrice, currencySymbol, apiKey, authManager, onClose, }: ProductVariationsEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ProductVariationsEditor.d.ts.map