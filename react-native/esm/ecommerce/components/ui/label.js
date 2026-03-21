import * as React from 'react';
import { Text, StyleSheet } from 'react-native';
export const Label = React.forwardRef(({ children, style, disabled, ...props }, ref) => (<Text ref={ref} style={[styles.label, disabled && styles.disabled, style]} {...props}>
      {children}
    </Text>));
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
//# sourceMappingURL=label.js.map