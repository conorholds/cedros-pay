import * as React from 'react';
import { ViewStyle } from 'react-native';
import { ChatMessageData } from './ChatMessage';
export interface ChatPanelProps {
    initialMessages?: ChatMessageData[];
    onSendMessage?: (message: string) => Promise<string>;
    style?: ViewStyle;
}
export declare function ChatPanel({ initialMessages, onSendMessage, style, }: ChatPanelProps): React.JSX.Element;
//# sourceMappingURL=ChatPanel.d.ts.map