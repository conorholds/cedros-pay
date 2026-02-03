/**
 * Runtime check for optional Solana dependencies
 * Returns helpful error message if dependencies are missing
 */
export declare function checkSolanaAvailability(): Promise<{
    available: boolean;
    error?: string;
}>;
export declare function requireSolana(): Promise<void>;
//# sourceMappingURL=solanaCheck.d.ts.map