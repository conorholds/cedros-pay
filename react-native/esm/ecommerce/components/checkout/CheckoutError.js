import * as React from 'react';
import { View, Text, StyleSheet, } from 'react-native';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
/**
 * Checkout Error Component
 *
 * Displays an error state when checkout fails.
 * Provides options to retry or go back to cart.
 */
export function CheckoutError({ message = 'Something went wrong while processing your payment.', onRetry, onBackToCart, style, }) {
    return (<Card style={[styles.container, style]}>
      <CardContent>
        <View style={styles.iconContainer}>
          <Text style={styles.errorIcon}>!</Text>
        </View>
        
        <Text style={styles.title}>Payment failed</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.buttonContainer}>
          {onRetry ? (<Button onPress={onRetry}>
              Try again
            </Button>) : null}
          {onBackToCart ? (<Button variant="outline" onPress={onBackToCart}>
              Back to cart
            </Button>) : null}
        </View>
      </CardContent>
    </Card>);
}
const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fef2f2',
        borderWidth: 2,
        borderColor: '#fecaca',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 20,
    },
    errorIcon: {
        fontSize: 32,
        fontWeight: '700',
        color: '#dc2626',
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#171717',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: '#737373',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    buttonContainer: {
        gap: 8,
    },
});
//# sourceMappingURL=CheckoutError.js.map