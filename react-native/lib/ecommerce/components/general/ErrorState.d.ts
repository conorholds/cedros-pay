import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface ErrorStateProps {
    title?: string;
    description: string;
    onRetry?: () => void;
    style?: ViewStyle;
}
export declare function ErrorState({ title, description, onRetry, style, }: ErrorStateProps): React.JSX.Element;
//# sourceMappingURL=ErrorState.d.ts.map