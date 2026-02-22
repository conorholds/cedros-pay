/**
 * Secret Array Editor
 *
 * Manages an array of secret values (e.g., wallet keypairs) with
 * add/edit/delete per item and masked display by default.
 */
export interface SecretArrayEditorProps {
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
    disabled?: boolean;
    description?: string;
}
/** Secret array editor with add/edit/delete per item */
export declare function SecretArrayEditor({ label, value, onChange, disabled, description, }: SecretArrayEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SecretArrayEditor.d.ts.map