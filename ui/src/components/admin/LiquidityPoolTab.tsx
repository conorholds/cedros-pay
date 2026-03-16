/**
 * Liquidity Pool Tab — Meteora DLMM Pool Management
 *
 * Admin UI for deploying and managing a Meteora DLMM liquidity pool
 * that provides buyback liquidity for gift card tokens.
 * Three states: Deploy Form → Deploying → Pool Active.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConfigApiClient } from './configApi';
import { MeteoraPoolManager } from '../../managers/MeteoraPoolManager';
import type { IAdminAuthManager } from './AdminAuthManager';
import { PoolManagementView } from './PoolManagementView';

interface LiquidityPoolTabProps {
  serverUrl: string;
  authManager?: IAdminAuthManager;
  mintConfigured: boolean;
  mintAddress?: string;
  tokenDecimals?: number;
}

interface PoolConfig {
  liquidityPoolAddress: string | null;
  buybackRateBps: number | null;
  rpcUrl: string | null;
  usdcMint: string | null;
  usdcAmount: number | null;
  deployedAt: string | null;
}

type DeployStep = 'idle' | 'creating_pool' | 'adding_liquidity' | 'saving_config' | 'done' | 'error';

const USDC_DECIMALS = 6;
const DEFAULT_BIN_STEP = 1;
export function LiquidityPoolTab({
  serverUrl,
  authManager,
  mintConfigured,
  mintAddress,
  tokenDecimals = 2,
}: LiquidityPoolTabProps) {
  const [config, setConfig] = useState<PoolConfig>({
    liquidityPoolAddress: null,
    buybackRateBps: null,
    rpcUrl: null,
    usdcMint: null,
    usdcAmount: null,
    deployedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [buybackCents, setBuybackCents] = useState(80);
  const [usdcAmount, setUsdcAmount] = useState(250);
  const [deployStep, setDeployStep] = useState<DeployStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [poolAddress, setPoolAddress] = useState<string | null>(null);
  const [failedAtStep, setFailedAtStep] = useState<DeployStep | null>(null);

  const managerRef = useRef(new MeteoraPoolManager());

  const fetchConfig = useCallback(async () => {
    try {
      const api = new ConfigApiClient(serverUrl, undefined, authManager);
      const [giftResp, x402Resp] = await Promise.all([
        api.getConfig('gift_cards'),
        api.getConfig('x402'),
      ]);
      const gc = giftResp.config ?? {};
      const x4 = x402Resp.config ?? {};

      const addr = (gc.liquidity_pool_address as string) || null;
      setConfig({
        liquidityPoolAddress: addr,
        buybackRateBps: gc.buyback_rate_bps != null ? Number(gc.buyback_rate_bps) : null,
        rpcUrl: (x4.rpc_url as string) || null,
        usdcMint: (x4.token_mint as string) || null,
        usdcAmount: gc.liquidity_usdc_amount != null ? Number(gc.liquidity_usdc_amount) : null,
        deployedAt: (gc.liquidity_deployed_at as string) || null,
      });
      if (addr) setPoolAddress(addr);
      if (gc.buyback_rate_bps != null) setBuybackCents(Number(gc.buyback_rate_bps) / 100);
    } catch {
      // Config may not exist yet
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, authManager]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const walletConnected = typeof window !== 'undefined' && !!(window as WalletWindow).solana?.publicKey;
  const hasRpcUrl = !!config.rpcUrl;
  const hasUsdcMint = !!config.usdcMint;
  const canDeploy = mintConfigured && walletConnected && hasRpcUrl && hasUsdcMint && deployStep === 'idle';

  /** Shared deploy logic — can start from any step for retry support */
  const runDeploy = async (startFrom: 'creating_pool' | 'adding_liquidity' | 'saving_config') => {
    if (!mintAddress || !config.rpcUrl || !config.usdcMint) return;
    setDeployStep(startFrom);
    setErrorMessage(null);
    setFailedAtStep(null);

    try {
      const { Connection, PublicKey, Keypair } = await import('@solana/web3.js');
      const connection = new Connection(config.rpcUrl, 'confirmed');
      const wallet = (window as WalletWindow).solana;
      if (!wallet?.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
      }

      const manager = managerRef.current;
      const funder = new PublicKey(wallet.publicKey.toBase58());
      const buybackPrice = buybackCents / 100;
      const buybackBinId = await manager.computeBinId(buybackPrice, tokenDecimals, USDC_DECIMALS, DEFAULT_BIN_STEP);
      let currentPoolAddr = poolAddress;

      // Step 1: Create pool (skip if retrying from a later step)
      if (startFrom === 'creating_pool') {
        const giftCardMint = new PublicKey(mintAddress);
        const usdcMint = new PublicKey(config.usdcMint);
        const activeBinId = await manager.computeBinId(1.0, tokenDecimals, USDC_DECIMALS, DEFAULT_BIN_STEP);
        const { transaction: createTx, poolAddress: newPoolAddr } = await manager.createPool(
          connection, funder, giftCardMint, usdcMint, activeBinId, DEFAULT_BIN_STEP,
        );
        const signedCreateTx = await wallet.signTransaction(createTx);
        const createSig = await connection.sendRawTransaction(signedCreateTx.serialize());
        await connection.confirmTransaction(createSig, 'confirmed');
        currentPoolAddr = newPoolAddr.toBase58();
        setPoolAddress(currentPoolAddr);
      }

      // Step 2: Add liquidity
      if (startFrom === 'creating_pool' || startFrom === 'adding_liquidity') {
        setDeployStep('adding_liquidity');
        if (!currentPoolAddr) throw new Error('Pool address not available');
        const poolPk = new PublicKey(currentPoolAddr);
        const usdcLamports = Math.round(usdcAmount * 10 ** USDC_DECIMALS);
        const { transaction: liquidityTx, positionKeypair } = await manager.addBuybackLiquidity(
          connection, funder, poolPk, usdcLamports, buybackBinId,
        );
        const posKp = Keypair.fromSecretKey(positionKeypair.secretKey);
        liquidityTx.partialSign(posKp);
        const signedLiqTx = await wallet.signTransaction(liquidityTx);
        const liqSig = await connection.sendRawTransaction(signedLiqTx.serialize());
        await connection.confirmTransaction(liqSig, 'confirmed');
      }

      // Step 3: Save config
      setDeployStep('saving_config');
      if (!currentPoolAddr) throw new Error('Pool address not available');
      const api = new ConfigApiClient(serverUrl, undefined, authManager);
      const rateBps = Math.round(buybackCents * 100);
      const usdcLamports = Math.round(usdcAmount * 10 ** USDC_DECIMALS);
      const deployedAt = new Date().toISOString();
      await api.patchConfig('gift_cards', {
        liquidity_pool_address: currentPoolAddr,
        buyback_rate_bps: rateBps,
        liquidity_usdc_amount: usdcLamports,
        liquidity_deployed_at: deployedAt,
      }, 'Meteora DLMM pool deployed for gift card buyback');

      setConfig(prev => ({
        ...prev,
        liquidityPoolAddress: currentPoolAddr,
        buybackRateBps: rateBps,
        usdcAmount: usdcLamports,
        deployedAt,
      }));
      setDeployStep('done');
    } catch (err) {
      const currentStep = deployStep === 'idle' ? startFrom : deployStep;
      setFailedAtStep(currentStep as DeployStep);
      setErrorMessage(err instanceof Error ? err.message : 'Deployment failed');
      setDeployStep('error');
    }
  };

  const handleDeploy = () => {
    if (!canDeploy) return;
    runDeploy('creating_pool');
  };

  const handleRetry = () => {
    if (!failedAtStep || failedAtStep === 'idle' || failedAtStep === 'done' || failedAtStep === 'error') return;
    runDeploy(failedAtStep as 'creating_pool' | 'adding_liquidity' | 'saving_config');
  };

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>Loading pool configuration...</div>;
  }

  // State C: Pool already configured
  if (config.liquidityPoolAddress) {
    return (
      <PoolManagementView
        serverUrl={serverUrl}
        authManager={authManager}
        poolAddress={config.liquidityPoolAddress}
        buybackRateBps={config.buybackRateBps}
        usdcAmount={config.usdcAmount}
        deployedAt={config.deployedAt}
        mintAddress={mintAddress}
        tokenDecimals={tokenDecimals}
        onConfigUpdated={fetchConfig}
      />
    );
  }

  // State B: Deploying
  if (deployStep !== 'idle' && deployStep !== 'error') {
    return <DeployProgress step={deployStep} poolAddress={poolAddress} />;
  }

  // State A: Deploy form (or error with retry)
  return (
    <DeployForm
      buybackCents={buybackCents}
      setBuybackCents={setBuybackCents}
      usdcAmount={usdcAmount}
      setUsdcAmount={setUsdcAmount}
      mintConfigured={mintConfigured}
      walletConnected={walletConnected}
      hasRpcUrl={hasRpcUrl}
      hasUsdcMint={hasUsdcMint}
      canDeploy={canDeploy}
      onDeploy={handleDeploy}
      errorMessage={errorMessage}
      canRetry={!!failedAtStep && failedAtStep !== 'creating_pool'}
      onRetry={handleRetry}
    />
  );
}

// ---------------------------------------------------------------------------
// Deploy Form (State A)
// ---------------------------------------------------------------------------

function DeployForm({
  buybackCents, setBuybackCents, usdcAmount, setUsdcAmount,
  mintConfigured, walletConnected, hasRpcUrl, hasUsdcMint,
  canDeploy, onDeploy, errorMessage, canRetry, onRetry,
}: {
  buybackCents: number; setBuybackCents: (v: number) => void;
  usdcAmount: number; setUsdcAmount: (v: number) => void;
  mintConfigured: boolean; walletConnected: boolean;
  hasRpcUrl: boolean; hasUsdcMint: boolean;
  canDeploy: boolean; onDeploy: () => void;
  errorMessage: string | null;
  canRetry?: boolean; onRetry?: () => void;
}) {
  const profit = ((100 - buybackCents) / 100).toFixed(2);

  return (
    <div>
      <h3 className="cedros-admin__section-title" style={{ marginBottom: '0.5rem' }}>
        Deploy Buyback Liquidity Pool
      </h3>
      <p style={{ opacity: 0.7, marginBottom: '1rem', fontSize: 14 }}>
        Create a Meteora DLMM pool to buy back gift card tokens at a discount.
        You earn the spread when tokens are resold at face value.
      </p>

      <div className="cedros-admin__form-row">
        <div className="cedros-admin__field">
          <label className="cedros-admin__field-label">Buyback rate (cents per $1.00)</label>
          <input
            type="number"
            className="cedros-admin__input"
            value={buybackCents}
            onChange={e => setBuybackCents(Math.max(1, Math.min(99, parseInt(e.target.value) || 80)))}
            min="1"
            max="99"
          />
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
            You earn ${profit} profit per gift card redeemed
          </div>
        </div>
        <div className="cedros-admin__field">
          <label className="cedros-admin__field-label">USDC amount</label>
          <input
            type="number"
            className="cedros-admin__input"
            value={usdcAmount}
            onChange={e => setUsdcAmount(Math.max(1, parseFloat(e.target.value) || 250))}
            min="1"
            step="1"
          />
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
            Minimum recommended: $250
          </div>
        </div>
      </div>

      <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Prerequisite label="Token-22 mint initialized" met={mintConfigured} />
        <Prerequisite label="Wallet connected" met={walletConnected} />
        <Prerequisite label="RPC URL configured" met={hasRpcUrl} />
        <Prerequisite label="USDC mint configured" met={hasUsdcMint} />
      </div>

      {errorMessage && (
        <div style={{
          padding: '0.5rem 0.75rem',
          marginBottom: '0.75rem',
          borderRadius: 6,
          background: 'rgba(239,68,68,0.1)',
          color: '#dc2626',
          fontSize: 13,
        }}>
          {errorMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {canRetry ? (
          <button
            className="cedros-admin__button cedros-admin__button--primary"
            onClick={onRetry}
          >
            Retry (Resume from Failed Step)
          </button>
        ) : (
          <button
            className="cedros-admin__button cedros-admin__button--primary"
            onClick={onDeploy}
            disabled={!canDeploy}
          >
            Deploy Liquidity Pool
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deploy Progress (State B)
// ---------------------------------------------------------------------------

const DEPLOY_STEPS = [
  { key: 'creating_pool', label: 'Creating DLMM pool...' },
  { key: 'adding_liquidity', label: 'Depositing USDC liquidity...' },
  { key: 'saving_config', label: 'Saving configuration...' },
  { key: 'done', label: 'Complete' },
] as const;

function DeployProgress({ step, poolAddress }: { step: DeployStep; poolAddress: string | null }) {
  return (
    <div>
      <h3 className="cedros-admin__section-title" style={{ marginBottom: '1rem' }}>Deploying Pool...</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DEPLOY_STEPS.map((s, i) => {
          const stepIdx = DEPLOY_STEPS.findIndex(ds => ds.key === step);
          const thisIdx = i;
          const done = thisIdx < stepIdx || step === 'done';
          const active = thisIdx === stepIdx && step !== 'done';
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <span style={{ width: 20, textAlign: 'center', fontWeight: 600 }}>
                {done ? '\u2713' : active ? '\u25B6' : '\u25CB'}
              </span>
              <span style={{ opacity: done || active ? 1 : 0.4 }}>{s.label}</span>
            </div>
          );
        })}
      </div>
      {poolAddress && (
        <div style={{ marginTop: '1rem', fontSize: 13, opacity: 0.7 }}>
          Pool: <code style={{ fontSize: 12 }}>{poolAddress}</code>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility sub-components
// ---------------------------------------------------------------------------

function Prerequisite({ label, met }: { label: string; met: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ color: met ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
        {met ? '\u2713' : '\u2717'}
      </span>
      <span style={{ opacity: met ? 0.8 : 0.5 }}>{label}</span>
    </div>
  );
}

// Phantom/Solflare wallet interface on window.solana
interface WalletWindow extends Window {
  solana?: {
    publicKey?: { toBase58(): string };
    signTransaction?: (tx: unknown) => Promise<{ serialize(): Buffer }>;
  };
}
