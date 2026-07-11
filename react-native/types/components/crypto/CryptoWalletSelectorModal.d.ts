import React from 'react';
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
}): React.JSX.Element;
export {};
//# sourceMappingURL=CryptoWalletSelectorModal.d.ts.map