import { ProductVariationConfig } from '../../ecommerce/types';
export interface VariationTypeEditorProps {
    /** Current variation config */
    value: ProductVariationConfig;
    /** Called when config changes */
    onChange: (config: ProductVariationConfig) => void;
    /** Max variation types allowed (default: 5) */
    maxTypes?: number;
    /** Max values per type (default: 20) */
    maxValuesPerType?: number;
    /** Whether editing is disabled */
    disabled?: boolean;
}
export declare function VariationTypeEditor({ value, onChange, maxTypes, maxValuesPerType, disabled, }: VariationTypeEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=VariationTypeEditor.d.ts.map