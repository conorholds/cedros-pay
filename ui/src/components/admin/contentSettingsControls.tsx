/** Validated amount-list editor for the Content settings cards. */

import { useId, useState, type KeyboardEvent } from 'react';
import { Icons } from './icons';

function FieldDescription({ description }: { description?: string }) {
  if (!description) return null;
  return <div className="cedros-admin__field-description">{description}</div>;
}

export function AmountChipsField({
  label,
  value,
  onChange,
  description,
  placeholder = 'Add an amount',
}: {
  label: string;
  value: number[];
  onChange: (value: number[]) => void;
  description?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const amount = Number(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a number greater than 0.');
      return;
    }
    if (value.includes(amount)) {
      setError('That amount is already in the list.');
      return;
    }
    onChange([...value, amount]);
    setDraft('');
    setError(null);
  };

  const remove = (amount: number) => onChange(value.filter((item) => item !== amount));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    }
  };

  return (
    <div className="cedros-data-field cedros-admin__field">
      <label className="cedros-data-label cedros-admin__field-label" htmlFor={inputId}>
        {label}
      </label>
      {value.length > 0 && (
        <div className="cedros-admin__chips" role="list">
          {value.map((amount) => (
            <span key={amount} className="cedros-admin__chip" role="listitem">
              {amount}
              <button
                type="button"
                className="cedros-admin__chip-remove"
                aria-label={`Remove ${amount}`}
                title={`Remove ${amount}`}
                onClick={() => remove(amount)}
              >
                {Icons.close}
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="cedros-admin__chip-add">
        <input
          id={inputId}
          aria-label={label}
          className="cedros-data-input cedros-admin__input"
          type="number"
          min="0"
          inputMode="decimal"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--outline cedros-data-btn--sm cedros-admin__button--sm"
          onClick={add}
          disabled={!draft.trim()}
        >
          {Icons.plus}
          Add
        </button>
      </div>
      {error ? (
        <div className="cedros-admin__field-error">{error}</div>
      ) : (
        <FieldDescription description={description} />
      )}
    </div>
  );
}
