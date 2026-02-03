import * as React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const getVariantStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case 'default':
      return {
        backgroundColor: '#171717',
      };
    case 'secondary':
      return {
        backgroundColor: '#f5f5f5',
      };
    case 'outline':
      return {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#e5e5e5',
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
      };
    case 'destructive':
      return {
        backgroundColor: '#dc2626',
      };
    case 'link':
      return {
        backgroundColor: 'transparent',
      };
    default:
      return {};
  }
};

const getTextColor = (variant: ButtonVariant, disabled?: boolean) => {
  if (disabled) return '#a3a3a3';
  switch (variant) {
    case 'default':
      return '#ffffff';
    case 'secondary':
    case 'outline':
    case 'ghost':
    case 'link':
      return '#171717';
    case 'destructive':
      return '#ffffff';
    default:
      return '#171717';
  }
};

const getSizeStyles = (size: ButtonSize): ViewStyle => {
  switch (size) {
    case 'sm':
      return { paddingVertical: 8, paddingHorizontal: 12 };
    case 'lg':
      return { paddingVertical: 14, paddingHorizontal: 24 };
    case 'default':
    default:
      return { paddingVertical: 10, paddingHorizontal: 16 };
  }
};

export const Button = React.forwardRef<TouchableOpacity, ButtonProps>(
  (
    {
      children,
      variant = 'default',
      size = 'default',
      disabled,
      loading,
      onPress,
      style,
      textStyle,
      ...props
    },
    ref
  ) => {
    const variantStyles = getVariantStyles(variant);
    const sizeStyles = getSizeStyles(size);
    const textColor = getTextColor(variant, disabled);

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[
          styles.base,
          variantStyles,
          sizeStyles,
          (disabled || loading) && styles.disabled,
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <Text
            style={[
              styles.text,
              { color: textColor },
              variant === 'link' && styles.underline,
              textStyle,
            ]}
          >
            {children}
          </Text>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  disabled: {
    opacity: 0.5,
  },
});
