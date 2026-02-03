import { IAdminAuthManager } from './AdminAuthManager';
export interface SettingsSectionProps {
    serverUrl: string;
    /** @deprecated Use authManager instead */
    apiKey?: string;
    /** Admin auth manager for authenticated requests */
    authManager?: IAdminAuthManager;
}
export declare function SettingsSection({ serverUrl, apiKey, authManager }: SettingsSectionProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SettingsSection.d.ts.map