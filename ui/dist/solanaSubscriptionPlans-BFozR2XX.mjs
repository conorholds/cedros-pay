import { Transaction as y, Connection as P, PublicKey as o, TransactionInstruction as d, SystemProgram as I, clusterApiUrl as m } from "@solana/web3.js";
const E = 7, g = 8, T = 9, k = "plan", p = "De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44", B = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", N = 491, R = 1, _ = 91;
function C(n) {
  const t = U(n.config, n.interval, n.ownerPublicKey), e = M(n.action, n.config, n.interval, t), r = new y().add(e);
  return r.feePayer = t.owner, { transaction: r, planAddress: t.planPda.toBase58() };
}
async function q(n) {
  const t = n.provider ?? H(), e = await V(t);
  if (e.toBase58() !== n.config.merchantAddress)
    throw new Error("Connected wallet does not match the Solana plan merchant address.");
  const { transaction: r, planAddress: a } = C({
    ...n,
    ownerPublicKey: e
  }), s = new P(
    X(n.network ?? "mainnet-beta", n.rpcEndpoint),
    "confirmed"
  ), u = await K(s, t, r), i = n.action === "delete" ? void 0 : await G(
    s,
    a,
    new o(n.config.programAddress || p)
  );
  return { signature: u, planAddress: a, createdAt: i };
}
function L(n) {
  if (n.length !== N || n[0] !== R)
    throw new Error("Solana subscription plan account has invalid data.");
  const e = new DataView(n.buffer, n.byteOffset, n.byteLength).getBigInt64(_, !0);
  if (e > BigInt(Number.MAX_SAFE_INTEGER) || e < BigInt(Number.MIN_SAFE_INTEGER))
    throw new Error("Solana plan createdAt is outside the safe JavaScript integer range.");
  return Number(e);
}
function M(n, t, e, r) {
  return n === "create" ? new d({
    programId: r.programId,
    keys: [
      { pubkey: r.owner, isSigner: !0, isWritable: !0 },
      { pubkey: r.planPda, isSigner: !1, isWritable: !0 },
      { pubkey: r.tokenMint, isSigner: !1, isWritable: !1 },
      { pubkey: I.programId, isSigner: !1, isWritable: !1 },
      { pubkey: r.tokenProgram, isSigner: !1, isWritable: !1 }
    ],
    data: D(t, e ?? "monthly")
  }) : n === "update" ? new d({
    programId: r.programId,
    keys: [
      { pubkey: r.owner, isSigner: !0, isWritable: !1 },
      { pubkey: r.planPda, isSigner: !1, isWritable: !0 }
    ],
    data: W(t, e ?? "monthly")
  }) : new d({
    programId: r.programId,
    keys: [
      { pubkey: r.owner, isSigner: !0, isWritable: !0 },
      { pubkey: r.planPda, isSigner: !1, isWritable: !0 }
    ],
    data: Buffer.from([T])
  });
}
function D(n, t) {
  const e = t === "annual" ? n.annualAmountAtomic : n.monthlyAmountAtomic, r = t === "annual" ? n.annualPeriodHours : n.monthlyPeriodHours;
  if (!e || !r)
    throw new Error(`Missing Solana ${t} amount or period hours.`);
  const a = Buffer.alloc(457);
  return a[0] = E, l(a, 1, A(n, t)), new o(n.tokenMint).toBuffer().copy(a, 9), l(a, 41, e), l(a, 49, r), f(a, 57, 0), f(a, 65, b(n, t)), c(a, 73, n.destinations ?? []), c(a, 201, n.pullers ?? []), h(a, 329, n.metadataUri), a;
}
function W(n, t) {
  const e = Buffer.alloc(266);
  return e[0] = g, e[1] = v(n, t) === "sunset" ? 0 : 1, f(e, 2, b(n, t)), c(e, 10, n.pullers ?? []), h(e, 138, n.metadataUri), e;
}
function U(n, t, e) {
  const r = new o(n.programAddress || p), a = e ? Z(e) : new o(n.merchantAddress), s = new o(n.tokenMint), u = new o(n.tokenProgramAddress || B), i = A(n, t), w = O(n, t, i), S = w ? new o(w) : o.findProgramAddressSync(
    [Buffer.from(k, "utf8"), a.toBuffer(), J(i)],
    r
  )[0];
  return { programId: r, owner: a, tokenMint: s, tokenProgram: u, planPda: S };
}
function A(n, t) {
  return t === "annual" ? n.annualPlanId ?? n.planId : n.monthlyPlanId ?? n.planId;
}
function O(n, t, e) {
  return t === "annual" ? n.annualPlanAddress ?? (e === n.planId ? n.planAddress : void 0) : n.monthlyPlanAddress ?? (e === n.planId ? n.planAddress : void 0);
}
function v(n, t) {
  return t === "annual" ? n.annualStatus ?? n.status ?? "active" : n.monthlyStatus ?? n.status ?? "active";
}
function b(n, t) {
  return t === "annual" ? n.annualEndTs ?? n.endTs ?? 0 : n.monthlyEndTs ?? n.endTs ?? 0;
}
async function K(n, t, e) {
  const r = await n.getLatestBlockhash("confirmed");
  e.recentBlockhash = r.blockhash;
  const a = await F(n, t, e);
  if ((await n.confirmTransaction(
    { signature: a, blockhash: r.blockhash, lastValidBlockHeight: r.lastValidBlockHeight },
    "confirmed"
  )).value.err) throw new Error("Solana plan transaction failed.");
  return a;
}
async function F(n, t, e) {
  if (t.signAndSendTransaction) {
    const a = await t.signAndSendTransaction(e, {
      skipPreflight: !1,
      preflightCommitment: "confirmed"
    }), s = typeof a == "string" ? a : a.signature;
    if (!s) throw new Error("Wallet did not return a Solana transaction signature.");
    return s;
  }
  if (!t.signTransaction)
    throw new Error("Connected Solana wallet cannot sign transactions.");
  const r = await t.signTransaction(e);
  return n.sendRawTransaction(r.serialize(), {
    skipPreflight: !1,
    preflightCommitment: "confirmed"
  });
}
async function G(n, t, e) {
  const r = await n.getAccountInfo(new o(t), "confirmed");
  if (!r) throw new Error("Solana subscription plan was not found after confirmation.");
  if (!r.owner.equals(e))
    throw new Error("Solana subscription plan is not owned by the subscriptions program.");
  return L(r.data);
}
function H() {
  const n = globalThis, t = n.solana ?? n.phantom?.solana;
  if (!t) throw new Error("Please install a Solana wallet like Phantom, Solflare, or Backpack.");
  return t;
}
async function V(n) {
  const t = await n.connect?.(), e = Q(t?.publicKey ?? n.publicKey);
  if (!e) throw new Error("Solana wallet did not return a public key.");
  return new o(e);
}
function X(n, t) {
  return t || (n === "devnet" || n === "testnet" || n === "mainnet-beta" ? m(n) : m("mainnet-beta"));
}
function c(n, t, e) {
  for (let r = 0; r < 4; r += 1) {
    const a = e[r];
    a && new o(a).toBuffer().copy(n, t + r * 32);
  }
}
function h(n, t, e) {
  if (!e) return;
  const r = Buffer.from(e, "utf8");
  if (r.length > 128) throw new Error("Solana plan metadata URI must be at most 128 bytes.");
  r.copy(n, t);
}
function l(n, t, e) {
  n.writeBigUInt64LE(BigInt(e), t);
}
function f(n, t, e) {
  n.writeBigInt64LE(BigInt(e), t);
}
function J(n) {
  const t = Buffer.alloc(8);
  return l(t, 0, n), t;
}
function Q(n) {
  return n ? typeof n == "string" ? n : typeof n.toBase58 == "function" ? n.toBase58() : null : null;
}
function Z(n) {
  return typeof n == "string" ? new o(n) : n;
}
export {
  C as buildSolanaSubscriptionPlanTransaction,
  L as decodeSolanaPlanCreatedAt,
  q as sendSolanaSubscriptionPlanTransaction
};
