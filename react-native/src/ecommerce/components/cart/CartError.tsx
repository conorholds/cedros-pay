import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Button } from '../ui/button';

interface CartErrorProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function CartError({
  title,
  description,
  onRetry,
  style,
}: CartErrorProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title ?? 'Something went wrong'}</Text>
      <Text style={styles.description}>{description}</Text>
      {onRetry ? (
        <View style={styles.actionContainer}>
          <Button variant="outline" onPress={onRetry}>
            Try again
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  description: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
  },
  actionContainer: {
    marginTop: 16,
  },
});
