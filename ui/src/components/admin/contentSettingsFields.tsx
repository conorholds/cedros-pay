import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FormDropdown, type DropdownOption } from './Dropdown';
import { Switch } from './Switch';

function FieldDescription({ description }: { description?: string }) {
  if (!description) return null;
  return <div className="cedros-admin__field-description">{description}</div>;
}

export function ToggleField({
  label,
  checked,
  onChange,
  description,
  trailing = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  trailing?: boolean;
}) {
  if (trailing) {
    return (
      <div className="cedros-data-field cedros-admin__field cedros-admin__form-switch">
        <div className="cedros-admin__form-switch-copy">
          <span className="cedros-data-label cedros-admin__field-label">{label}</span>
          <FieldDescription description={description} />
        </div>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      </div>
    );
  }
  return (
    <div className="cedros-data-field cedros-admin__field">
      <div className="cedros-admin__toggle-field">
        <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
        <span className="cedros-data-label cedros-admin__field-label cedros-admin__toggle-field-label">
          {label}
        </span>
      </div>
      <FieldDescription description={description} />
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  description,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="cedros-data-input cedros-admin__input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldDescription description={description} />
    </div>
  );
}

/**
 * Non-negative integer field. Clearing the box yields null when `nullable`
 * (e.g. "no credits price") or the floor otherwise — never NaN or a negative.
 */
export function NumberField({
  label,
  value,
  onChange,
  description,
  placeholder,
  nullable = false,
  min = 0,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  description?: string;
  placeholder?: string;
  nullable?: boolean;
  min?: number;
}) {
  const id = useId();
  const handle = (raw: string) => {
    if (raw.trim() === '') {
      onChange(nullable ? null : min);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(Math.max(min, Math.floor(parsed)));
  };

  return (
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="cedros-data-input cedros-admin__input"
        type="number"
        min={min}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(event) => handle(event.target.value)}
      />
      <FieldDescription description={description} />
    </div>
  );
}

function currencySymbol(currency: string): string {
  switch (currency) {
    case 'USD':
    case 'CAD':
    case 'AUD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return '';
  }
}

/** Format integer minor units as a major-unit string for the input — exact integer math. */
function centsToInput(cents: number | null): string {
  if (cents == null) return '';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * Parse a major-unit string to integer minor units with exact integer math —
 * never `value * 100` (which drifts, e.g. 4.99 → 498.9999…). Returns:
 *  - a number of cents for a valid amount,
 *  - null for an empty field (clears the price),
 *  - undefined for an in-progress/invalid entry (ignore the keystroke).
 */
function inputToCents(raw: string): number | null | undefined {
  const trimmed = raw.trim().replace(/^[$€£]/, '').trim();
  if (trimmed === '') return null;
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(trimmed);
  if (!match) return undefined;
  const whole = parseInt(match[1], 10);
  const frac = match[2] ? parseInt(match[2].padEnd(2, '0'), 10) : 0;
  return whole * 100 + frac;
}

/**
 * Money input. Holds the price as fixed-point integer minor units (cents) and
 * shows a major-unit field; all conversion is exact integer arithmetic. Clearing
 * the box yields null (no price).
 */
export function MoneyField({
  label,
  amountCents,
  currency = 'USD',
  onChange,
  description,
  placeholder,
}: {
  label: string;
  amountCents: number | null;
  currency?: string;
  onChange: (amountCents: number | null) => void;
  description?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [text, setText] = useState(() => centsToInput(amountCents));
  const synced = useRef(amountCents);

  // Re-sync the field when the value changes from outside (load/reset), but not
  // on our own edits (which would fight the cursor mid-type).
  useEffect(() => {
    if (amountCents !== synced.current) {
      setText(centsToInput(amountCents));
      synced.current = amountCents;
    }
  }, [amountCents]);

  const handle = (raw: string) => {
    setText(raw);
    const cents = inputToCents(raw);
    if (cents === undefined) return;
    synced.current = cents;
    onChange(cents);
  };

  const symbol = currencySymbol(currency);
  return (
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label" htmlFor={id}>{label}</label>
      <div className="cedros-admin__money-input">
        {symbol && (
          <span className="cedros-admin__money-input-symbol" aria-hidden="true">{symbol}</span>
        )}
        <input
          id={id}
          className="cedros-data-input cedros-admin__input"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          onChange={(event) => handle(event.target.value)}
        />
        {!symbol && <span className="cedros-admin__money-input-code">{currency}</span>}
      </div>
      <FieldDescription description={description} />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  description?: string;
}) {
  const optionValues = new Set(options.map((option) => option.value));
  const displayOptions = optionValues.has(value) || !value
    ? options
    : [{ value, label: `Current: ${value}` }, ...options];

  return (
    <FormDropdown
      label={label}
      value={value}
      onChange={onChange}
      options={displayOptions}
      description={description}
    />
  );
}

/** Read-only explanation shown where an editable control used to live. */
export function InfoLine({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="cedros-admin__info-line" role="note">
      {label && <span className="cedros-admin__info-line-label">{label}</span>}
      <span className="cedros-admin__info-line-text">{children}</span>
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  mono = false,
  rows = 4,
  placeholder,
  description,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
  rows?: number;
  placeholder?: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label" htmlFor={id}>{label}</label>
      <textarea
        id={id}
        className={`cedros-admin__textarea ${mono ? 'cedros-admin__textarea--mono' : ''}`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldDescription description={description} />
    </div>
  );
}
