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
exports.ShopChatPanel = ShopChatPanel;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const button_1 = require("../ui/button");
function createId() {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function ShopChatPanel({ style }) {
    const [draft, setDraft] = React.useState('');
    const [isWaitingForAgent, setIsWaitingForAgent] = React.useState(false);
    const [messages, setMessages] = React.useState(() => [
        {
            id: createId(),
            role: 'agent',
            text: 'Hi! How can we help today? We can recommend products or answer support questions.',
            createdAt: Date.now(),
        },
    ]);
    const [typingDots, setTypingDots] = React.useState('...');
    React.useEffect(() => {
        if (!isWaitingForAgent)
            return;
        const dots = ['.', '..', '...'];
        let i = 0;
        const id = setInterval(() => {
            i = (i + 1) % dots.length;
            setTypingDots(dots[i]);
        }, 450);
        return () => clearInterval(id);
    }, [isWaitingForAgent]);
    const listRef = React.useRef(null);
    React.useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                listRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length]);
    const send = React.useCallback(() => {
        const text = draft.trim();
        if (!text)
            return;
        setMessages((prev) => [
            ...prev,
            {
                id: createId(),
                role: 'user',
                text,
                createdAt: Date.now(),
            },
        ]);
        setDraft('');
        setIsWaitingForAgent(true);
        // Local demo response.
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                {
                    id: createId(),
                    role: 'agent',
                    text: 'Got it. Want recommendations, sizing help, or help with an order?',
                    createdAt: Date.now(),
                },
            ]);
            setIsWaitingForAgent(false);
        }, 450);
    }, [draft]);
    const renderMessage = ({ item }) => (<react_native_1.View style={[
            styles.messageRow,
            item.role === 'user' ? styles.userMessageRow : styles.agentMessageRow,
        ]}>
      <react_native_1.View style={[
            styles.messageBubble,
            item.role === 'user' ? styles.userBubble : styles.agentBubble,
        ]}>
        <react_native_1.Text style={[
            styles.messageText,
            item.role === 'user' ? styles.userText : styles.agentText,
        ]}>
          {item.text}
        </react_native_1.Text>
      </react_native_1.View>
    </react_native_1.View>);
    return (<react_native_1.KeyboardAvoidingView style={[styles.container, style]} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'}>
      <react_native_1.FlatList ref={listRef} data={messages} renderItem={renderMessage} keyExtractor={(item) => item.id} contentContainerStyle={styles.messagesList} showsVerticalScrollIndicator={true} ListFooterComponent={isWaitingForAgent ? (<react_native_1.View style={styles.typingRow}>
              <react_native_1.View style={styles.typingBubble}>
                <react_native_1.Text style={styles.typingText}>{typingDots}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>) : null}/>

      <react_native_1.View style={styles.inputContainer}>
        <react_native_1.TextInput style={styles.input} value={draft} onChangeText={setDraft} placeholder="Type a message…" placeholderTextColor="#a3a3a3" multiline maxLength={1000} returnKeyType="send" blurOnSubmit={false} onSubmitEditing={send}/>
        <button_1.Button onPress={send} disabled={!draft.trim()} style={styles.sendButton}>
          Send
        </button_1.Button>
      </react_native_1.View>
    </react_native_1.KeyboardAvoidingView>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    messagesList: {
        padding: 12,
        gap: 8,
    },
    messageRow: {
        flexDirection: 'row',
        marginVertical: 2,
    },
    userMessageRow: {
        justifyContent: 'flex-end',
    },
    agentMessageRow: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '85%',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    userBubble: {
        backgroundColor: '#171717',
        borderBottomRightRadius: 4,
    },
    agentBubble: {
        backgroundColor: '#f5f5f5',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userText: {
        color: '#ffffff',
    },
    agentText: {
        color: '#171717',
    },
    typingRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginVertical: 2,
    },
    typingBubble: {
        maxWidth: '85%',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#f5f5f5',
        borderBottomLeftRadius: 4,
    },
    typingText: {
        fontSize: 14,
        color: '#171717',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
        backgroundColor: '#ffffff',
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 15,
        color: '#171717',
    },
    sendButton: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
});
//# sourceMappingURL=ShopChatPanel.js.map