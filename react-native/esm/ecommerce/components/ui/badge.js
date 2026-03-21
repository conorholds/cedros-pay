import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
const getVariantStyles = (variant) => {
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
const getTextColor = (variant) => {
    switch (variant) {
        case 'default':
            return '#ffffff';
        case 'secondary':
        case 'outline':
        default:
            return '#171717';
    }
};
export function Badge({ children, variant = 'secondary', style, textStyle, ...props }) {
    const variantStyles = getVariantStyles(variant);
    const textColor = getTextColor(variant);
    return (<View style={[styles.badge, variantStyles, style]} {...props}>
      <Text style={[styles.text, { color: textColor }, textStyle]}>{children}</Text>
    </View>);
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
//# sourceMappingURL=badge.js.map