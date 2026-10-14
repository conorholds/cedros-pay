/**
 * Config Field
 *
 * Renders a single config field from its resolved metadata. Purely
 * presentational: value in, onChange out.
 *
 * Secrets: the server returns saved secrets as a redaction placeholder.
 * The input displays blank with a "Saved" affix; typing replaces the
 * value, and clearing the input restores the placeholder so an untouched
 * secret is never overwritten.
 */

import type { ResolvedFieldMeta } from './configMetadata';
import { Icons } from './icons';
import { FormDropdown } from './Dropdown';
import { Switch } from './Switch';
import { TokenMintSelector, validateSolanaAddress } from './TokenMintSelector';
import { FieldShell, SecretStringInput } from './ConfigFieldParts';

export interface ConfigFieldProps {
  fieldKey: string;
  value: unknown;
  meta: ResolvedFieldMeta;
  /** All current values, for controls that span multiple keys (token selector). */
  values: Record<string, unknown>;
  /** Value as loaded from the server, used to restore cleared secrets. */
  originalValue: unknown;
  disabled?: boolean;
  /** Cross-field hint (e.g. test key while in live mode). */
  warning?: string;
  onChange: (key: string, value: unknown) => void;
}

export function ConfigField({
  fieldKey,
  value,
  meta,
  values,
  originalValue,
  disabled = false,
  warning,
  onChange,
}: ConfigFieldProps) {
  if (meta.type === 'dropdown' && meta.options) {
    return (
      <FormDropdown
        value={value as string}
        onChange={(val) => onChange(fieldKey, val)}
        options={meta.options.map((opt) => ({
          value: opt,
          label: meta.optionLabels?.[opt] ?? opt,
        }))}
        label={meta.label}
        description={meta.description}
        disabled={disabled}
      />
    );
  }

  if (meta.type === 'segmented' && meta.options) {
    return (
      <FieldShell meta={meta} warning={warning}>
        <label className="cedros-data-label cedros-admin__field-label">{meta.label}</label>
        <div className="cedros-admin__segmented" role="group" aria-label={meta.label}>
          {meta.options.map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={value === opt}
              className={`cedros-admin__segmented-option ${
                value === opt ? 'cedros-admin__segmented-option--active' : ''
              }`}
              onClick={() => onChange(fieldKey, opt)}
              disabled={disabled}
            >
              {meta.optionLabels?.[opt] ?? opt}
            </button>
          ))}
        </div>
      </FieldShell>
    );
  }

  if (meta.type === 'token_mint') {
    return (
      <TokenMintSelector
        label={meta.label}
        value={value as string}
        onChange={(v) => onChange(fieldKey, v)}
        decimals={(values['token_decimals'] as number) ?? 6}
        onDecimalsChange={(d) => onChange('token_decimals', d)}
        disabled={disabled}
        description={meta.description}
        customSymbol={(values['custom_token_symbol'] as string) || ''}
        customIcon={(values['custom_token_icon'] as string) || ''}
        onCustomSymbolChange={(v) => onChange('custom_token_symbol', v)}
        onCustomIconChange={(v) => onChange('custom_token_icon', v)}
      />
    );
  }

  if (meta.type === 'toggle' || meta.type === 'boolean') {
    return (
      <FieldShell meta={meta} warning={warning}>
        <div className="cedros-admin__toggle-field">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(fieldKey, checked)}
            disabled={disabled}
            aria-label={meta.label}
          />
          <span className="cedros-data-label cedros-admin__field-label cedros-admin__toggle-field-label">
            {meta.label}
          </span>
        </div>
      </FieldShell>
    );
  }

  if (meta.type === 'solana_address') {
    const addressValue = (value as string) || '';
    const validation = validateSolanaAddress(addressValue);
    return (
      <FieldShell meta={meta} warning={warning}>
        <label className="cedros-data-label cedros-admin__field-label">{meta.label}</label>
        <div className="cedros-admin__input-affix">
          <input
            aria-label={meta.label}
            type="text"
            className={`cedros-admin__input cedros-admin__input--mono ${
              !validation.valid ? 'cedros-admin__input--error' : ''
            }`}
            value={addressValue}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            disabled={disabled}
            placeholder={meta.placeholder ?? 'e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'}
          />
          {addressValue && validation.valid && (
            <span
              className="cedros-admin__input-affix-icon cedros-admin__input-affix-icon--success"
              title="Valid Solana address"
            >
              {Icons.check}
            </span>
          )}
        </div>
        {!validation.valid && (
          <span className="cedros-admin__field-error">{validation.error}</span>
        )}
      </FieldShell>
    );
  }

  if (meta.type === 'number') {
    return (
      <FieldShell meta={meta} warning={warning}>
        <label className="cedros-data-label cedros-admin__field-label">
          {meta.label}
          {meta.unit && <span className="cedros-admin__field-unit"> ({meta.unit})</span>}
        </label>
        <input
          aria-label={meta.label}
          type="number"
          className="cedros-data-input cedros-admin__input"
          value={value as number}
          onChange={(e) => onChange(fieldKey, parseFloat(e.target.value) || 0)}
          disabled={disabled}
        />
      </FieldShell>
    );
  }

  if (meta.type === 'array') {
    const arr = (value as unknown[]) ?? [];
    return (
      <FieldShell meta={meta} warning={warning}>
        <label className="cedros-data-label cedros-admin__field-label">{meta.label}</label>
        <textarea
          aria-label={meta.label}
          className="cedros-data-textarea cedros-admin__textarea"
          value={arr.join('\n')}
          onChange={(e) => onChange(fieldKey, e.target.value.split('\n').filter(Boolean))}
          placeholder={meta.placeholder ?? 'One item per line'}
          rows={3}
          disabled={disabled}
        />
      </FieldShell>
    );
  }

  if (meta.type === 'object') {
    return (
      <FieldShell meta={meta} warning={warning}>
        <label className="cedros-data-label cedros-admin__field-label">{meta.label}</label>
        <textarea
          aria-label={meta.label}
          className="cedros-data-textarea cedros-admin__textarea cedros-admin__textarea--mono"
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(fieldKey, JSON.parse(e.target.value));
            } catch {
              // Invalid JSON, keep as-is
            }
          }}
          rows={5}
          disabled={disabled}
        />
      </FieldShell>
    );
  }

  // String (and secret string / textarea) fields
  if (meta.isSecret) {
    return (
      <FieldShell meta={meta} warning={warning}>
        <label className="cedros-data-label cedros-admin__field-label">{meta.label}</label>
        <SecretStringInput
          fieldKey={fieldKey}
          value={(value as string) ?? ''}
          meta={meta}
          originalValue={originalValue}
          disabled={disabled}
          multiline={meta.type === 'textarea'}
          onChange={onChange}
        />
      </FieldShell>
    );
  }

  if (meta.type === 'textarea') {
    return (
      <FieldShell meta={meta} warning={warning}>
        <label className="cedros-data-label cedros-admin__field-label">{meta.label}</label>
        <textarea
          aria-label={meta.label}
          className="cedros-data-textarea cedros-admin__textarea cedros-admin__textarea--mono"
          value={(value as string) ?? ''}
          placeholder={meta.placeholder}
          rows={4}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          disabled={disabled}
        />
      </FieldShell>
    );
  }

  return (
    <FieldShell meta={meta} warning={warning}>
      <label className="cedros-data-label cedros-admin__field-label">{meta.label}</label>
      <input
        aria-label={meta.label}
        type="text"
        className="cedros-data-input cedros-admin__input"
        value={(value as string) ?? ''}
        placeholder={meta.placeholder}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        disabled={disabled}
      />
    </FieldShell>
  );
}
