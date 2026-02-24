import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ChatMessage, ChatMessageData } from './ChatMessage';
import { ChatInput } from './ChatInput';

export interface ChatPanelProps {
  initialMessages?: ChatMessageData[];
  onSendMessage?: (message: string) => Promise<string>;
  style?: ViewStyle;
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const WELCOME_MESSAGE: ChatMessageData = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi! How can we help you today? Feel free to ask about products, orders, or any support questions.',
  timestamp: new Date(),
};

export function ChatPanel({
  initialMessages = [WELCOME_MESSAGE],
  onSendMessage,
  style,
}: ChatPanelProps) {
  const [messages, setMessages] = React.useState<ChatMessageData[]>(initialMessages);
  const [isLoading, setIsLoading] = React.useState(false);
  const flatListRef = React.useRef<FlatList>(null);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    // Add user message
    const userMessage: ChatMessageData = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let responseContent: string;

      if (onSendMessage) {
        responseContent = await onSendMessage(content);
      } else {
        // Default response if no handler provided
        responseContent = 'Thanks for your message! Our team will get back to you shortly.';
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const assistantMessage: ChatMessageData = {
        id: generateId(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessageData = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing your message. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessageData }) => (
    <ChatMessage message={item} />
  );

  const renderTypingIndicator = () => {
    if (!isLoading) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <ActivityIndicator size="small" color="#737373" />
          <Text style={styles.typingText}>typing...</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item: ChatMessageData) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={true}
        ListFooterComponent={renderTypingIndicator}
      />
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
