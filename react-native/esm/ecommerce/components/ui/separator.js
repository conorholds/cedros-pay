import * as React from 'react';
import { View, StyleSheet } from 'react-native';
export const Separator = React.forwardRef(({ orientation = 'horizontal', style, ...props }, ref) => (<View ref={ref} style={[
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        style,
    ]} {...props}/>));
Separator.displayName = 'Separator';
const styles = StyleSheet.create({
    horizontal: {
        height: 1,
        width: '100%',
        backgroundColor: '#e5e5e5',
    },
    vertical: {
        width: 1,
        height: '100%',
        backgroundColor: '#e5e5e5',
    },
});
//# sourceMappingURL=separator.js.map