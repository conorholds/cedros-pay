import * as React from 'react';
import { ViewStyle } from 'react-native';
export type BreadcrumbItem = {
    label: string;
    onPress?: () => void;
};
export interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    style?: ViewStyle;
}
export declare function Breadcrumbs({ items, style }: BreadcrumbsProps): React.JSX.Element;
//# sourceMappingURL=Breadcrumbs.d.ts.map