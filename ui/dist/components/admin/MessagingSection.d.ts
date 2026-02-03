import { IAdminAuthManager } from './AdminAuthManager';
export interface MessagingSectionProps {
    serverUrl: string;
    /** @deprecated Use authManager instead */
    apiKey?: string;
    /** Admin auth manager for authenticated requests */
    authManager?: IAdminAuthManager;
}
export declare function MessagingSection({ serverUrl, apiKey, authManager }: MessagingSectionProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=MessagingSection.d.ts.map