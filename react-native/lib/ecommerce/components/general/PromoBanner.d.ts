import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface PromoBannerProps {
    text: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: 'info' | 'warning' | 'success' | 'promo';
    style?: ViewStyle;
}
export declare function PromoBanner({ text, actionLabel, onAction, variant, style, }: PromoBannerProps): React.JSX.Element;
//# sourceMappingURL=PromoBanner.d.ts.map