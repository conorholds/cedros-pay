/**
 * Token Mint Selector
 *
 * Provides a selector for known stablecoins (USDC, USDT, etc.)
 * with a custom token option for arbitrary SPL token mints.
 */
/** Validate a Solana public key address */
export declare function validateSolanaAddress(address: string): {
    valid: boolean;
    error?: string;
};
export interface TokenMintSelectorProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    decimals?: number;
    onDecimalsChange?: (decimals: number) => void;
    disabled?: boolean;
    description?: string;
    customSymbol?: string;
    customIcon?: string;
    onCustomSymbolChange?: (value: string) => void;
    onCustomIconChange?: (value: string) => void;
}
/** Token mint selector with known stablecoins */
export declare function TokenMintSelector({ label, value, onChange, decimals, onDecimalsChange, disabled, description, customSymbol, customIcon, onCustomSymbolChange, onCustomIconChange, }: TokenMintSelectorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=TokenMintSelector.d.ts.map