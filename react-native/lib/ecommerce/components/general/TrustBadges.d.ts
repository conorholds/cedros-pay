import * as React from 'react';
import { ViewStyle } from 'react-native';
interface TrustBadge {
    icon?: React.ReactNode;
    label: string;
}
export interface TrustBadgesProps {
    badges?: TrustBadge[];
    style?: ViewStyle;
}
export declare function TrustBadges({ badges, style }: TrustBadgesProps): React.JSX.Element;
export {};
//# sourceMappingURL=TrustBadges.d.ts.map