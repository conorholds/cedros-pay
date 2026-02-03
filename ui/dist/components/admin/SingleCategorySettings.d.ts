import { ReactNode } from 'react';
import { IAdminAuthManager } from './AdminAuthManager';
export interface SingleCategorySettingsProps {
    serverUrl: string;
    /** @deprecated Use authManager instead */
    apiKey?: string;
    /** Admin auth manager for authenticated requests */
    authManager?: IAdminAuthManager;
    /** The config category to display */
    category: string;
    /** Optional title override (defaults to category label) */
    title?: string;
    /** Optional description override (can include React elements like links) */
    description?: ReactNode;
    /** Field name for the enabled toggle (default: 'enabled') */
    enabledField?: string;
    /** Whether to show the enabled toggle in the header */
    showEnabledToggle?: boolean;
}
export declare function SingleCategorySettings({ serverUrl, apiKey: _apiKey, authManager, category, title, description, enabledField, showEnabledToggle, }: SingleCategorySettingsProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SingleCategorySettings.d.ts.map