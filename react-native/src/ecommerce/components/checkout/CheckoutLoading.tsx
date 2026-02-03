import * as React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Card, CardContent } from '../ui/card';

interface CheckoutLoadingProps {
  /** Loading message to display */
  message?: string;
  /** Additional style for the container */
  style?: ViewStyle;
}

/**
 * Checkout Loading Component
 *
 * Displays a loading state during checkout processing.
 */
export function CheckoutLoading({
  message = 'Processing your order...',
  style,
}: CheckoutLoadingProps) {
  return (
    <Card style={[styles.container, style]}>
      <CardContent>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#171717" style={styles.spinner} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  content: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#737373',
    textAlign: 'center',
  },
});
