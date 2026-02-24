/**
 * Config Editor Component
 *
 * Renders a form for editing a config category.
 * Autosaves on change with debouncing.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  isSecretField,
  REDACTED_VALUE,
  CONFIG_CATEGORIES,
  type ValidateConfigResponse,
} from './configApi';
import { useAutosave } from './useAutosave';
import { AutosaveIndicator } from './AutosaveIndicator';
import { Icons } from './icons';
import { FormDropdown } from './Dropdown';
import { STABLECOIN_METADATA } from '../../utils/tokenMintValidator';
import { TokenMintSelector, validateSolanaAddress } from './TokenMintSelector';
import { SecretArrayEditor } from './SecretArrayEditor';

export interface ConfigEditorProps {
  category: string;
  config: Record<string, unknown>;
  originalConfig: Record<string, unknown>;
  isLoading?: boolean;
  onSave: (config: Record<string, unknown>) => Promise<void>;
  onValidate?: (config: Record<string, unknown>) => Promise<ValidateConfigResponse>;
}

interface InferredFieldMeta {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'dropdown' | 'token_mint' | 'toggle' | 'secret_array' | 'solana_address';
  isSecret: boolean;
  label: string;
  options?: string[];
  unit?: string;
  description?: string;
  hidden?: boolean;
  showWhen?: string;
}

function inferFieldMeta(category: string, key: string, value: unknown): InferredFieldMeta {
  const isSecret = isSecretField(category, key);
  const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const catMeta = CONFIG_CATEGORIES[category];
  const fieldMeta = catMeta?.fields?.[key];

  const baseMeta = {
    isSecret,
    label,
    description: fieldMeta?.description,
    hidden: fieldMeta?.hidden,
    showWhen: fieldMeta?.showWhen,
  };

  // Check for explicit dropdown
  if (fieldMeta?.type === 'dropdown' && fieldMeta.options) {
    return { ...baseMeta, type: 'dropdown', options: fieldMeta.options };
  }

  // Check for token_mint selector
  if (fieldMeta?.type === 'token_mint') {
    return { ...baseMeta, type: 'token_mint' };
  }

  // Check for toggle type
  if (fieldMeta?.type === 'toggle') {
    return { ...baseMeta, type: 'toggle' };
  }

  // Check for secret_array type
  if (fieldMeta?.type === 'secret_array') {
    return { ...baseMeta, type: 'secret_array', isSecret: true };
  }

  // Check for solana_address type
  if (fieldMeta?.type === 'solana_address') {
    return { ...baseMeta, type: 'solana_address' };
  }

  // Check for explicit number with unit
  if (fieldMeta?.type === 'number') {
    return { ...baseMeta, type: 'number', unit: fieldMeta.unit };
  }

  // Infer from value type
  if (typeof value === 'boolean') {
    return { ...baseMeta, type: 'boolean' };
  }
  if (typeof value === 'number') {
    return { ...baseMeta, type: 'number', unit: fieldMeta?.unit };
  }
  if (Array.isArray(value)) {
    return { ...baseMeta, type: 'array' };
  }
  if (typeof value === 'object' && value !== null) {
    return { ...baseMeta, type: 'object' };
  }
  return { ...baseMeta, type: 'string' };
}

export function ConfigEditor({
  category,
  config,
  originalConfig,
  isLoading = false,
  onSave,
}: ConfigEditorProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(config);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFormData(config);
  }, [config]);

  // Prepare data for saving (handle secrets)
  const dataToSave = useMemo(() => {
    const data = { ...formData };
    for (const key of Object.keys(data)) {
      if (isSecretField(category, key)) {
        const originalValue = originalConfig[key];
        const newValue = data[key];
        // If value hasn't changed from redacted, keep it redacted
        if (newValue === REDACTED_VALUE || newValue === originalValue) {
          data[key] = REDACTED_VALUE;
        }
      }
    }
    return data;
  }, [formData, originalConfig, category]);

  // Block autosave when a custom token mint address is present but invalid
  const hasTokenMintError = useMemo(() => {
    const tokenMint = formData['token_mint'];
    if (typeof tokenMint !== 'string' || !tokenMint) return false;
    return !validateSolanaAddress(tokenMint).valid;
  }, [formData]);

  // Autosave with debouncing
  const { status: autosaveStatus, error: autosaveError } = useAutosave({
    data: dataToSave,
    onSave,
    debounceMs: 1500,
    enabled: !hasTokenMintError,
  });

  const updateField = useCallback((key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSecretReveal = useCallback((key: string) => {
    setRevealedSecrets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Helper to render field description
  const renderDescription = (description?: string) => {
    if (!description) return null;
    return (
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--cedros-admin-text-muted, #64748b)',
        marginTop: '0.25rem',
      }}>
        {description}
      </div>
    );
  };

  const renderField = (key: string, value: unknown) => {
    const meta = inferFieldMeta(category, key, originalConfig[key] ?? value);

    if (meta.type === 'dropdown' && meta.options) {
      return (
        <FormDropdown
          value={value as string}
          onChange={(val) => updateField(key, val)}
          options={meta.options.map(opt => ({ value: opt, label: opt }))}
          label={meta.label}
          description={meta.description}
          disabled={isLoading}
        />
      );
    }

    if (meta.type === 'token_mint') {
      return (
        <TokenMintSelector
          label={meta.label}
          value={value as string}
          onChange={v => updateField(key, v)}
          decimals={(formData['token_decimals'] as number) ?? 6}
          onDecimalsChange={d => updateField('token_decimals', d)}
          disabled={isLoading}
          description={meta.description}
          customSymbol={(formData['custom_token_symbol'] as string) || ''}
          customIcon={(formData['custom_token_icon'] as string) || ''}
          onCustomSymbolChange={v => updateField('custom_token_symbol', v)}
          onCustomIconChange={v => updateField('custom_token_icon', v)}
        />
      );
    }

    if (meta.type === 'toggle') {
      return (
        <div className="cedros-admin__field">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              role="switch"
              aria-checked={value as boolean}
              onClick={() => updateField(key, !value)}
              disabled={isLoading}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                backgroundColor: value
                  ? 'var(--cedros-admin-primary, #171717)'
                  : 'var(--cedros-admin-border, #d4d4d4)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s',
                opacity: isLoading ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: value ? 22 : 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
            <span className="cedros-admin__field-label" style={{ marginBottom: 0 }}>
              {meta.label}
            </span>
          </div>
          {renderDescription(meta.description)}
        </div>
      );
    }

    if (meta.type === 'solana_address') {
      const addressValue = (value as string) || '';
      const validation = validateSolanaAddress(addressValue);
      return (
        <div className="cedros-admin__field">
          <label className="cedros-admin__field-label">{meta.label}</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className={`cedros-admin__input ${!validation.valid ? 'cedros-admin__input--error' : ''}`}
              value={addressValue}
              onChange={(e) => updateField(key, e.target.value)}
              disabled={isLoading}
              placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                borderColor: !validation.valid ? 'var(--cedros-admin-error, #dc2626)' : undefined,
                paddingRight: addressValue && validation.valid ? '2rem' : undefined,
              }}
            />
            {addressValue && validation.valid && (
              <span
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--cedros-admin-success, #16a34a)',
                  fontSize: '1rem',
                }}
                title="Valid Solana address"
              >
                ✓
              </span>
            )}
          </div>
          {!validation.valid && (
            <span style={{ color: 'var(--cedros-admin-error, #dc2626)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
              {validation.error}
            </span>
          )}
          {renderDescription(meta.description)}
        </div>
      );
    }

    if (meta.type === 'boolean') {
      return (
        <div className="cedros-admin__field">
          <label className="cedros-admin__checkbox">
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={e => updateField(key, e.target.checked)}
              disabled={isLoading}
            />
            {meta.label}
          </label>
          {renderDescription(meta.description)}
        </div>
      );
    }

    if (meta.type === 'number') {
      return (
        <div className="cedros-admin__field">
          <label className="cedros-admin__field-label">
            {meta.label}
            {meta.unit && <span className="cedros-admin__field-unit"> ({meta.unit})</span>}
          </label>
          <input
            type="number"
            className="cedros-admin__input"
            value={value as number}
            onChange={e => updateField(key, parseFloat(e.target.value) || 0)}
            disabled={isLoading}
          />
          {renderDescription(meta.description)}
        </div>
      );
    }

    if (meta.type === 'secret_array') {
      return (
        <SecretArrayEditor
          label={meta.label}
          value={value as string[]}
          onChange={v => updateField(key, v)}
          disabled={isLoading}
          description={meta.description}
        />
      );
    }

    if (meta.type === 'array') {
      const arr = value as unknown[];
      return (
        <div className="cedros-admin__field">
          <label className="cedros-admin__field-label">{meta.label}</label>
          <textarea
            className="cedros-admin__textarea"
            value={arr.join('\n')}
            onChange={e => updateField(key, e.target.value.split('\n').filter(Boolean))}
            placeholder="One item per line"
            rows={3}
            disabled={isLoading}
          />
          {renderDescription(meta.description)}
        </div>
      );
    }

    if (meta.type === 'object') {
      return (
        <div className="cedros-admin__field">
          <label className="cedros-admin__field-label">{meta.label}</label>
          <textarea
            className="cedros-admin__textarea cedros-admin__textarea--mono"
            value={JSON.stringify(value, null, 2)}
            onChange={e => {
              try {
                updateField(key, JSON.parse(e.target.value));
              } catch {
                // Invalid JSON, keep as-is
              }
            }}
            rows={5}
            disabled={isLoading}
          />
          {renderDescription(meta.description)}
        </div>
      );
    }

    // String field (possibly secret)
    const isRevealed = revealedSecrets.has(key);
    const displayValue = meta.isSecret && !isRevealed && value === REDACTED_VALUE
      ? REDACTED_VALUE
      : (value as string);

    return (
      <div className="cedros-admin__field">
        <label className="cedros-admin__field-label">
          {meta.label}
          {meta.isSecret && <span className="cedros-admin__field-secret"> (secret)</span>}
        </label>
        <div className="cedros-admin__input-group">
          <input
            type={meta.isSecret && !isRevealed ? 'password' : 'text'}
            className="cedros-admin__input"
            value={displayValue}
            onChange={e => updateField(key, e.target.value)}
            disabled={isLoading}
            placeholder={meta.isSecret ? '••••••••' : ''}
          />
          {meta.isSecret && (
            <button
              type="button"
              className="cedros-admin__button cedros-admin__button--ghost"
              onClick={() => toggleSecretReveal(key)}
              style={{ padding: '0.5rem', minWidth: 'auto' }}
              title={isRevealed ? 'Hide' : 'Show'}
            >
              {isRevealed ? Icons.eyeOff : Icons.eye}
            </button>
          )}
        </div>
        {renderDescription(meta.description)}
      </div>
    );
  };

  const keys = Object.keys(formData);

  // Determine which fields should be visible
  const shouldShowField = (key: string): boolean => {
    const meta = inferFieldMeta(category, key, originalConfig[key] ?? formData[key]);

    // Check explicit hidden flag
    if (meta.hidden) return false;

    // Check showWhen condition
    if (meta.showWhen) {
      const dependentValue = formData[meta.showWhen];
      if (!dependentValue) return false;
    }

    // Special case: hide token_decimals when using a known stablecoin
    if (key === 'token_decimals') {
      const tokenMint = formData['token_mint'] as string | undefined;
      if (tokenMint && STABLECOIN_METADATA[tokenMint]) {
        return false;
      }
    }

    return true;
  };

  return (
    <div className="cedros-admin__config-editor">
      <div className="cedros-admin__config-fields">
        {keys.filter(shouldShowField).map(key => (
          <div key={key} className="cedros-admin__config-field">
            {renderField(key, formData[key])}
          </div>
        ))}
      </div>

      <div className="cedros-admin__config-actions">
        <div className="cedros-admin__autosave-status">
          <AutosaveIndicator status={autosaveStatus} error={autosaveError} />
        </div>
      </div>
    </div>
  );
}
