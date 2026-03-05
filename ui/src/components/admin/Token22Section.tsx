/**
 * Token-22 & Gift Cards Admin Section
 *
 * Manages Token-22 mint initialization, status, fee harvesting,
 * and displays gift card redemption history.
 */

import { useState, useEffect, useCallback } from 'react';
import { Icons } from './icons';
import { ErrorBanner } from './ErrorBanner';
import { AssetClassesTab } from './AssetClassesTab';
import { AssetRedemptionManager } from './AssetRedemptionManager';
import { GiftCardComplianceTab } from './GiftCardComplianceTab';
import { LiquidityPoolTab } from './LiquidityPoolTab';
import type { SectionProps } from './types';

interface MintStatus {
  configured: boolean;
  mintAddress?: string;
  mintAuthority?: string;
  transferFeeBps?: number;
  maxTransferFee?: number;
  treasuryAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  createdAt?: string;
}

interface GiftCardRedemption {
  id: string;
  orderId: string;
  productId: string;
  buyerUserId: string;
  recipientUserId: string;
  faceValueCents: number;
  currency: string;
  creditsIssued: number;
  tokenMinted: boolean;
  tokenMintSignature?: string;
  createdAt: string;
}

export function Token22Section({ serverUrl, apiKey, authManager }: SectionProps) {
  const [mintStatus, setMintStatus] = useState<MintStatus | null>(null);
  const [redemptions, setRedemptions] = useState<GiftCardRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mint' | 'redemptions' | 'compliance' | 'liquidity' | 'asset-classes' | 'asset-redemptions'>('mint');

  // Initialize mint form
  const [initForm, setInitForm] = useState({
    treasuryAddress: '',
    tokenSymbol: 'storeUSD',
    tokenDecimals: 2,
    transferFeeBps: 250,
    maxTransferFee: 500,
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const adminFetch = useCallback(async <T,>(path: string, opts?: RequestInit): Promise<T> => {
    if (authManager?.isAuthenticated()) {
      return authManager.fetchWithAuth<T>(path, opts);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;
    const res = await fetch(`${serverUrl}${path}`, { ...opts, headers: { ...headers, ...opts?.headers } });
    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(text);
    }
    return res.json();
  }, [serverUrl, apiKey, authManager]);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const status = await adminFetch<MintStatus>('/admin/token22/status');
      setMintStatus(status);
    } catch {
      setError('Failed to load Token-22 status');
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  const fetchRedemptions = useCallback(async () => {
    try {
      const data = await adminFetch<{ redemptions: GiftCardRedemption[] }>('/admin/gift-card-redemptions?limit=50');
      setRedemptions(data.redemptions || []);
    } catch {
      // Endpoint may not exist yet — fail silently
      setRedemptions([]);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchStatus();
    fetchRedemptions();
  }, [fetchStatus, fetchRedemptions]);

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initForm.treasuryAddress) return;
    setIsInitializing(true);
    setActionMessage(null);
    try {
      const result = await adminFetch<{ mintAddress: string; signature: string }>('/admin/token22/initialize', {
        method: 'POST',
        body: JSON.stringify({
          treasuryAddress: initForm.treasuryAddress,
          tokenSymbol: initForm.tokenSymbol,
          tokenDecimals: initForm.tokenDecimals,
          transferFeeBps: initForm.transferFeeBps,
          maxTransferFee: initForm.maxTransferFee,
        }),
      });
      setActionMessage(`Mint created: ${result.mintAddress}`);
      fetchStatus();
    } catch (err) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : 'Failed to initialize'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleHarvestFees = async () => {
    setIsHarvesting(true);
    setActionMessage(null);
    try {
      const result = await adminFetch<{ message: string }>('/admin/token22/harvest-fees', {
        method: 'POST',
      });
      setActionMessage(result.message);
    } catch (err) {
      setActionMessage(`Error: ${err instanceof Error ? err.message : 'Failed to harvest'}`);
    } finally {
      setIsHarvesting(false);
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <div className="cedros-admin__page">
      <ErrorBanner message={error} onRetry={fetchStatus} />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
        {(['mint', 'redemptions', 'compliance', 'liquidity', 'asset-classes', 'asset-redemptions'] as const).map((tab) => {
          const labels = { mint: 'Token-22 Mint', redemptions: 'Gift Card Redemptions', compliance: 'Compliance', liquidity: 'Liquidity', 'asset-classes': 'Asset Classes', 'asset-redemptions': 'Asset Redemptions' };
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid currentColor' : '2px solid transparent',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                opacity: activeTab === tab ? 1 : 0.6,
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="cedros-admin__loading">{Icons.loading} Loading...</div>
      ) : activeTab === 'mint' ? (
        <MintTab
          mintStatus={mintStatus}
          initForm={initForm}
          setInitForm={setInitForm}
          isInitializing={isInitializing}
          isHarvesting={isHarvesting}
          actionMessage={actionMessage}
          onInitialize={handleInitialize}
          onHarvestFees={handleHarvestFees}
          formatDate={formatDate}
        />
      ) : activeTab === 'redemptions' ? (
        <RedemptionsTab redemptions={redemptions} formatDate={formatDate} />
      ) : activeTab === 'compliance' ? (
        <GiftCardComplianceTab serverUrl={serverUrl} apiKey={apiKey} authManager={authManager} />
      ) : activeTab === 'liquidity' ? (
        <LiquidityPoolTab
          serverUrl={serverUrl}
          authManager={authManager}
          mintConfigured={!!mintStatus?.configured}
          mintAddress={mintStatus?.mintAddress}
          tokenDecimals={mintStatus?.tokenDecimals}
        />
      ) : activeTab === 'asset-classes' ? (
        <AssetClassesTab serverUrl={serverUrl} apiKey={apiKey} authManager={authManager} onNavigateToLiquidity={() => setActiveTab('liquidity')} />
      ) : (
        <AssetRedemptionManager serverUrl={serverUrl} apiKey={apiKey} authManager={authManager} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mint Management Tab
// ---------------------------------------------------------------------------

function MintTab({
  mintStatus,
  initForm,
  setInitForm,
  isInitializing,
  isHarvesting,
  actionMessage,
  onInitialize,
  onHarvestFees,
  formatDate,
}: {
  mintStatus: MintStatus | null;
  initForm: { treasuryAddress: string; tokenSymbol: string; tokenDecimals: number; transferFeeBps: number; maxTransferFee: number };
  setInitForm: React.Dispatch<React.SetStateAction<typeof initForm>>;
  isInitializing: boolean;
  isHarvesting: boolean;
  actionMessage: string | null;
  onInitialize: (e: React.FormEvent) => Promise<void>;
  onHarvestFees: () => Promise<void>;
  formatDate: (iso: string) => string;
}) {
  if (mintStatus?.configured) {
    return (
      <div>
        <h3 className="cedros-admin__section-title" style={{ marginBottom: '1rem' }}>Token-22 Mint Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: 600 }}>
          <StatusRow label="Mint Address" value={mintStatus.mintAddress} mono />
          <StatusRow label="Token Symbol" value={mintStatus.tokenSymbol} />
          <StatusRow label="Decimals" value={String(mintStatus.tokenDecimals)} />
          <StatusRow label="Transfer Fee" value={`${mintStatus.transferFeeBps} bps (${((mintStatus.transferFeeBps ?? 0) / 100).toFixed(2)}%)`} />
          <StatusRow label="Max Transfer Fee" value={String(mintStatus.maxTransferFee)} />
          <StatusRow label="Treasury" value={mintStatus.treasuryAddress} mono />
          <StatusRow label="Authority" value={mintStatus.mintAuthority} mono />
          <StatusRow label="Created" value={mintStatus.createdAt ? formatDate(mintStatus.createdAt) : '—'} />
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="cedros-admin__button cedros-admin__button--primary"
            onClick={onHarvestFees}
            disabled={isHarvesting}
          >
            {isHarvesting ? 'Harvesting...' : 'Harvest Transfer Fees'}
          </button>
          {actionMessage && (
            <span style={{ fontSize: 13, opacity: 0.8 }}>{actionMessage}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="cedros-admin__section-title" style={{ marginBottom: '0.5rem' }}>Initialize Token-22 Mint</h3>
      <p style={{ opacity: 0.7, marginBottom: '1rem', fontSize: 14 }}>
        Create a Token-22 mint with transfer fee extension for the secondary market. This is a one-time operation per tenant.
      </p>

      <form onSubmit={onInitialize}>
        <div className="cedros-admin__form-row">
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Treasury address (Solana)</label>
            <input
              type="text"
              className="cedros-admin__input"
              value={initForm.treasuryAddress}
              onChange={(e) => setInitForm(f => ({ ...f, treasuryAddress: e.target.value }))}
              placeholder="e.g., 7xKX..."
              required
            />
          </div>
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Token symbol</label>
            <input
              type="text"
              className="cedros-admin__input"
              value={initForm.tokenSymbol}
              onChange={(e) => setInitForm(f => ({ ...f, tokenSymbol: e.target.value }))}
              placeholder="storeUSD"
            />
          </div>
        </div>
        <div className="cedros-admin__form-row">
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Token decimals</label>
            <input
              type="number"
              className="cedros-admin__input"
              value={initForm.tokenDecimals}
              onChange={(e) => setInitForm(f => ({ ...f, tokenDecimals: parseInt(e.target.value) || 2 }))}
              min="0"
              max="9"
            />
          </div>
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Transfer fee (basis points)</label>
            <input
              type="number"
              className="cedros-admin__input"
              value={initForm.transferFeeBps}
              onChange={(e) => setInitForm(f => ({ ...f, transferFeeBps: parseInt(e.target.value) || 0 }))}
              min="0"
              max="10000"
            />
            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
              e.g., 250 = 2.5% fee on secondary market transfers
            </div>
          </div>
          <div className="cedros-admin__field">
            <label className="cedros-admin__field-label">Max transfer fee (atomic)</label>
            <input
              type="number"
              className="cedros-admin__input"
              value={initForm.maxTransferFee}
              onChange={(e) => setInitForm(f => ({ ...f, maxTransferFee: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>
        </div>

        <div className="cedros-admin__form-actions" style={{ marginTop: '1rem' }}>
          <button type="submit" className="cedros-admin__button cedros-admin__button--primary" disabled={isInitializing}>
            {isInitializing ? 'Creating Mint...' : 'Initialize Mint'}
          </button>
          {actionMessage && (
            <span style={{ marginLeft: '0.75rem', fontSize: 13, opacity: 0.8 }}>{actionMessage}</span>
          )}
        </div>
      </form>
    </div>
  );
}

function StatusRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <>
      <div style={{ fontWeight: 500, fontSize: 13 }}>{label}</div>
      <div style={{
        fontSize: 13,
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: mono ? 'break-all' : 'normal',
        opacity: value ? 1 : 0.5,
      }}>
        {value || '—'}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Gift Card Redemptions Tab
// ---------------------------------------------------------------------------

function RedemptionsTab({
  redemptions,
  formatDate,
}: {
  redemptions: GiftCardRedemption[];
  formatDate: (iso: string) => string;
}) {
  if (!redemptions.length) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
        No gift card redemptions yet.
      </div>
    );
  }

  return (
    <div className="cedros-admin__table-container">
      <table className="cedros-admin__table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Order</th>
            <th>Product</th>
            <th>Buyer</th>
            <th>Recipient</th>
            <th>Value</th>
            <th>Token Minted</th>
          </tr>
        </thead>
        <tbody>
          {redemptions.map((r) => (
            <tr key={r.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
              <td><code style={{ fontSize: 12 }}>{r.orderId.slice(0, 8)}...</code></td>
              <td><code style={{ fontSize: 12 }}>{r.productId}</code></td>
              <td><code style={{ fontSize: 12 }}>{r.buyerUserId.slice(0, 8)}...</code></td>
              <td><code style={{ fontSize: 12 }}>{r.recipientUserId.slice(0, 8)}...</code></td>
              <td>${(r.faceValueCents / 100).toFixed(2)} {r.currency.toUpperCase()}</td>
              <td>
                <span className={`cedros-admin__badge ${r.tokenMinted ? 'cedros-admin__badge--success' : 'cedros-admin__badge--muted'}`}>
                  {r.tokenMinted ? 'Yes' : 'No'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
