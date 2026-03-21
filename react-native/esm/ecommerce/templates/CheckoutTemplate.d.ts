import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface CheckoutTemplateProps {
    style?: ViewStyle;
    onContinueShopping?: () => void;
    onViewOrders?: () => void;
    onLogin?: () => void;
    /**
     * The current URL for parsing checkout result parameters.
     * In React Native, provide this from Linking or deep linking handlers.
     */
    currentUrl?: string | null;
}
export declare function CheckoutTemplate({ style, onContinueShopping, onViewOrders, onLogin, currentUrl, }: CheckoutTemplateProps): React.JSX.Element;
//# sourceMappingURL=CheckoutTemplate.d.ts.map