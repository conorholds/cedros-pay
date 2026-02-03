/**
 * Custom Dropdown Components
 *
 * Reusable dropdown components with fully styled menus.
 */
export interface DropdownOption {
    value: string;
    label: string;
    disabled?: boolean;
}
interface BaseDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    disabled?: boolean;
}
interface FilterDropdownProps extends BaseDropdownProps {
    placeholder?: string;
}
export declare function FilterDropdown({ value, onChange, options, placeholder, disabled }: FilterDropdownProps): import("react/jsx-runtime").JSX.Element;
interface FormDropdownProps extends BaseDropdownProps {
    label: string;
    description?: string;
    className?: string;
    style?: React.CSSProperties;
}
export declare function FormDropdown({ value, onChange, options, label, description, disabled, className, style }: FormDropdownProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Dropdown.d.ts.map