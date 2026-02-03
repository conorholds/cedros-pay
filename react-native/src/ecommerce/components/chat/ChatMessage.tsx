import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

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

export function ChatMessage({ message, style }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
        style,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.content,
            isUser ? styles.userContent : styles.assistantContent,
          ]}
        >
          {message.content}
        </Text>
      </View>
      <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#171717',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#f5f5f5',
    borderBottomLeftRadius: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  userContent: {
    color: '#ffffff',
  },
  assistantContent: {
    color: '#171717',
  },
  timestamp: {
    fontSize: 11,
    color: '#a3a3a3',
    marginTop: 4,
    marginHorizontal: 4,
  },
});
