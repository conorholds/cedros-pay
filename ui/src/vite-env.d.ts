/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  readonly VITE_SERVER_URL?: string;
  readonly VITE_SOLANA_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Optional peer dependencies — ambient declarations for dynamic imports
declare module '@meteora-ag/dlmm' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DLMM: any;
  export default DLMM;
}

declare module 'bn.js' {
  class BN {
    constructor(value: number | string);
  }
  export default BN;
}
