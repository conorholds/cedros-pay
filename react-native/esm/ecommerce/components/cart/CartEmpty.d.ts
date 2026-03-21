import * as React from 'react';
import { ViewStyle } from 'react-native';
interface CartEmptyProps {
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}
export declare function CartEmpty({ title, description, actionLabel, onAction, style, }: CartEmptyProps): React.JSX.Element;
export {};
//# sourceMappingURL=CartEmpty.d.ts.map