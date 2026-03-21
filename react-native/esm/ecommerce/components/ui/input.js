import * as React from 'react';
import { TextInput, StyleSheet, } from 'react-native';
export const Input = React.forwardRef(({ style, placeholderTextColor, ...props }, ref) => (<TextInput ref={ref} style={[styles.input, style]} placeholderTextColor={placeholderTextColor || '#737373'} {...props}/>));
Input.displayName = 'Input';
const styles = StyleSheet.create({
    input: {
        height: 40,
        width: '100%',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        backgroundColor: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: '#171717',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
});
//# sourceMappingURL=input.js.map