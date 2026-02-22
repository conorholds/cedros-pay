import { clusterApiUrl as C, Connection as b, Transaction as P, PublicKey as l, TransactionInstruction as R, LAMPORTS_PER_SOL as x } from "@solana/web3.js";
import { getAssociatedTokenAddress as T, createTransferInstruction as A } from "@solana/spl-token";
import { c as v, b as B, i as u, k as S, r as m, g, e as w, l as f, m as M } from "./CedrosContext-BnJ2Cf7R.mjs";
import { b as k } from "./index-BFt38o8Q.mjs";
class z {
  connection;
  cluster;
  endpoint;
  allowUnknownMint;
  rpcRateLimiter = v({
    maxRequests: 50,
    windowMs: 6e4
    // 50 requests per minute for RPC calls
  });
  rpcCircuitBreaker = B({
    failureThreshold: 5,
    timeout: 1e4,
    // 10 seconds for faster recovery in payment flows
    name: "solana-rpc"
  });
  constructor(r = "mainnet-beta", e, t = !1) {
    this.cluster = r, this.endpoint = e, this.allowUnknownMint = t, this.connection = this.createConnection();
  }
  /**
   * Create Solana RPC connection
   */
  createConnection() {
    const r = this.endpoint ?? C(this.cluster);
    return new b(r, "confirmed");
  }
  /**
   * Transform RPC errors into user-friendly messages
   */
  transformRpcError(r) {
    const e = r instanceof Error ? r.message : typeof r == "string" ? r : String(r);
    return e.includes("403") || e.includes("Access forbidden") ? new Error(
      "Public Solana RPC access denied. Please configure a custom RPC endpoint (e.g., from Helius, QuickNode, or Alchemy) in your CedrosProvider config using the solanaEndpoint option."
    ) : e.includes("429") || e.includes("Too Many Requests") ? new Error(
      "Solana RPC rate limit exceeded. Please configure a custom RPC endpoint with higher limits in your CedrosProvider config using the solanaEndpoint option."
    ) : r instanceof Error ? r : new Error(e);
  }
  /**
   * Build transaction from x402 requirement
   */
  async buildTransaction(r) {
    const { requirement: e, payerPublicKey: t, blockhash: n } = r;
    if (!e || !e.payTo)
      throw new Error("Invalid requirement: missing payTo");
    u().debug("[WalletManager] Building transaction for resource:", e.resource);
    const a = new P(), s = this.resolveAmountInMinorUnits(e), o = e.asset;
    if (!o)
      throw new Error("asset is required in x402 requirement");
    const c = S(o, e.resource, this.allowUnknownMint);
    if (!c.isValid && c.error)
      throw new Error(c.error);
    c.warning && u().warn(c.warning);
    const E = new l(o), h = await T(
      E,
      t
    );
    if (!this.rpcRateLimiter.tryConsume())
      throw new Error("RPC rate limit exceeded. Please try again in a moment.");
    let y;
    try {
      y = await this.rpcCircuitBreaker.execute(async () => await m(
        async () => await this.connection.getAccountInfo(h),
        { ...g.QUICK, name: "rpc-get-account-info" }
      ));
    } catch (i) {
      throw i instanceof w ? new Error("Solana RPC service is temporarily unavailable. Please try again in a few moments.") : this.transformRpcError(i);
    }
    if (!y)
      throw new Error("Payer is missing an associated token account for this mint");
    let p;
    try {
      p = e.extra?.recipientTokenAccount ? new l(e.extra.recipientTokenAccount) : new l(e.payTo);
    } catch (i) {
      throw u().warn("[WalletManager] Failed to resolve recipient address:", i), new Error("We are currently unable to process payment, please try again later");
    }
    if (a.add(
      A(
        h,
        p,
        t,
        s
      )
    ), e.extra?.memo) {
      const i = new R({
        keys: [],
        programId: new l("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from(e.extra.memo, "utf8")
      });
      a.add(i);
    }
    let d;
    if (n)
      d = n;
    else {
      if (!this.rpcRateLimiter.tryConsume())
        throw new Error("RPC rate limit exceeded. Please try again in a moment.");
      try {
        d = (await this.rpcCircuitBreaker.execute(async () => await m(
          async () => await this.connection.getLatestBlockhash(),
          { ...g.QUICK, name: "rpc-get-blockhash" }
        ))).blockhash;
      } catch (i) {
        throw i instanceof w ? new Error("Solana RPC service is temporarily unavailable. Please try again in a few moments.") : this.transformRpcError(i);
      }
    }
    return a.recentBlockhash = d, e.extra?.feePayer ? a.feePayer = new l(e.extra.feePayer) : a.feePayer = t, a;
  }
  /**
   * Parse amount from x402 requirement (already in atomic units as string).
   * Uses BigInt to avoid truncation/overflow for large atomic values.
   */
  resolveAmountInMinorUnits(r) {
    const e = r.maxAmountRequired;
    if (!/^\d+$/.test(e))
      throw new Error("Invalid maxAmountRequired in requirement: must be a non-negative integer string");
    const t = BigInt(e);
    if (t <= 0n)
      throw new Error("Invalid maxAmountRequired in requirement");
    return t;
  }
  /**
   * Build payment payload from signed transaction (x402 spec)
   */
  buildPaymentPayload(r) {
    const { requirement: e, signedTx: t, payerPublicKey: n } = r;
    return {
      x402Version: 0,
      scheme: e.scheme,
      network: e.network,
      payload: {
        signature: t.signature,
        transaction: t.serialized,
        payer: n.toString(),
        memo: e.extra?.memo,
        recipientTokenAccount: e.extra?.recipientTokenAccount
      }
    };
  }
  /**
   * Sign transaction using wallet adapter (fully signed for regular mode)
   */
  async signTransaction(r) {
    const { transaction: e, signTransaction: t } = r;
    u().debug("[WalletManager] Requesting wallet to sign transaction");
    const n = await t(e), a = n.serialize(), s = n.signatures[0]?.signature;
    if (!s)
      throw new Error("Signed transaction missing signature");
    const o = k.encode(s);
    return u().debug("[WalletManager] Transaction signed with signature:", o.substring(0, 20) + "..."), {
      serialized: f.fromUint8Array(a),
      signature: o
    };
  }
  /**
   * Deserialize a base64-encoded transaction from the backend
   * Used for gasless flow where backend builds the complete transaction
   */
  deserializeTransaction(r) {
    try {
      const e = f.toUint8Array(r);
      return P.from(e);
    } catch (e) {
      throw new Error(
        `Failed to deserialize transaction: ${M(e, "Unknown error")}`
      );
    }
  }
  /**
   * Partially sign transaction for gasless mode
   * User signs their authority, server will co-sign as fee payer
   */
  async partiallySignTransaction(r) {
    const { transaction: e, signTransaction: t, blockhash: n } = r;
    n && e.recentBlockhash !== n && (e.recentBlockhash = n);
    const a = await t(e), s = a.signatures[0]?.signature;
    if (s) {
      const c = k.encode(s);
      u().debug("[WalletManager] Partially signed with signature:", c.substring(0, 20) + "...");
    }
    const o = a.serialize({
      requireAllSignatures: !1,
      verifySignatures: !1
    });
    return f.fromUint8Array(o);
  }
  /**
   * Get wallet balance
   */
  async getBalance(r) {
    if (!this.rpcRateLimiter.tryConsume())
      throw new Error("RPC rate limit exceeded. Please try again in a moment.");
    try {
      return await this.rpcCircuitBreaker.execute(async () => await m(
        async () => await this.connection.getBalance(r),
        { ...g.QUICK, name: "rpc-get-balance" }
      )) / x;
    } catch (e) {
      throw e instanceof w ? new Error("Solana RPC service is temporarily unavailable. Please try again in a few moments.") : this.transformRpcError(e);
    }
  }
  /**
   * Verify transaction on-chain
   */
  async verifyTransaction(r) {
    if (!this.rpcRateLimiter.tryConsume())
      throw new Error("RPC rate limit exceeded for transaction verification");
    try {
      return !!(await this.rpcCircuitBreaker.execute(async () => await m(
        async () => await this.connection.getSignatureStatus(r),
        { ...g.QUICK, name: "rpc-verify-tx" }
      ))).value?.confirmationStatus;
    } catch (e) {
      return e instanceof w && u().warn("[WalletManager] Circuit breaker OPEN - cannot verify transaction"), !1;
    }
  }
}
export {
  z as WalletManager
};
