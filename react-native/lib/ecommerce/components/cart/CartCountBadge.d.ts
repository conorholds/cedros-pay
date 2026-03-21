import * as React from 'react';
import { ViewStyle } from 'react-native';
interface CartCountBadgeProps {
    onPress?: () => void;
    style?: ViewStyle;
    badgeStyle?: ViewStyle;
}
export declare function CartCountBadge({ onPress, style, badgeStyle, }: CartCountBadgeProps): React.JSX.Element | null;
interface MiniCartProps {
    onPress?: () => void;
    showTotal?: boolean;
    style?: ViewStyle;
}
export declare function MiniCart({ onPress, showTotal, style, }: MiniCartProps): React.JSX.Element | null;
export {};
//# sourceMappingURL=CartCountBadge.d.ts.map