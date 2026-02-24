// Type for window with potential wallet extensions
interface WindowWithWallets extends Window {
  phantom?: { solana?: unknown };
  solflare?: { solana?: unknown };
  backpack?: { solana?: unknown };
  glow?: { solana?: unknown };
  slope?: { solana?: unknown };
  sollet?: { solana?: unknown };
  coin98?: { solana?: unknown };
  clover?: { solana?: unknown };
  mathWallet?: { solana?: unknown };
  ledger?: { solana?: unknown };
  torus?: { solana?: unknown };
  walletconnect?: { solana?: unknown };
  solana?: unknown;
}

/**
 * Detects if any Solana wallet extensions are installed in the browser
 * Checks for common wallet adapters like Phantom, Solflare, Backpack, etc.
 */
export function detectSolanaWallets(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const win = window as WindowWithWallets;

  // Check for common Solana wallet providers
  const walletProviders: (keyof WindowWithWallets)[] = [
    'phantom',
    'solflare',
    'backpack',
    'glow',
    'slope',
    'sollet',
    'coin98',
    'clover',
    'mathWallet',
    'ledger',
    'torus',
    'walletconnect',
  ];

  // Check window object for wallet injections
  for (const provider of walletProviders) {
    const walletObj = win[provider];
    if (walletObj && typeof walletObj === 'object' && 'solana' in walletObj && walletObj.solana) {
      return true;
    }
  }

  // Check for generic Solana provider
  if (win.solana) {
    return true;
  }

  return false;
}
