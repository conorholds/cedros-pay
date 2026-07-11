"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoWalletControls = CryptoWalletControls;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
function CryptoWalletControls({ changeLabel, disconnectLabel, onChangeWallet, onDisconnect, }) {
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.walletControls, children: [(0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onChangeWallet, accessible: true, accessibilityRole: "button", children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.walletControlText, children: changeLabel }) }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onDisconnect, accessible: true, accessibilityRole: "button", children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.walletControlText, children: disconnectLabel }) })] }));
}
const styles = react_native_1.StyleSheet.create({
    walletControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    walletControlText: {
        fontSize: 12,
        color: '#6b7280',
        textDecorationLine: 'underline',
    },
});
//# sourceMappingURL=CryptoWalletControls.js.map