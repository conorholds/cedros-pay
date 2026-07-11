import { clusterApiUrl as R, Connection as b, Transaction as P, PublicKey as l, TransactionInstruction as x, LAMPORTS_PER_SOL as T } from "@solana/web3.js";
import { getAssociatedTokenAddress as A, createTransferInstruction as v } from "@solana/spl-token";
import { g as u, b as w } from "./fetchWithTimeout-D-qpKB_T.mjs";
import { b as E } from "./index-BFt38o8Q.mjs";
import { g as B, f as S, k as m, e as g, b as d, s as h, m as M } from "./CedrosContext-Dlez5itz.mjs";
import { v as q } from "./locales-BNQRXSb3.mjs";
class O {
  connection;
  cluster;
  endpoint;
  allowUnknownMint;
  rpcRateLimiter = B({
    maxRequests: 50,
    windowMs: 6e4
    // 50 requests per minute for RPC calls
  });
  rpcCircuitBreaker = S({
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
    const r = this.endpoint ?? R(this.cluster);
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
    const c = q(o, e.resource, this.allowUnknownMint);
    if (!c.isValid && c.error)
      throw new Error(c.error);
    c.warning && u().warn(c.warning);
    const C = new l(o), y = await A(
      C,
      t
    );
    if (!this.rpcRateLimiter.tryConsume())
      throw new Error("RPC rate limit exceeded. Please try again in a moment.");
    let p;
    try {
      p = await this.rpcCircuitBreaker.execute(async () => await m(
        async () => await this.connection.getAccountInfo(y),
        { ...g.QUICK, name: "rpc-get-account-info" }
      ));
    } catch (i) {
      throw i instanceof d ? new Error(h("Solana RPC service")) : this.transformRpcError(i);
    }
    if (!p)
      throw new Error("Payer is missing an associated token account for this mint");
    let k;
    try {
      k = e.extra?.recipientTokenAccount ? new l(e.extra.recipientTokenAccount) : new l(e.payTo);
    } catch (i) {
      throw u().warn("[WalletManager] Failed to resolve recipient address:", i), new Error("We are currently unable to process payment, please try again later");
    }
    if (a.add(
      v(
        y,
        k,
        t,
        s
      )
    ), e.extra?.memo) {
      const i = new x({
        keys: [],
        programId: new l("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from(e.extra.memo, "utf8")
      });
      a.add(i);
    }
    let f;
    if (n)
      f = n;
    else {
      if (!this.rpcRateLimiter.tryConsume())
        throw new Error("RPC rate limit exceeded. Please try again in a moment.");
      try {
        f = (await this.rpcCircuitBreaker.execute(async () => await m(
          async () => await this.connection.getLatestBlockhash(),
          { ...g.QUICK, name: "rpc-get-blockhash" }
        ))).blockhash;
      } catch (i) {
        throw i instanceof d ? new Error(h("Solana RPC service")) : this.transformRpcError(i);
      }
    }
    return a.recentBlockhash = f, e.extra?.feePayer ? a.feePayer = new l(e.extra.feePayer) : a.feePayer = t, a;
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
    const o = E.encode(s);
    return u().debug("[WalletManager] Transaction signed with signature:", o.substring(0, 20) + "..."), {
      serialized: w.fromUint8Array(a),
      signature: o
    };
  }
  /**
   * Deserialize a base64-encoded transaction from the backend
   * Used for gasless flow where backend builds the complete transaction
   */
  deserializeTransaction(r) {
    try {
      const e = w.toUint8Array(r);
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
      const c = E.encode(s);
      u().debug("[WalletManager] Partially signed with signature:", c.substring(0, 20) + "...");
    }
    const o = a.serialize({
      requireAllSignatures: !1,
      verifySignatures: !1
    });
    return w.fromUint8Array(o);
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
      )) / T;
    } catch (e) {
      throw e instanceof d ? new Error(h("Solana RPC service")) : this.transformRpcError(e);
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
      return e instanceof d && u().warn("[WalletManager] Circuit breaker OPEN - cannot verify transaction"), !1;
    }
  }
}
export {
  O as WalletManager
};
