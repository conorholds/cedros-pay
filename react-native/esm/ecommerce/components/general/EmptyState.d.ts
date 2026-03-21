import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface EmptyStateProps {
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}
export declare function EmptyState({ title, description, actionLabel, onAction, style, }: EmptyStateProps): React.JSX.Element;
//# sourceMappingURL=EmptyState.d.ts.map