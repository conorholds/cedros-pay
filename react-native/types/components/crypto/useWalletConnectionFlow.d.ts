type WalletLike = {
    adapter: {
        name: string;
    };
} | null;
type PublicKeyLike = {
    toString: () => string;
} | null;
type WalletState = {
    connected: boolean;
    wallet: WalletLike;
    publicKey: PublicKeyLike;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    select: (walletName: string | null) => void;
};
export type UseWalletConnectionFlowOptions = WalletState & {
    logPrefix: string;
    walletSelectionTimeoutMs?: number;
};
export declare function useWalletConnectionFlow({ connected, wallet, publicKey, connect, disconnect, select, logPrefix, walletSelectionTimeoutMs, }: UseWalletConnectionFlowOptions): {
    showWalletSelector: boolean;
    ensureConnectedWallet: () => Promise<void>;
    selectWalletByName: (walletName: string) => void;
    cancelWalletSelection: () => void;
    changeWallet: () => Promise<void>;
    disconnectWallet: () => Promise<void>;
};
export {};
//# sourceMappingURL=useWalletConnectionFlow.d.ts.map