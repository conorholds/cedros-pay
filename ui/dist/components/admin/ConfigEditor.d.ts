import { ValidateConfigResponse } from './configApi';
export interface ConfigEditorProps {
    category: string;
    config: Record<string, unknown>;
    originalConfig: Record<string, unknown>;
    isLoading?: boolean;
    onSave: (config: Record<string, unknown>) => Promise<void>;
    onValidate?: (config: Record<string, unknown>) => Promise<ValidateConfigResponse>;
}
export declare function ConfigEditor({ category, config, originalConfig, isLoading, onSave, }: ConfigEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ConfigEditor.d.ts.map