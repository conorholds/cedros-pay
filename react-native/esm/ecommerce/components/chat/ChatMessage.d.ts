import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface ChatMessageData {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}
export interface ChatMessageProps {
    message: ChatMessageData;
    style?: ViewStyle;
}
export declare function ChatMessage({ message, style }: ChatMessageProps): React.JSX.Element;
//# sourceMappingURL=ChatMessage.d.ts.map