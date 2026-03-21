import type { Address } from '../../types';
import { ViewStyle } from 'react-native';
interface AddressFormProps {
    title: string;
    value: Address;
    onChange: (next: Address) => void;
    errors?: Record<string, string>;
    style?: ViewStyle;
}
export declare function AddressForm({ title, value, onChange, errors, style, }: AddressFormProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=AddressForm.d.ts.map