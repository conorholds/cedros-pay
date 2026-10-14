import { useEffect, useState, type ReactNode } from 'react';

export function PlanBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'primary' | 'muted' | 'success';
}) {
  const palette = {
    primary: {
      background: 'var(--pay-admin-primary)',
      color: 'var(--pay-admin-primary-fg)',
    },
    muted: {
      background: 'var(--pay-admin-muted)',
      color: 'var(--pay-admin-primary-fg)',
    },
    success: {
      background: 'var(--pay-admin-success-light)',
      color: 'var(--pay-admin-success)',
    },
  }[tone];

  return (
    <span
      style={{
        marginLeft: '0.5rem',
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 'var(--pay-admin-radius-control)',
        ...palette,
      }}
    >
      {children}
    </span>
  );
}

export function PlanTextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label">{label}</label>
      <input
        type="text"
        className="cedros-data-input cedros-admin__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function parsePlanNumberInput(value: string): number | null {
  if (value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPlanNumberValue(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}

export function PlanNumberField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  placeholder?: string;
  value: number;
}) {
  const [draftValue, setDraftValue] = useState(formatPlanNumberValue(value));

  useEffect(() => {
    setDraftValue(formatPlanNumberValue(value));
  }, [value]);

  return (
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label">{label}</label>
      <input
        type="number"
        className="cedros-data-input cedros-admin__input"
        value={draftValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);
          const parsed = parsePlanNumberInput(nextValue);
          if (parsed !== null) onChange(parsed);
        }}
        onBlur={() => {
          if (parsePlanNumberInput(draftValue) === null) {
            setDraftValue(formatPlanNumberValue(value));
          }
        }}
        placeholder={placeholder}
        min="0"
        step="0.01"
      />
    </div>
  );
}
