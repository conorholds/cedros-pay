import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Button } from '../ui/button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
        {actionLabel && onAction ? (
          <View style={styles.action}>
            <Button onPress={onAction} variant="secondary">
              {actionLabel}
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
    padding: 32,
  },
  content: {
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    marginTop: 8,
  },
  action: {
    marginTop: 20,
  },
});
