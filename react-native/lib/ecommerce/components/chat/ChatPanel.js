"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPanel = ChatPanel;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const ChatMessage_1 = require("./ChatMessage");
const ChatInput_1 = require("./ChatInput");
function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
const WELCOME_MESSAGE = {
    id: 'welcome',
    role: 'assistant',
    content: 'Hi! How can we help you today? Feel free to ask about products, orders, or any support questions.',
    timestamp: new Date(),
};
function ChatPanel({ initialMessages = [WELCOME_MESSAGE], onSendMessage, style, }) {
    const [messages, setMessages] = React.useState(initialMessages);
    const [isLoading, setIsLoading] = React.useState(false);
    const flatListRef = React.useRef(null);
    // Scroll to bottom when messages change
    React.useEffect(() => {
        if (messages.length > 0 && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);
    const handleSend = async (content) => {
        // Add user message
        const userMessage = {
            id: generateId(),
            role: 'user',
            content,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        try {
            let responseContent;
            if (onSendMessage) {
                responseContent = await onSendMessage(content);
            }
            else {
                // Default response if no handler provided
                responseContent = 'Thanks for your message! Our team will get back to you shortly.';
                // Simulate network delay
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            const assistantMessage = {
                id: generateId(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        }
        catch (error) {
            const errorMessage = {
                id: generateId(),
                role: 'assistant',
                content: 'Sorry, I had trouble processing your message. Please try again.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const renderMessage = ({ item }) => (<ChatMessage_1.ChatMessage message={item}/>);
    const renderTypingIndicator = () => {
        if (!isLoading)
            return null;
        return (<react_native_1.View style={styles.typingContainer}>
        <react_native_1.View style={styles.typingBubble}>
          <react_native_1.ActivityIndicator size="small" color="#737373"/>
          <react_native_1.Text style={styles.typingText}>typing...</react_native_1.Text>
        </react_native_1.View>
      </react_native_1.View>);
    };
    return (<react_native_1.KeyboardAvoidingView style={[styles.container, style]} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={react_native_1.Platform.OS === 'ios' ? 0 : 0}>
      <react_native_1.FlatList ref={flatListRef} data={messages} renderItem={renderMessage} keyExtractor={(item) => item.id} contentContainerStyle={styles.messagesList} showsVerticalScrollIndicator={true} ListFooterComponent={renderTypingIndicator}/>
      <ChatInput_1.ChatInput onSend={handleSend} disabled={isLoading}/>
    </react_native_1.KeyboardAvoidingView>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    messagesList: {
        paddingHorizontal: 12,
        paddingVertical: 16,
        flexGrow: 1,
    },
    typingContainer: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#f5f5f5',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    typingText: {
        fontSize: 12,
        color: '#737373',
    },
});
//# sourceMappingURL=ChatPanel.js.map