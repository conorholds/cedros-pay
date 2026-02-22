import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from '../ui/button';

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  createdAt: number;
};

function createId(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export interface ShopChatPanelProps {
  style?: ViewStyle;
}

export function ShopChatPanel({ style }: ShopChatPanelProps) {
  const [draft, setDraft] = React.useState('');
  const [isWaitingForAgent, setIsWaitingForAgent] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [
    {
      id: createId(),
      role: 'agent',
      text: 'Hi! How can we help today? We can recommend products or answer support questions.',
      createdAt: Date.now(),
    },
  ]);

  const [typingDots, setTypingDots] = React.useState('...');

  React.useEffect(() => {
    if (!isWaitingForAgent) return;
    const dots = ['.', '..', '...'];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % dots.length;
      setTypingDots(dots[i]!);
    }, 450);
    return () => clearInterval(id);
  }, [isWaitingForAgent]);

  const listRef = React.useRef<FlatList>(null);

  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const send = React.useCallback(() => {
    const text = draft.trim();
    if (!text) return;

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

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.messageRow,
        item.role === 'user' ? styles.userMessageRow : styles.agentMessageRow,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.userBubble : styles.agentBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.role === 'user' ? styles.userText : styles.agentText,
          ]}
        >
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item: ChatMessage) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={true}
        ListFooterComponent={
          isWaitingForAgent ? (
            <View style={styles.typingRow}>
              <View style={styles.typingBubble}>
                <Text style={styles.typingText}>{typingDots}</Text>
              </View>
            </View>
          ) : null
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message…"
          placeholderTextColor="#a3a3a3"
          multiline
          maxLength={1000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={send}
        />
        <Button
          onPress={send}
          disabled={!draft.trim()}
          style={styles.sendButton}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
