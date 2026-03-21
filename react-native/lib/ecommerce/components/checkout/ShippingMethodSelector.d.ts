import type { ShippingMethod } from '../../types';
import { ViewStyle } from 'react-native';
interface ShippingMethodSelectorProps {
    methods: ShippingMethod[];
    value?: string;
    onChange: (id: string) => void;
    currency: string;
    style?: ViewStyle;
}
export declare function ShippingMethodSelector({ methods, value, onChange, currency, style, }: ShippingMethodSelectorProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=ShippingMethodSelector.d.ts.map