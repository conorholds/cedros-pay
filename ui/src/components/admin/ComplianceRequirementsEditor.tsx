/**
 * Compliance Requirements Editor — reusable form for configuring per-product
 * or per-collection compliance gates (sanctions, KYC, accredited investor, token gates).
 */

import { useState } from 'react';
import type { ComplianceRequirements, TokenGate } from './complianceTypes';

interface Props {
  value: ComplianceRequirements | null;
  onChange: (value: ComplianceRequirements | null) => void;
}

const DEFAULT_REQS: ComplianceRequirements = {
  requireSanctionsClear: true,
  requireKyc: false,
  requireAccreditedInvestor: false,
  tokenGates: [],
};

export function ComplianceRequirementsEditor({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(value !== null);
  const [newGateAddress, setNewGateAddress] = useState('');
  const [newGateType, setNewGateType] = useState<'fungible_token' | 'nft_collection'>('fungible_token');
  const [newGateMinAmount, setNewGateMinAmount] = useState(1);

  const reqs = value ?? DEFAULT_REQS;

  const toggleEnabled = () => {
    if (value) {
      onChange(null);
      setExpanded(false);
    } else {
      onChange({ ...DEFAULT_REQS });
      setExpanded(true);
    }
  };

  const update = (partial: Partial<ComplianceRequirements>) => {
    onChange({ ...reqs, ...partial });
  };

  const addTokenGate = () => {
    if (!newGateAddress.trim()) return;
    const gate: TokenGate = {
      address: newGateAddress.trim(),
      gateType: newGateType,
      minAmount: newGateMinAmount,
    };
    const gates = [...(reqs.tokenGates ?? []), gate];
    update({ tokenGates: gates });
    setNewGateAddress('');
    setNewGateMinAmount(1);
  };

  const removeTokenGate = (idx: number) => {
    const gates = (reqs.tokenGates ?? []).filter((_, i) => i !== idx);
    update({ tokenGates: gates.length > 0 ? gates : [] });
  };

  return (
    <div style={{ border: '1px solid var(--cedros-admin-border, #e0e0e0)', borderRadius: '4px', padding: '0.75rem', marginTop: '0.5rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
        <input type="checkbox" checked={value !== null} onChange={toggleEnabled} />
        Enable compliance gates
      </label>

      {value !== null && expanded && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={reqs.requireSanctionsClear}
              onChange={e => update({ requireSanctionsClear: e.target.checked })} />
            Require sanctions clearance
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={reqs.requireKyc}
              onChange={e => update({ requireKyc: e.target.checked })} />
            Require KYC verification
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={reqs.requireAccreditedInvestor}
              onChange={e => update({ requireAccreditedInvestor: e.target.checked })} />
            Require accredited investor status
          </label>

          {/* Token Gates */}
          <div style={{ marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Token Gates</span>

            {(reqs.tokenGates ?? []).length > 0 && (
              <div style={{ marginTop: '0.25rem' }}>
                {(reqs.tokenGates ?? []).map((gate, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.25rem 0' }}>
                    <code style={{ fontSize: '0.75rem' }}>{gate.address.slice(0, 8)}...</code>
                    <span className="cedros-admin__badge cedros-admin__badge--muted">
                      {gate.gateType === 'fungible_token' ? 'Fungible' : 'NFT'}
                    </span>
                    <span>min: {gate.minAmount}</span>
                    <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                      onClick={() => removeTokenGate(idx)} style={{ padding: '0 0.25rem' }}>
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <input type="text" className="cedros-admin__input" placeholder="Mint or collection address"
                value={newGateAddress} onChange={e => setNewGateAddress(e.target.value)}
                style={{ flex: 1, minWidth: '200px', fontSize: '0.8rem' }} />
              <select className="cedros-admin__input" value={newGateType}
                onChange={e => setNewGateType(e.target.value as 'fungible_token' | 'nft_collection')}
                style={{ width: 'auto', fontSize: '0.8rem' }}>
                <option value="fungible_token">Fungible</option>
                <option value="nft_collection">NFT</option>
              </select>
              <input type="number" className="cedros-admin__input" min={1} value={newGateMinAmount}
                onChange={e => setNewGateMinAmount(Number(e.target.value))}
                style={{ width: '80px', fontSize: '0.8rem' }} />
              <button type="button" className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--sm"
                onClick={addTokenGate} disabled={!newGateAddress.trim()}>
                Add Gate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
