/**
 * Pool Management View — Post-deploy management controls
 *
 * Shows pool status + management actions: adjust buyback rate, add more liquidity.
 * Extracted from LiquidityPoolTab to keep files under size budget.
 */

import { useState } from 'react';
import { ConfigApiClient } from './configApi';
import { MeteoraPoolManager } from '../../managers/MeteoraPoolManager';
import type { IAdminAuthManager } from './AdminAuthManager';

const USDC_DECIMALS = 6;
const DEFAULT_BIN_STEP = 1;
const SOLSCAN_URL = 'https://solscan.io/account';
const METEORA_APP_URL = 'https://app.meteora.ag/dlmm';

export interface PoolManagementViewProps {
  serverUrl: string;
  authManager?: IAdminAuthManager;
  poolAddress: string;
  buybackRateBps: number | null;
  usdcAmount: number | null;
  deployedAt: string | null;
  mintAddress?: string;
  tokenDecimals?: number;
  onConfigUpdated: () => void;
}

// Phantom/Solflare wallet interface on window.solana
interface WalletWindow extends Window {
  solana?: {
    publicKey?: { toBase58(): string };
    signTransaction?: (tx: unknown) => Promise<{ serialize(): Buffer }>;
  };
}

type ManageAction = 'none' | 'adjust_rate' | 'add_liquidity';

export function PoolManagementView({
  serverUrl,
  authManager,
  poolAddress,
  buybackRateBps,
  usdcAmount,
  deployedAt,
  mintAddress,
  tokenDecimals = 2,
  onConfigUpdated,
}: PoolManagementViewProps) {
  const [action, setAction] = useState<ManageAction>('none');
  const [newBuybackCents, setNewBuybackCents] = useState(
    buybackRateBps != null ? buybackRateBps / 100 : 80
  );
  const [addUsdcAmount, setAddUsdcAmount] = useState(100);
  const [saving, setSaving] = useState(false);
  const [txInProgress, setTxInProgress] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buybackDisplay = buybackRateBps != null
    ? `$${(buybackRateBps / 10000).toFixed(2)}`
    : 'Unknown';
  const usdcDisplay = usdcAmount != null
    ? `$${(usdcAmount / 10 ** USDC_DECIMALS).toFixed(2)}`
    : null;
  const deployedDisplay = deployedAt
    ? new Date(deployedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const shortAddr = poolAddress.length > 16
    ? `${poolAddress.slice(0, 8)}...${poolAddress.slice(-8)}`
    : poolAddress;

  const handleAdjustRate = async () => {
    setSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const api = new ConfigApiClient(serverUrl, undefined, authManager);
      const rateBps = Math.round(newBuybackCents * 100);
      await api.patchConfig('gift_cards', {
        buyback_rate_bps: rateBps,
      }, `Buyback rate adjusted to ${newBuybackCents} cents`);
      setStatusMessage('Buyback rate updated');
      setAction('none');
      onConfigUpdated();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update rate');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!mintAddress) return;
    setTxInProgress(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const { Connection, PublicKey, Keypair } = await import('@solana/web3.js');
      const api = new ConfigApiClient(serverUrl, undefined, authManager);
      const x402Resp = await api.getConfig('x402');
      const rpcUrl = (x402Resp.config?.rpc_url as string) || '';
      const usdcMint = (x402Resp.config?.token_mint as string) || '';
      if (!rpcUrl || !usdcMint) throw new Error('RPC URL or USDC mint not configured');

      const connection = new Connection(rpcUrl, 'confirmed');
      const wallet = (window as unknown as WalletWindow).solana;
      if (!wallet?.publicKey || !wallet.signTransaction) {
        throw new Error('Wallet not connected');
      }

      const manager = new MeteoraPoolManager();
      const funder = new PublicKey(wallet.publicKey.toBase58());
      const currentRate = newBuybackCents / 100;
      const buybackBinId = await manager.computeBinId(currentRate, tokenDecimals, USDC_DECIMALS, DEFAULT_BIN_STEP);
      const poolPk = new PublicKey(poolAddress);
      const usdcLamports = Math.round(addUsdcAmount * 10 ** USDC_DECIMALS);

      const { transaction: liquidityTx, positionKeypair } = await manager.addBuybackLiquidity(
        connection, funder, poolPk, usdcLamports, buybackBinId,
      );
      const posKp = Keypair.fromSecretKey(positionKeypair.secretKey);
      liquidityTx.partialSign(posKp);
      const signedTx = await wallet.signTransaction(liquidityTx);
      const sig = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(sig, 'confirmed');

      // Update stored total
      const prevAmount = usdcAmount ?? 0;
      await api.patchConfig('gift_cards', {
        liquidity_usdc_amount: prevAmount + usdcLamports,
      }, `Added ${addUsdcAmount} USDC liquidity`);

      setStatusMessage(`Added $${addUsdcAmount} USDC liquidity`);
      setAction('none');
      onConfigUpdated();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add liquidity');
    } finally {
      setTxInProgress(false);
    }
  };

  return (
    <div>
      <h3 className="cedros-admin__section-title" style={{ marginBottom: '1rem' }}>
        Liquidity Pool Active
      </h3>

      {/* Status grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: 600 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>Pool Address</div>
        <div style={{ fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {shortAddr}
          <span style={{ marginLeft: 8, display: 'inline-flex', gap: 6 }}>
            <CopyButton text={poolAddress} />
            <ExternalLink href={`${SOLSCAN_URL}/${poolAddress}`} label="Solscan" />
            <ExternalLink href={`${METEORA_APP_URL}/${poolAddress}`} label="Meteora" />
          </span>
        </div>
        <div style={{ fontWeight: 500, fontSize: 13 }}>Buyback Rate</div>
        <div style={{ fontSize: 13 }}>{buybackDisplay} per $1.00</div>
        {usdcDisplay && (
          <>
            <div style={{ fontWeight: 500, fontSize: 13 }}>USDC Deposited</div>
            <div style={{ fontSize: 13 }}>{usdcDisplay}</div>
          </>
        )}
        {deployedDisplay && (
          <>
            <div style={{ fontWeight: 500, fontSize: 13 }}>Deployed</div>
            <div style={{ fontSize: 13 }}>{deployedDisplay}</div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
        <button
          className="cedros-admin__button"
          onClick={() => setAction(action === 'adjust_rate' ? 'none' : 'adjust_rate')}
          disabled={txInProgress || saving}
        >
          Adjust Rate
        </button>
        <button
          className="cedros-admin__button"
          onClick={() => setAction(action === 'add_liquidity' ? 'none' : 'add_liquidity')}
          disabled={txInProgress || saving || !mintAddress}
        >
          Add Liquidity
        </button>
      </div>

      {/* Adjust rate form */}
      {action === 'adjust_rate' && (
        <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 8, border: '1px solid var(--cedros-admin-border, #e5e7eb)' }}>
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">New buyback rate (cents per $1.00)</label>
            <input
              type="number"
              className="cedros-admin__input"
              value={newBuybackCents}
              onChange={e => setNewBuybackCents(Math.max(1, Math.min(99, parseInt(e.target.value) || 80)))}
              min="1"
              max="99"
              style={{ maxWidth: 200 }}
            />
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
              Profit per redemption: ${((100 - newBuybackCents) / 100).toFixed(2)}
            </div>
          </div>
          <button
            className="cedros-admin__button cedros-admin__button--primary"
            onClick={handleAdjustRate}
            disabled={saving}
            style={{ marginTop: '0.75rem' }}
          >
            {saving ? 'Saving...' : 'Save Rate'}
          </button>
        </div>
      )}

      {/* Add liquidity form */}
      {action === 'add_liquidity' && (
        <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 8, border: '1px solid var(--cedros-admin-border, #e5e7eb)' }}>
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">USDC amount to add</label>
            <input
              type="number"
              className="cedros-admin__input"
              value={addUsdcAmount}
              onChange={e => setAddUsdcAmount(Math.max(1, parseFloat(e.target.value) || 100))}
              min="1"
              step="1"
              style={{ maxWidth: 200 }}
            />
          </div>
          <button
            className="cedros-admin__button cedros-admin__button--primary"
            onClick={handleAddLiquidity}
            disabled={txInProgress}
            style={{ marginTop: '0.75rem' }}
          >
            {txInProgress ? 'Adding liquidity...' : `Add $${addUsdcAmount} USDC`}
          </button>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
            Requires a connected wallet and USDC balance.
          </div>
        </div>
      )}

      {/* Status / error messages */}
      {statusMessage && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(22,163,74,0.1)', color: '#16a34a', fontSize: 13 }}>
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#dc2626', fontSize: 13 }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.7, padding: 0 }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ fontSize: 12, opacity: 0.7 }}
    >
      {label}
    </a>
  );
}
