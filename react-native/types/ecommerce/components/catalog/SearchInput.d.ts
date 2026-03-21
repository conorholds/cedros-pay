import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    style?: ViewStyle;
}
export declare function SearchInput({ value, onChange, placeholder, style, }: SearchInputProps): React.JSX.Element;
//# sourceMappingURL=SearchInput.d.ts.map