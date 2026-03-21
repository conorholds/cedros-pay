"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutLayout = CheckoutLayout;
const react_native_1 = require("react-native");
/**
 * Checkout Layout Component
 *
 * Provides a two-column layout for checkout: form on the left, summary on the right.
 * On mobile, it stacks vertically.
 */
function CheckoutLayout({ left, right, style, }) {
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.View style={styles.leftColumn}>
        {left}
      </react_native_1.View>
      <react_native_1.View style={styles.rightColumn}>
        {right}
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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