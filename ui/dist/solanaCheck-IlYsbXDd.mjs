let a = !1, e = !1;
async function t() {
  if (a)
    return e ? { available: !0 } : {
      available: !1,
      error: l()
    };
  try {
    return await import("@solana/web3.js"), a = !0, e = !0, { available: !0 };
  } catch {
    return a = !0, e = !1, {
      available: !1,
      error: l()
    };
  }
}
function l() {
  return `Solana dependencies not installed. To use crypto payments, install them with:

npm install @solana/web3.js @solana/spl-token @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base

Or if you only need Stripe payments, hide the crypto button with:
<CedrosPay showCrypto={false} />`;
}
export {
  t as checkSolanaAvailability
};
