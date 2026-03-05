/**
 * Meteora DLMM Pool Manager
 *
 * Business logic for creating and managing Meteora DLMM liquidity pools
 * for gift card secondary market buyback. Uses dynamic import of
 * @meteora-ag/dlmm to keep the bundle zero-impact for non-users.
 *
 * @module MeteoraPoolManager
 */

import type { Connection, PublicKey, Transaction } from '@solana/web3.js';

/** Lazy-loaded DLMM module type */
interface DLMMModule {
  default: DLMMClass;
}

/** Subset of DLMM class methods we use */
interface DLMMClass {
  create(connection: Connection, pool: PublicKey, opt?: DLMMOpt): Promise<DLMMInstance>;
  createLbPair2(
    connection: Connection,
    funder: PublicKey,
    tokenX: PublicKey,
    tokenY: PublicKey,
    presetParameter: PublicKey,
    activeId: unknown, // BN
    opt?: DLMMOpt,
  ): Promise<Transaction>;
  getAllPresetParameters(connection: Connection, opt?: DLMMOpt): Promise<{
    presetParameter: unknown[];
    presetParameter2: PresetParam2Account[];
  }>;
  getBinIdFromPrice(price: string | number, binStep: number, min: boolean): number;
  getPricePerLamport(tokenXDecimal: number, tokenYDecimal: number, price: number): string;
}

interface DLMMOpt {
  cluster?: string;
}

interface PresetParam2Account {
  publicKey: PublicKey;
  account: { binStep: number; baseFactor: number };
}

/** Subset of DLMM instance methods */
interface DLMMInstance {
  lbPair: { activeId: number; binStep: number };
  tokenX: { decimal: number };
  tokenY: { decimal: number };
  getActiveBin(): Promise<{ binId: number; price: string }>;
  initializePositionAndAddLiquidityByStrategy(params: AddLiquidityParams): Promise<Transaction>;
}

interface AddLiquidityParams {
  positionPubKey: PublicKey;
  totalXAmount: unknown; // BN
  totalYAmount: unknown; // BN
  strategy: { maxBinId: number; minBinId: number; strategyType: number };
  user: PublicKey;
  slippage?: number;
}

/** Pool status returned to the UI */
export interface PoolStatus {
  address: string;
  activeBinId: number;
  activeBinPrice: string;
  binStep: number;
}

/** Result of pool creation */
export interface CreatePoolResult {
  transaction: Transaction;
  poolAddress: PublicKey;
}

/** Result of liquidity deposit */
export interface AddLiquidityResult {
  transaction: Transaction;
  positionKeypair: { publicKey: PublicKey; secretKey: Uint8Array };
}

// Strategy type enum value for Spot distribution
const STRATEGY_SPOT = 0;

/**
 * Manages Meteora DLMM pool operations for gift card buyback.
 *
 * All Solana transactions are built but not sent — the caller (UI)
 * handles wallet signing and submission.
 */
export class MeteoraPoolManager {
  private dlmmModule: DLMMClass | null = null;
  private bnClass: (new (value: number | string) => unknown) | null = null;
  private keypairClass: { generate(): { publicKey: PublicKey; secretKey: Uint8Array } } | null = null;

  /** Dynamic import of @meteora-ag/dlmm. Throws descriptive error if not installed. */
  private async loadDLMM(): Promise<DLMMClass> {
    if (this.dlmmModule) return this.dlmmModule;
    try {
      const mod = await import('@meteora-ag/dlmm') as unknown as DLMMModule;
      this.dlmmModule = mod.default ?? mod as unknown as DLMMClass;
      return this.dlmmModule;
    } catch {
      throw new Error(
        'Install @meteora-ag/dlmm to enable pool deployment: npm install @meteora-ag/dlmm'
      );
    }
  }

  /** Dynamic import of BN.js (bundled with @solana/web3.js) */
  private async loadBN(): Promise<new (value: number | string) => unknown> {
    if (this.bnClass) return this.bnClass;
    const mod = await import('bn.js') as { default: new (v: number | string) => unknown };
    this.bnClass = mod.default ?? mod as unknown as new (v: number | string) => unknown;
    return this.bnClass;
  }

  /** Dynamic import of Keypair */
  private async loadKeypair(): Promise<typeof this.keypairClass> {
    if (this.keypairClass) return this.keypairClass;
    const { Keypair } = await import('@solana/web3.js');
    this.keypairClass = Keypair as unknown as typeof this.keypairClass;
    return this.keypairClass;
  }

  /**
   * Compute the DLMM bin ID for a given buyback price.
   *
   * @param buybackPrice - Price per gift card token in USDC (e.g., 0.80)
   * @param giftCardDecimals - Decimals of the gift card token (e.g., 2)
   * @param usdcDecimals - Decimals of USDC (typically 6)
   * @param binStep - Pool bin step (default 1 = finest granularity)
   * @returns bin ID
   */
  async computeBinId(
    buybackPrice: number,
    giftCardDecimals: number,
    usdcDecimals: number,
    binStep = 1,
  ): Promise<number> {
    const DLMM = await this.loadDLMM();
    const pricePerLamport = DLMM.getPricePerLamport(giftCardDecimals, usdcDecimals, buybackPrice);
    return DLMM.getBinIdFromPrice(pricePerLamport, binStep, true);
  }

  /**
   * Find a suitable PresetParameter2 account for the desired bin step.
   *
   * @returns The preset parameter public key to use with createLbPair2
   */
  async findPresetParameter(
    connection: Connection,
    binStep: number,
    cluster?: string,
  ): Promise<PublicKey> {
    const DLMM = await this.loadDLMM();
    const opt = cluster ? { cluster } : undefined;
    const { presetParameter2 } = await DLMM.getAllPresetParameters(connection, opt);

    const match = presetParameter2.find(p => p.account.binStep === binStep);
    if (!match) {
      throw new Error(
        `No PresetParameter2 found for binStep=${binStep}. Available: ${presetParameter2.map(p => p.account.binStep).join(', ')}`
      );
    }
    return match.publicKey;
  }

  /**
   * Build transaction to create a new DLMM pool.
   *
   * @param connection - Solana RPC connection
   * @param funder - Admin wallet public key (pays for account creation)
   * @param giftCardMint - Token-22 gift card mint address
   * @param usdcMint - USDC mint address
   * @param activeBinId - Bin ID representing the initial price ($1.00 face value)
   * @param binStep - Pool bin step (default 1)
   * @param cluster - Solana cluster name
   * @returns Transaction to sign and pool address
   */
  async createPool(
    connection: Connection,
    funder: PublicKey,
    giftCardMint: PublicKey,
    usdcMint: PublicKey,
    activeBinId: number,
    binStep = 1,
    cluster?: string,
  ): Promise<CreatePoolResult> {
    const DLMM = await this.loadDLMM();
    const BN = await this.loadBN();
    const opt = cluster ? { cluster } : undefined;

    const presetParam = await this.findPresetParameter(connection, binStep, cluster);

    const tx = await DLMM.createLbPair2(
      connection,
      funder,
      giftCardMint,
      usdcMint,
      presetParam,
      new BN(activeBinId),
      opt,
    );

    // The pool address is derived deterministically by the program.
    // After the tx is confirmed, we load the pool to get the address.
    // For now, we extract it from the transaction's account keys.
    const poolAddress = tx.instructions[0]?.keys?.[1]?.pubkey;
    if (!poolAddress) {
      throw new Error('Failed to extract pool address from transaction');
    }

    return { transaction: tx, poolAddress };
  }

  /**
   * Build transaction to add one-sided USDC liquidity at the buyback price.
   *
   * @param connection - Solana RPC connection
   * @param user - Admin wallet public key
   * @param poolAddress - DLMM pool address from createPool
   * @param usdcAmountLamports - Amount of USDC in lamports (e.g., 250_000_000 for $250)
   * @param buybackBinId - Bin ID for the buyback price
   * @param cluster - Solana cluster name
   * @returns Transaction and position keypair (must be included as signer)
   */
  async addBuybackLiquidity(
    connection: Connection,
    user: PublicKey,
    poolAddress: PublicKey,
    usdcAmountLamports: number,
    buybackBinId: number,
    cluster?: string,
  ): Promise<AddLiquidityResult> {
    const DLMM = await this.loadDLMM();
    const BN = await this.loadBN();
    const Keypair = await this.loadKeypair();
    const opt = cluster ? { cluster } : undefined;

    const pool = await DLMM.create(connection, poolAddress, opt);
    const positionKeypair = Keypair!.generate();

    // Place USDC in 2 bins centered on the buyback price (below active bin)
    const minBinId = buybackBinId - 1;
    const maxBinId = buybackBinId;

    const tx = await pool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: positionKeypair.publicKey,
      totalXAmount: new BN(0),                   // No gift card tokens (buy-side only)
      totalYAmount: new BN(usdcAmountLamports),   // Admin's USDC
      strategy: {
        maxBinId,
        minBinId,
        strategyType: STRATEGY_SPOT,
      },
      user,
      slippage: 1, // 1% slippage tolerance
    });

    return {
      transaction: tx,
      positionKeypair: positionKeypair as unknown as AddLiquidityResult['positionKeypair'],
    };
  }

  /**
   * Fetch on-chain pool status for display.
   *
   * @returns Pool status or null if pool doesn't exist
   */
  async getPoolStatus(
    connection: Connection,
    poolAddress: PublicKey,
    cluster?: string,
  ): Promise<PoolStatus> {
    const DLMM = await this.loadDLMM();
    const opt = cluster ? { cluster } : undefined;

    const pool = await DLMM.create(connection, poolAddress, opt);
    const activeBin = await pool.getActiveBin();

    return {
      address: poolAddress.toBase58(),
      activeBinId: activeBin.binId,
      activeBinPrice: activeBin.price,
      binStep: pool.lbPair.binStep,
    };
  }
}
