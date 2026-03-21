import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface SubscriptionTemplateProps {
    style?: ViewStyle;
    /** Page title */
    title?: string;
    /** Subtitle shown below title */
    subtitle?: string;
    /** Text for annual savings badge (e.g., "2 months free") */
    annualSavingsBadge?: string;
    /** Badge text for popular plan (default: "Best Deal") */
    popularBadgeText?: string;
    /** Footer notice text */
    footerNotice?: string;
    /** Callback when user selects a tier */
    onSelectTier?: (tierId: string, interval: 'monthly' | 'annual') => void;
}
export declare function SubscriptionTemplate({ style, title, subtitle, annualSavingsBadge, popularBadgeText, footerNotice, onSelectTier, }: SubscriptionTemplateProps): React.JSX.Element;
//# sourceMappingURL=SubscriptionTemplate.d.ts.map