import { vi as n } from "vitest";
import { jsx as c, Fragment as k } from "react/jsx-runtime";
import { a as f } from "../CedrosContext-Dlez5itz.mjs";
import { a as Q, c as Z, b as X } from "../testing-CO0L_g3S.mjs";
const P = {
  clusterApiUrl: n.fn(() => "https://api.devnet.solana.com"),
  Connection: class {
    async getLatestBlockhash() {
      return {
        blockhash: "mockedBlockhash123",
        lastValidBlockHeight: 1e6
      };
    }
    async getBalance() {
      return 1e9;
    }
    async getSignatureStatus() {
      return { value: { confirmationStatus: "confirmed" } };
    }
    async getAccountInfo() {
      return {
        data: new Uint8Array(),
        executable: !1,
        lamports: 1e6,
        owner: new Uint8Array(32),
        rentEpoch: 0
      };
    }
    async sendRawTransaction() {
      return "mockedSignature123";
    }
    async confirmTransaction() {
      return { value: { err: null } };
    }
  },
  SystemProgram: {
    transfer: n.fn(() => ({
      keys: [],
      programId: {},
      data: new Uint8Array()
    }))
  },
  Transaction: class {
    recentBlockhash;
    feePayer;
    instructions = [];
    add(t) {
      return this.instructions.push(t), this;
    }
    serialize() {
      return new Uint8Array([1, 2, 3, 4, 5]);
    }
  },
  LAMPORTS_PER_SOL: 1e9,
  PublicKey: class {
    constructor(t) {
      this.value = t;
    }
    value;
    toString() {
      return typeof this.value == "string" ? this.value : "mockPublicKey123";
    }
    toBase58() {
      return this.toString();
    }
    toBytes() {
      return new Uint8Array(32);
    }
  }
}, T = {
  getAssociatedTokenAddress: n.fn(async () => ({
    toBase58: () => "mockTokenAddress123"
  })),
  createTransferInstruction: n.fn(() => ({
    keys: [],
    programId: {},
    data: new Uint8Array()
  })),
  TOKEN_PROGRAM_ID: "mockTokenProgramId"
}, w = {
  ConnectionProvider: ({ children: e }) => e,
  WalletProvider: ({ children: e }) => e,
  useWallet: () => ({
    connected: !1,
    connecting: !1,
    connect: n.fn(),
    disconnect: n.fn(),
    publicKey: null,
    signTransaction: n.fn(),
    signAllTransactions: n.fn(),
    select: n.fn()
  })
}, b = {
  PhantomWalletAdapter: class {
  }
}, x = {
  SolflareWalletAdapter: class {
  }
}, C = {
  loadStripe: n.fn(async () => ({
    redirectToCheckout: n.fn(async (e) => ({
      error: null
    })),
    confirmCardPayment: n.fn(async () => ({
      paymentIntent: { id: "pi_mock123", status: "succeeded" },
      error: null
    }))
  }))
};
function R(e = !0, t = "mockWallet123") {
  return {
    connected: e,
    connecting: !1,
    connect: n.fn().mockResolvedValue(void 0),
    disconnect: n.fn().mockResolvedValue(void 0),
    publicKey: e ? { toBase58: () => t, toString: () => t } : null,
    signTransaction: n.fn().mockResolvedValue({
      signature: new Uint8Array(64),
      serialize: () => new Uint8Array([1, 2, 3])
    }),
    signAllTransactions: n.fn().mockResolvedValue([]),
    select: n.fn()
  };
}
function W(e = {}) {
  const { redirectSuccess: t = !0 } = e, o = e.sessionId ?? "cs_test_mock123";
  return {
    redirectToCheckout: n.fn().mockResolvedValue({
      error: t ? null : { message: "Mock redirect error" }
    }),
    confirmCardPayment: n.fn().mockResolvedValue({
      paymentIntent: {
        id: "pi_mock123",
        status: "succeeded"
      },
      error: null
    }),
    _sessionId: o
    // Store for potential inspection
  };
}
function U(e) {
  return n.fn((t) => {
    for (const [o, r] of Object.entries(e))
      if (t.includes(o))
        return Promise.resolve({
          ok: r.status >= 200 && r.status < 300,
          status: r.status,
          json: async () => r.body,
          text: async () => JSON.stringify(r.body),
          headers: new Map(Object.entries(r.headers || {}))
        });
    return Promise.resolve({
      ok: !1,
      status: 404,
      json: async () => ({ error: "Not found" }),
      text: async () => JSON.stringify({ error: "Not found" }),
      headers: /* @__PURE__ */ new Map()
    });
  });
}
function p(e = {}) {
  return function({ children: o }) {
    const r = {
      stripePublicKey: e.stripePublicKey ?? "pk_test_mock_key_for_testing",
      serverUrl: e.serverUrl ?? "http://localhost:8080",
      solanaCluster: e.solanaCluster ?? "devnet",
      solanaEndpoint: e.solanaEndpoint,
      theme: e.theme ?? "light",
      themeOverrides: e.themeOverrides,
      unstyled: !1,
      tokenMint: void 0,
      dangerouslyAllowUnknownMint: !0,
      // Allow any mint in test mode
      logLevel: 4
      // LogLevel.SILENT - no logs in tests
    };
    return /* @__PURE__ */ c(f, { config: r, children: o });
  };
}
function I() {
  return p({
    stripePublicKey: "pk_test_minimal",
    serverUrl: "http://localhost:8080",
    solanaCluster: "devnet"
  });
}
function j(e = {}) {
  return e.connected, e.publicKey, e.connecting, function({ children: o }) {
    return /* @__PURE__ */ c(k, { children: o });
  };
}
function O(e = "cs_test_mock123") {
  return {
    success: !0,
    transactionId: e,
    error: void 0
  };
}
function q(e = "Payment failed") {
  return {
    success: !1,
    transactionId: void 0,
    error: e
  };
}
function B(e = {}) {
  const {
    scheme: t = "solana-spl-transfer",
    network: o = "mainnet-beta",
    maxAmountRequired: r = "1000000",
    resource: s = "test-resource",
    description: a = "Test Payment",
    mimeType: i = "application/json",
    payTo: l = "mockRecipient123",
    maxTimeoutSeconds: u = 300,
    asset: m = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    // USDC mint
    extra: d = {
      recipientTokenAccount: "mockTokenAccount123",
      decimals: 6,
      tokenSymbol: "USDC",
      memo: "test-payment"
    }
  } = e;
  return {
    scheme: t,
    network: o,
    maxAmountRequired: r,
    resource: s,
    description: a,
    mimeType: i,
    payTo: l,
    maxTimeoutSeconds: u,
    asset: m,
    extra: d
  };
}
function E(e = {}) {
  const {
    success: t = !0,
    error: o = null,
    txHash: r = "mockSignature123",
    networkId: s = "mainnet-beta",
    metadata: a
  } = e;
  return {
    success: t,
    error: o,
    txHash: r,
    networkId: s,
    metadata: a
  };
}
async function K() {
  return new Promise((e) => setTimeout(e, 0));
}
async function N(e) {
  return new Promise((t) => setTimeout(t, e));
}
function V(e, t = {}) {
  const {
    maxAmountRequired: o = "1000000",
    asset: r = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    // USDC mint
    payTo: s = "mockRecipient123"
  } = t;
  return {
    ok: !1,
    status: 402,
    json: async () => ({
      x402Version: 0,
      error: "payment required",
      accepts: [
        {
          scheme: "solana-spl-transfer",
          network: "mainnet-beta",
          maxAmountRequired: o,
          resource: e,
          description: "Payment required",
          mimeType: "application/json",
          payTo: s,
          maxTimeoutSeconds: 300,
          asset: r,
          extra: {
            recipientTokenAccount: "mockTokenAccount123",
            decimals: 6,
            tokenSymbol: "USDC",
            memo: `${e}:${Date.now()}`
          }
        }
      ]
    }),
    headers: /* @__PURE__ */ new Map([
      ["content-type", "application/json"]
    ])
  };
}
function F(e = !0) {
  const t = e ? {
    success: !0,
    error: null,
    txHash: "mockSignature123",
    networkId: "mainnet-beta"
  } : {
    success: !1,
    error: "Payment verification failed",
    txHash: null,
    networkId: null
  };
  return {
    ok: e,
    status: e ? 200 : 402,
    json: async () => t,
    headers: /* @__PURE__ */ new Map([
      ["x-payment-response", JSON.stringify(t)]
    ])
  };
}
function G(e = "cs_test_mock123") {
  return {
    ok: !0,
    status: 200,
    json: async () => ({
      sessionId: e,
      url: `https://checkout.stripe.com/pay/${e}`
    })
  };
}
function D(e = "mockWallet123") {
  return {
    publicKey: {
      toBase58: () => e,
      toString: () => e
    }
  };
}
function z() {
  return {
    signature: new Uint8Array(64).fill(1),
    serialize: () => new Uint8Array([1, 2, 3, 4, 5])
  };
}
function H(e) {
  return n.fn(e);
}
async function J() {
  return new Promise((e) => setImmediate(e));
}
export {
  Q as autosaveFailureFixtures,
  Z as createAutosaveProblemError,
  X as createAutosaveSaveResult,
  I as createMinimalMockProvider,
  p as createMockCedrosProvider,
  U as createMockFetch,
  W as createMockStripe,
  R as createMockWallet,
  H as createSpy,
  J as flushPromises,
  q as mockPaymentFailure,
  O as mockPaymentSuccess,
  b as mockPhantomWalletAdapter,
  V as mockQuoteResponse,
  E as mockSettlement,
  z as mockSignTransaction,
  P as mockSolanaWeb3,
  x as mockSolflareWalletAdapter,
  T as mockSplToken,
  C as mockStripeJs,
  G as mockStripeSessionResponse,
  F as mockVerifyResponse,
  w as mockWalletAdapter,
  D as mockWalletConnect,
  j as mockWalletProvider,
  B as mockX402Quote,
  N as wait,
  K as waitForNextTick
};
