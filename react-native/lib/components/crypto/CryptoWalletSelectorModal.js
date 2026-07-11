"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoWalletSelectorModal = CryptoWalletSelectorModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
function CryptoWalletSelectorModal({ visible, wallets, title, closeLabel, onSelectWallet, onClose, }) {
    return ((0, jsx_runtime_1.jsx)(react_native_1.Modal, { visible: visible, transparent: true, animationType: "fade", onRequestClose: onClose, children: (0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.modalOverlay, children: (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.modalContent, children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: styles.modalHeader, children: [(0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.modalTitle, children: title }), (0, jsx_runtime_1.jsx)(react_native_1.TouchableOpacity, { onPress: onClose, style: styles.closeButton, accessible: true, accessibilityRole: "button", accessibilityLabel: closeLabel, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.closeButtonText, children: "x" }) })] }), (0, jsx_runtime_1.jsx)(react_native_1.ScrollView, { style: styles.walletList, children: wallets.map((wallet) => ((0, jsx_runtime_1.jsxs)(react_native_1.TouchableOpacity, { onPress: () => onSelectWallet(wallet.adapter.name), style: styles.walletOption, accessible: true, accessibilityRole: "button", accessibilityLabel: wallet.adapter.name, children: [(0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.walletIcon, children: wallet.adapter.icon ? ((0, jsx_runtime_1.jsx)(react_native_1.Image, { source: { uri: wallet.adapter.icon }, style: styles.walletIconImage, resizeMode: "contain" })) : null }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: styles.walletName, children: wallet.adapter.name })] }, wallet.adapter.name))) })] }) }) }));
}
const styles = react_native_1.StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#6b7280',
        lineHeight: 24,
    },
    walletList: {
        maxHeight: 300,
    },
    walletOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    walletIcon: {
        width: 32,
        height: 32,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    walletIconImage: {
        width: 24,
        height: 24,
    },
    walletName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
});
//# sourceMappingURL=CryptoWalletSelectorModal.js.map