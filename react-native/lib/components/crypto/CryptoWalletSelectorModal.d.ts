type WalletOption = {
    adapter: {
        name: string;
        icon?: string;
    };
};
export declare function CryptoWalletSelectorModal({ visible, wallets, title, closeLabel, onSelectWallet, onClose, }: {
    visible: boolean;
    wallets: WalletOption[];
    title: string;
    closeLabel: string;
    onSelectWallet: (walletName: string) => void;
    onClose: () => void;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CryptoWalletSelectorModal.d.ts.map