/**
 * Token Mint Selector
 *
 * Provides a selector for known stablecoins (USDC, USDT, etc.)
 * with a custom token option for arbitrary SPL token mints.
 */

import { useState } from 'react';
import { STABLECOIN_METADATA } from '../../utils/tokenMintValidator';

/** Base58 character set (no 0, O, I, l) */
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Validate a Solana public key address using base58 format check */
export function validateSolanaAddress(address: string): { valid: boolean; error?: string } {
  if (!address || address.trim() === '') {
    return { valid: true }; // Empty is allowed (optional field)
  }
  if (BASE58_RE.test(address.trim())) {
    return { valid: true };
  }
  return { valid: false, error: 'Invalid Solana address' };
}

export interface TokenMintSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  decimals?: number;
  onDecimalsChange?: (decimals: number) => void;
  disabled?: boolean;
  description?: string;
  customSymbol?: string;
  customIcon?: string;
  onCustomSymbolChange?: (value: string) => void;
  onCustomIconChange?: (value: string) => void;
}

/** Token mint selector with known stablecoins */
export function TokenMintSelector({
  label,
  value,
  onChange,
  decimals,
  onDecimalsChange,
  disabled = false,
  description,
  customSymbol = '',
  customIcon = '',
  onCustomSymbolChange,
  onCustomIconChange,
}: TokenMintSelectorProps) {
  // Track if custom mode is explicitly selected
  const [customModeActive, setCustomModeActive] = useState(false);

  // Build options from stablecoin metadata
  const stablecoinEntries = Object.entries(STABLECOIN_METADATA);
  const knownMeta = STABLECOIN_METADATA[value];
  const isKnownMint = !!knownMeta;
  const isCustomValue = !!value && !isKnownMint;

  // Show custom fields if explicitly in custom mode OR if value is a non-preset mint
  const showCustomFields = customModeActive || isCustomValue;

  const handleSelectChange = (newValue: string) => {
    if (newValue === 'custom') {
      setCustomModeActive(true);
      // Clear value when switching to custom from a preset
      if (isKnownMint) {
        onChange('');
      }
    } else {
      setCustomModeActive(false);
      onChange(newValue);
      // Auto-set decimals for known stablecoins
      const meta = STABLECOIN_METADATA[newValue];
      if (meta && onDecimalsChange) {
        onDecimalsChange(meta.decimals);
      }
      // Clear custom fields when selecting a preset
      if (onCustomSymbolChange) onCustomSymbolChange('');
      if (onCustomIconChange) onCustomIconChange('');
    }
  };

  return (
    <div className="cedros-admin__field">
      <label className="cedros-admin__field-label">{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Token selector buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {stablecoinEntries.map(([mint, meta]) => (
            <button
              key={mint}
              type="button"
              onClick={() => handleSelectChange(mint)}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                border: value === mint
                  ? '2px solid var(--cedros-admin-primary, #171717)'
                  : '1px solid var(--cedros-admin-border, #d4d4d4)',
                borderRadius: '0.5rem',
                background: value === mint
                  ? 'var(--cedros-admin-primary-bg, #f5f5f5)'
                  : 'var(--cedros-admin-bg, #fff)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                fontWeight: value === mint ? 600 : 400,
              }}
            >
              <img
                src={meta.icon}
                alt={meta.symbol}
                style={{ width: 20, height: 20, borderRadius: '50%' }}
                onError={(e) => {
                  // Fallback to text if image fails
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span>{meta.symbol}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleSelectChange('custom')}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              border: showCustomFields
                ? '2px solid var(--cedros-admin-primary, #171717)'
                : '1px solid var(--cedros-admin-border, #d4d4d4)',
              borderRadius: '0.5rem',
              background: showCustomFields
                ? 'var(--cedros-admin-primary-bg, #f5f5f5)'
                : 'var(--cedros-admin-bg, #fff)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              fontWeight: showCustomFields ? 600 : 400,
            }}
          >
            <span style={{ fontSize: '1rem' }}>+</span>
            <span>Custom</span>
          </button>
        </div>

        {/* Custom token fields */}
        {showCustomFields && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '1rem',
            background: 'var(--cedros-admin-bg-muted, #f9fafb)',
            borderRadius: '0.5rem',
            border: '1px solid var(--cedros-admin-border, #e5e7eb)',
          }}>
            {/* Token mint address */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 500,
                marginBottom: '0.25rem',
                color: 'var(--cedros-admin-text-muted, #64748b)',
              }}>
                Token Mint Address
              </label>
              {(() => {
                const mintValidation = validateSolanaAddress(value);
                return (
                  <>
                    <input
                      type="text"
                      className={`cedros-admin__input ${!mintValidation.valid ? 'cedros-admin__input--error' : ''}`}
                      value={value}
                      onChange={e => onChange(e.target.value)}
                      placeholder="e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                      disabled={disabled}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        borderColor: !mintValidation.valid ? 'var(--cedros-admin-error, #dc2626)' : undefined,
                      }}
                    />
                    {!mintValidation.valid && (
                      <span style={{ color: 'var(--cedros-admin-error, #dc2626)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                        {mintValidation.error}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Token symbol */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 500,
                marginBottom: '0.25rem',
                color: 'var(--cedros-admin-text-muted, #64748b)',
              }}>
                Token Symbol
              </label>
              <input
                type="text"
                className="cedros-admin__input"
                value={customSymbol}
                onChange={e => onCustomSymbolChange?.(e.target.value)}
                placeholder="e.g., MYTOKEN"
                disabled={disabled}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            {/* Token icon */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 500,
                marginBottom: '0.25rem',
                color: 'var(--cedros-admin-text-muted, #64748b)',
              }}>
                Token Icon URL
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="cedros-admin__input"
                  value={customIcon}
                  onChange={e => onCustomIconChange?.(e.target.value)}
                  placeholder="https://example.com/token-logo.png"
                  disabled={disabled}
                  style={{ flex: 1 }}
                />
                {customIcon && (
                  <img
                    src={customIcon}
                    alt="Token icon preview"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '1px solid var(--cedros-admin-border, #e5e7eb)',
                      objectFit: 'cover',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--cedros-admin-text-muted, #94a3b8)',
                marginTop: '0.25rem',
              }}>
                Shown to customers during checkout
              </div>
            </div>

            {/* Token decimals */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 500,
                marginBottom: '0.25rem',
                color: 'var(--cedros-admin-text-muted, #64748b)',
              }}>
                Token Decimals
              </label>
              <input
                type="number"
                className="cedros-admin__input"
                value={decimals ?? 6}
                onChange={e => onDecimalsChange?.(parseInt(e.target.value, 10) || 0)}
                min={0}
                max={18}
                disabled={disabled}
                style={{ width: '100px' }}
              />
              <div style={{
                fontSize: '0.7rem',
                color: 'var(--cedros-admin-text-muted, #94a3b8)',
                marginTop: '0.25rem',
              }}>
                Most SPL tokens use 6 decimals (like USDC)
              </div>
            </div>
          </div>
        )}

        {/* Show full address for known mint */}
        {value && isKnownMint && (
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--cedros-admin-text-muted, #64748b)',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}>
            {value}
          </div>
        )}

        {/* Description */}
        {description && (
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--cedros-admin-text-muted, #64748b)',
            marginTop: '0.25rem',
          }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
