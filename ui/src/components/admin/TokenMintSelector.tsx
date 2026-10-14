/**
 * Token mint Selector
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
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label">{label}</label>
      <div className="cedros-admin__token-selector">
        {/* Token selector buttons */}
        <div className="cedros-admin__token-options">
          {stablecoinEntries.map(([mint, meta]) => (
            <button
              key={mint}
              type="button"
              onClick={() => handleSelectChange(mint)}
              disabled={disabled}
              className={`cedros-admin__token-option ${
                value === mint ? 'cedros-admin__token-option--active' : ''
              }`}
            >
              <img
                src={meta.icon}
                alt={meta.symbol}
                className="cedros-admin__token-option-icon"
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
            className={`cedros-admin__token-option ${
              showCustomFields ? 'cedros-admin__token-option--active' : ''
            }`}
          >
            <span className="cedros-admin__token-option-plus">+</span>
            <span>Custom</span>
          </button>
        </div>

        {/* Custom token fields */}
        {showCustomFields && (
          <div className="cedros-admin__token-custom">
            {/* Token mint address */}
            <div className="cedros-data-field cedros-admin__field">
              <label className="cedros-data-label cedros-admin__field-label">
                Token mint address
              </label>
              {(() => {
                const mintValidation = validateSolanaAddress(value);
                return (
                  <>
                    <input
                      type="text"
                      className={`cedros-admin__input cedros-admin__input--mono ${
                        !mintValidation.valid ? 'cedros-admin__input--error' : ''
                      }`}
                      value={value}
                      onChange={e => onChange(e.target.value)}
                      placeholder="e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                      disabled={disabled}
                    />
                    {!mintValidation.valid && (
                      <span className="cedros-admin__field-error">
                        {mintValidation.error}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Token symbol */}
            <div className="cedros-data-field cedros-admin__field">
              <label className="cedros-data-label cedros-admin__field-label">
                Token symbol
              </label>
              <input
                type="text"
                className="cedros-data-input cedros-admin__input cedros-admin__input--uppercase"
                value={customSymbol}
                onChange={e => onCustomSymbolChange?.(e.target.value)}
                placeholder="e.g., MYTOKEN"
                disabled={disabled}
              />
            </div>

            {/* Token icon */}
            <div className="cedros-data-field cedros-admin__field">
              <label className="cedros-data-label cedros-admin__field-label">
                Token icon URL
              </label>
              <div className="cedros-admin__token-icon-row">
                <input
                  type="text"
                  className="cedros-data-input cedros-admin__input"
                  value={customIcon}
                  onChange={e => onCustomIconChange?.(e.target.value)}
                  placeholder="https://example.com/token-logo.png"
                  disabled={disabled}
                />
                {customIcon && (
                  <img
                    src={customIcon}
                    alt="Token icon preview"
                    className="cedros-admin__token-icon-preview"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div className="cedros-admin__field-description">
                Shown to customers during checkout
              </div>
            </div>

            {/* Token decimals */}
            <div className="cedros-data-field cedros-admin__field cedros-admin__token-decimals">
              <label className="cedros-data-label cedros-admin__field-label">
                Token decimals
              </label>
              <input
                type="number"
                className="cedros-data-input cedros-admin__input cedros-admin__input--compact"
                value={decimals ?? 6}
                onChange={e => onDecimalsChange?.(parseInt(e.target.value, 10) || 0)}
                min={0}
                max={18}
                disabled={disabled}
              />
              <div className="cedros-admin__field-description">
                Most SPL tokens use 6 decimals (like USDC)
              </div>
            </div>
          </div>
        )}

        {/* Show full address for known mint */}
        {value && isKnownMint && (
          <div className="cedros-admin__token-address">
            {value}
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="cedros-admin__field-description">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
