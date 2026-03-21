import { View, StyleSheet, } from 'react-native';
/**
 * Checkout Layout Component
 *
 * Provides a two-column layout for checkout: form on the left, summary on the right.
 * On mobile, it stacks vertically.
 */
export function CheckoutLayout({ left, right, style, }) {
    return (<View style={[styles.container, style]}>
      <View style={styles.leftColumn}>
        {left}
      </View>
      <View style={styles.rightColumn}>
        {right}
      </View>
    </View>);
}
const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        gap: 16,
    },
    leftColumn: {
        flex: 1,
    },
    rightColumn: {
        width: '100%',
    },
});
//# sourceMappingURL=CheckoutLayout.js.map