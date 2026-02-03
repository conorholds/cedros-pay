import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Button } from '../ui/button';

interface CartEmptyProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function CartEmpty({
  title,
  description,
  actionLabel,
  onAction,
  style,
}: CartEmptyProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
        {actionLabel && onAction ? (
          <View style={styles.actionContainer}>
            <Button variant="secondary" onPress={onAction}>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
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
  actionContainer: {
    marginTop: 20,
  },
});
