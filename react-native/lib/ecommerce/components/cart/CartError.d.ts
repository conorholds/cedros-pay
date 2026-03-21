import * as React from 'react';
import { ViewStyle } from 'react-native';
interface CartErrorProps {
    title?: string;
    description: string;
    onRetry?: () => void;
    style?: ViewStyle;
}
export declare function CartError({ title, description, onRetry, style, }: CartErrorProps): React.JSX.Element;
export {};
//# sourceMappingURL=CartError.d.ts.map