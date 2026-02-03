import * as React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

export interface PromoBannerProps {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'info' | 'warning' | 'success' | 'promo';
  style?: ViewStyle;
}

export function PromoBanner({
  text,
  actionLabel,
  onAction,
  variant = 'promo',
  style,
}: PromoBannerProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'info':
        return {
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          textColor: '#1d4ed8',
        };
      case 'warning':
        return {
          backgroundColor: '#fef3c7',
          borderColor: '#fde68a',
          textColor: '#b45309',
        };
      case 'success':
        return {
          backgroundColor: '#dcfce7',
          borderColor: '#bbf7d0',
          textColor: '#15803d',
        };
      case 'promo':
      default:
        return {
          backgroundColor: '#171717',
          borderColor: '#171717',
          textColor: '#ffffff',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: variantStyles.textColor }]}>
        {text}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.action, { color: variantStyles.textColor }]}>
            {actionLabel} →
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  action: {
    fontSize: 13,
    fontWeight: '600',
  },
});
