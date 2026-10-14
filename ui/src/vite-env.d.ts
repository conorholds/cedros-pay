/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  readonly VITE_SERVER_URL?: string;
  readonly VITE_SOLANA_CLUSTER?: string;
  readonly VITE_SOLANA_RPC_URL?: string;
  readonly VITE_STORYBOOK_SOLANA_ENDPOINT?: string;
  readonly VITE_STORYBOOK_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'bn.js' {
  class BN {
    constructor(value: number | string);
  }
  export default BN;
}
