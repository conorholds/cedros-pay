import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface ChatWidgetProps {
    title?: string;
    subtitle?: string;
    position?: 'bottom-right' | 'bottom-left';
    style?: ViewStyle;
    onSendMessage?: (message: string) => Promise<string>;
}
export declare function ChatWidget({ title, subtitle, position, style, onSendMessage, }: ChatWidgetProps): React.JSX.Element;
//# sourceMappingURL=ChatWidget.d.ts.map