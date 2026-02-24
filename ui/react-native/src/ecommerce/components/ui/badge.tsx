import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type BadgeVariant = 'default' | 'secondary' | 'outline';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const getVariantStyles = (variant: BadgeVariant): ViewStyle => {
  switch (variant) {
    case 'default':
      return {
        backgroundColor: '#171717',
        borderColor: 'transparent',
      };
    case 'secondary':
      return {
        backgroundColor: '#f5f5f5',
        borderColor: 'transparent',
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderColor: '#e5e5e5',
      };
    default:
      return {};
  }
};

const getTextColor = (variant: BadgeVariant): string => {
  switch (variant) {
    case 'default':
      return '#ffffff';
    case 'secondary':
    case 'outline':
    default:
      return '#171717';
  }
};

export function Badge({
  children,
  variant = 'secondary',
  style,
  textStyle,
  ...props
}: BadgeProps) {
  const variantStyles = getVariantStyles(variant);
  const textColor = getTextColor(variant);

  return (
    <View style={[styles.badge, variantStyles, style]} {...props}>
      <Text style={[styles.text, { color: textColor }, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
