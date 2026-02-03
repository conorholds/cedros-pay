/**
 * Runtime check for optional Solana dependencies
 * Returns helpful error message if dependencies are missing
 */

let solanaChecked = false;
let solanaAvailable = false;

export async function checkSolanaAvailability(): Promise<{ available: boolean; error?: string }> {
  // Return cached result if already checked
  if (solanaChecked) {
    return solanaAvailable
      ? { available: true }
      : {
          available: false,
          error: getSolanaInstallError(),
        };
  }

  try {
    // Try to dynamically import @solana/web3.js
    await import('@solana/web3.js');
    solanaChecked = true;
    solanaAvailable = true;
    return { available: true };
  } catch {
    solanaChecked = true;
    solanaAvailable = false;
    return {
      available: false,
      error: getSolanaInstallError(),
    };
  }
}

export async function requireSolana(): Promise<void> {
  const check = await checkSolanaAvailability();
  if (!check.available) {
    throw new Error(check.error);
  }
}

function getSolanaInstallError(): string {
  return (
    'Solana dependencies not installed. To use crypto payments, install them with:\n\n' +
    'npm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base\n\n' +
    'Or if you only need Stripe payments, hide the crypto button with:\n' +
    '<CedrosPay showCrypto={false} />'
  );
}
