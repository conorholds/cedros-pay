/**
 * Asset Classes Tab
 *
 * Manages tokenized asset class collections — securities, commodities,
 * property, and collectibles. Each asset class is a Collection with
 * a tokenizationConfig that defines minting and redemption rules.
 */

import { useState, useEffect, useCallback } from 'react';
import { RedemptionFormBuilder } from './RedemptionFormBuilder';
import type { RedemptionConfig } from './RedemptionFormBuilder';

interface AssetClassCollection {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  tokenizationConfig: {
    assetClass: string;
    mintAddress?: string;
    tokenSymbol?: string;
    tokenDecimals: number;
    transferFeeBps: number;
    maxTransferFee: number;
    treasuryAddress?: string;
    liquidityPoolAddress?: string;
    custodyProofUrl?: string;
    regulatoryNotice?: string;
    allowedJurisdictions: string[];
    redemptionConfig?: RedemptionConfig | null;
  };
}

interface AssetClassesTabProps {
  serverUrl: string;
  apiKey?: string;
  authManager?: { isAuthenticated: () => boolean; fetchWithAuth: <T>(path: string, opts?: RequestInit) => Promise<T> };
  /** Called when the user clicks "Deploy Pool" — parent should switch to the Liquidity tab */
  onNavigateToLiquidity?: () => void;
}

const ASSET_CLASS_OPTIONS = [
  { value: 'securities', label: 'Securities (fungible)' },
  { value: 'commodities', label: 'Commodities (fungible)' },
  { value: 'property', label: 'Property (non-fungible)' },
  { value: 'collectibles', label: 'Collectibles (non-fungible)' },
];

const isFungible = (ac: string) => ac === 'securities' || ac === 'commodities';

// ---------------------------------------------------------------------------
// CollectionCard
// ---------------------------------------------------------------------------

interface CollectionCardProps {
  c: AssetClassCollection;
  onDeployPool?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function CollectionCard({ c, onDeployPool, onEdit, onDelete }: CollectionCardProps) {
  const cfg = c.tokenizationConfig;
  const fungible = isFungible(cfg.assetClass);

  return (
    <div style={{ padding: '0.75rem 1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, background: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{c.name}</strong>
          <span style={{ marginLeft: 8, fontSize: '0.8rem', padding: '2px 8px', borderRadius: 10, background: fungible ? '#dbeafe' : '#fef3c7', color: fungible ? '#1d4ed8' : '#92400e' }}>
            {cfg.assetClass}
          </span>
          {cfg.tokenSymbol && (
            <span style={{ marginLeft: 6, fontSize: '0.8rem', color: 'rgba(0,0,0,0.5)' }}>{cfg.tokenSymbol}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
          {/* Mint status */}
          {cfg.mintAddress
            ? <span style={{ color: '#16a34a' }}>Mint initialized</span>
            : <span style={{ color: 'rgba(0,0,0,0.4)' }}>No mint</span>
          }
          {/* Liquidity pool status — fungible only */}
          {fungible && cfg.mintAddress && (
            cfg.liquidityPoolAddress
              ? (
                <span style={{ padding: '2px 8px', borderRadius: 10, background: '#dcfce7', color: '#15803d', fontSize: '0.75rem' }}>
                  Pool Active · {cfg.liquidityPoolAddress.slice(0, 4)}...{cfg.liquidityPoolAddress.slice(-4)}
                </span>
              )
              : (
                <button
                  type="button"
                  onClick={onDeployPool}
                  style={{ padding: 0, border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                >
                  Deploy Pool
                </button>
              )
          )}
        </div>
      </div>

      {c.description && (
        <div style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>{c.description}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'rgba(0,0,0,0.4)' }}>
          <span>Fee: {cfg.transferFeeBps} bps</span>
          {cfg.treasuryAddress && <span>Treasury: {cfg.treasuryAddress.slice(0, 8)}...</span>}
          {cfg.allowedJurisdictions?.length > 0 && (
            <span style={{ padding: '1px 7px', borderRadius: 10, background: '#f3f4f6', color: 'rgba(0,0,0,0.55)' }}>
              {cfg.allowedJurisdictions.length} jurisdiction{cfg.allowedJurisdictions.length !== 1 ? 's' : ''}: {cfg.allowedJurisdictions.join(', ')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onEdit && (
            <button type="button" onClick={onEdit} style={{ padding: '2px 10px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#2563eb' }}>
              Edit
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} style={{ padding: '2px 10px', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 4, background: 'white', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626' }}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssetClassesTab
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  name: '',
  description: '',
  assetClass: 'securities',
  tokenSymbol: '',
  tokenDecimals: 2,
  transferFeeBps: 250,
  maxTransferFee: 500,
  treasuryAddress: '',
  regulatoryNotice: '',
  jurisdictions: '',
  redemptionConfig: null as RedemptionConfig | null,
};

export function AssetClassesTab({ serverUrl, apiKey, authManager, onNavigateToLiquidity }: AssetClassesTabProps) {
  const [collections, setCollections] = useState<AssetClassCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const fetchCollections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await adminFetch<{ collections: AssetClassCollection[] }>('/admin/collections');
      setCollections((data.collections || []).filter(c => c.tokenizationConfig));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load asset classes');
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const buildPayload = () => ({
    name: form.name.trim(),
    description: form.description || undefined,
    active: true,
    productIds: [],
    tokenizationConfig: {
      assetClass: form.assetClass,
      tokenSymbol: form.tokenSymbol || undefined,
      tokenDecimals: form.tokenDecimals,
      transferFeeBps: form.transferFeeBps,
      maxTransferFee: form.maxTransferFee,
      treasuryAddress: form.treasuryAddress || undefined,
      regulatoryNotice: form.regulatoryNotice || undefined,
      allowedJurisdictions: form.jurisdictions
        ? form.jurisdictions.split(',').map(j => j.trim().toUpperCase()).filter(Boolean)
        : [],
      redemptionConfig: form.redemptionConfig || undefined,
    },
  });

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      if (editingId) {
        await adminFetch(`/admin/collections/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          body: JSON.stringify(buildPayload()),
        });
      } else {
        await adminFetch('/admin/collections', {
          method: 'POST',
          body: JSON.stringify(buildPayload()),
        });
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditingId(null);
      await fetchCollections();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${editingId ? 'update' : 'create'} asset class`);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (c: AssetClassCollection) => {
    const cfg = c.tokenizationConfig;
    setForm({
      name: c.name,
      description: c.description ?? '',
      assetClass: cfg.assetClass,
      tokenSymbol: cfg.tokenSymbol ?? '',
      tokenDecimals: cfg.tokenDecimals,
      transferFeeBps: cfg.transferFeeBps,
      maxTransferFee: cfg.maxTransferFee,
      treasuryAddress: cfg.treasuryAddress ?? '',
      regulatoryNotice: cfg.regulatoryNotice ?? '',
      jurisdictions: cfg.allowedJurisdictions.join(', '),
      redemptionConfig: cfg.redemptionConfig ?? null,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (c: AssetClassCollection) => {
    if (!window.confirm(`Delete asset class "${c.name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await adminFetch(`/admin/collections/${encodeURIComponent(c.id)}`, { method: 'DELETE' });
      await fetchCollections();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete asset class');
    }
  };

  if (isLoading) {
    return <div style={{ padding: '1rem 0', color: 'rgba(0,0,0,0.5)' }}>Loading asset classes...</div>;
  }

  return (
    <div>
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#dc2626', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0 }}>Asset Classes ({collections.length})</h4>
        <button
          type="button"
          onClick={() => { setShowForm(!showForm); if (showForm) { setEditingId(null); setForm(EMPTY_FORM); } }}
          style={{ padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)', background: showForm ? 'rgba(0,0,0,0.05)' : 'white', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          {showForm ? 'Cancel' : '+ New Asset Class'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, marginBottom: '1rem', background: 'rgba(0,0,0,0.02)' }}>
          {/* Row 1: Name + Asset Class */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Gold Tokens"
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Asset Class *</label>
              <select
                value={form.assetClass}
                onChange={(e) => setForm(f => ({ ...f, assetClass: e.target.value }))}
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem' }}
              >
                {ASSET_CLASS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this asset class"
              style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem' }}
            />
          </div>

          {/* Row 2: Symbol + Fee + Treasury */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Token Symbol</label>
              <input
                type="text"
                value={form.tokenSymbol}
                onChange={(e) => setForm(f => ({ ...f, tokenSymbol: e.target.value }))}
                placeholder="e.g., GOLD"
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Transfer Fee (bps)</label>
              <input
                type="number"
                value={form.transferFeeBps}
                onChange={(e) => setForm(f => ({ ...f, transferFeeBps: Number(e.target.value) }))}
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Treasury Address</label>
              <input
                type="text"
                value={form.treasuryAddress}
                onChange={(e) => setForm(f => ({ ...f, treasuryAddress: e.target.value }))}
                placeholder="Solana address"
                style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Jurisdictions */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Allowed Jurisdictions</label>
            <input
              type="text"
              value={form.jurisdictions}
              onChange={(e) => setForm(f => ({ ...f, jurisdictions: e.target.value }))}
              placeholder="US, CA, GB (comma-separated, leave empty for all)"
              style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem' }}
            />
          </div>

          {/* Regulatory Notice */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>Regulatory Notice</label>
            <textarea
              value={form.regulatoryNotice}
              onChange={(e) => setForm(f => ({ ...f, regulatoryNotice: e.target.value }))}
              placeholder="Shown to buyers before purchase"
              rows={2}
              style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>

          {/* Redemption Form */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Redemption Form</label>
            <RedemptionFormBuilder
              value={form.redemptionConfig}
              onChange={(config) => setForm(f => ({ ...f, redemptionConfig: config }))}
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !form.name.trim()}
            style={{ padding: '0.5rem 1.5rem', borderRadius: 6, border: 'none', background: '#2563eb', color: 'white', cursor: isSaving ? 'wait' : 'pointer', fontSize: '0.9rem', opacity: isSaving ? 0.6 : 1 }}
          >
            {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Asset Class'}
          </button>
        </div>
      )}

      {collections.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(0,0,0,0.4)', fontSize: '0.9rem' }}>
          No asset classes configured. Create one to start tokenizing off-chain assets.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {collections.map(c => (
            <CollectionCard
              key={c.id}
              c={c}
              onDeployPool={onNavigateToLiquidity}
              onEdit={() => startEditing(c)}
              onDelete={() => handleDelete(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
