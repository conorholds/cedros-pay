import * as React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface LabelProps {
  children: React.ReactNode;
  style?: TextStyle;
  disabled?: boolean;
}

export const Label = React.forwardRef<Text, LabelProps>(
  ({ children, style, disabled, ...props }, ref) => (
    <Text
      ref={ref}
      style={[styles.label, disabled && styles.disabled, style]}
      {...props}
    >
      {children}
    </Text>
  )
);

Label.displayName = 'Label';

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    marginBottom: 4,
  },
  disabled: {
    color: '#a3a3a3',
  },
});
