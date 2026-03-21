import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
    style?: ViewStyle;
}
export declare function ChatInput({ onSend, disabled, placeholder, style, }: ChatInputProps): React.JSX.Element;
//# sourceMappingURL=ChatInput.d.ts.map