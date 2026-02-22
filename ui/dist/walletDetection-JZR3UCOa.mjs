function n() {
  if (typeof window > "u")
    return !1;
  const o = window, t = [
    "phantom",
    "solflare",
    "backpack",
    "glow",
    "slope",
    "sollet",
    "coin98",
    "clover",
    "mathWallet",
    "ledger",
    "torus",
    "walletconnect"
  ];
  for (const l of t) {
    const e = o[l];
    if (e && typeof e == "object" && "solana" in e && e.solana)
      return !0;
  }
  return !!o.solana;
}
export {
  n as detectSolanaWallets
};
