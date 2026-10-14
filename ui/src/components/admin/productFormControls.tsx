/**
 * Composite controls for the Add product page. These favour friendly,
 * direct-manipulation inputs (segmented pickers, removable chips, an image
 * preview) over raw text boxes, and reuse the shared admin field styling.
 */

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { COUNTRIES, countryName, resolveCountry } from './countries';
import { Icons } from './icons';

/** A titled card that groups related fields with a short explanation. */
export function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="cedros-data-card cedros-admin__field-group">
      <div className="cedros-data-card__header cedros-admin__field-group-header">
        <div className="cedros-admin__field-group-heading">
          <h3 className="cedros-data-card__title cedros-admin__field-group-title">{title}</h3>
          {description && <p className="cedros-admin__field-group-description">{description}</p>}
        </div>
      </div>
      <div className="cedros-admin__field-group-body">{children}</div>
    </section>
  );
}

/** Pick one option from a small set as pills — clearer than a dropdown for 2–4 choices. */
export function SegmentedField<T extends string>({
  label,
  value,
  onChange,
  options,
  description,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  description?: string;
}) {
  return (
    <div className="cedros-data-field cedros-admin__field">
      <span className="cedros-data-label cedros-admin__field-label">{label}</span>
      <div
        className="cedros-admin__segmented cedros-admin__segmented--wrap"
        role="group"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={`cedros-admin__segmented-option ${
              value === option.value ? 'cedros-admin__segmented-option--active' : ''
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {description && <div className="cedros-admin__field-description">{description}</div>}
    </div>
  );
}

/** Pick one form value from a short list using native radio semantics. */
export function RadioGroupField<T extends string>({
  label,
  value,
  onChange,
  options,
  description,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  description?: string;
}) {
  const name = useId();
  return (
    <fieldset className="cedros-data-field cedros-admin__field cedros-admin__radio-field">
      <legend className="cedros-data-label cedros-admin__field-label">{label}</legend>
      <div className="cedros-admin__radio-group">
        {options.map((option) => (
          <label key={option.value} className="cedros-admin__radio-option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {description && <div className="cedros-admin__field-description">{description}</div>}
    </fieldset>
  );
}

/** Free-text values entered as removable chips (tags, country codes, …). */
export function TagsField({
  label,
  value,
  onChange,
  description,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  description?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const inputId = useId();

  const add = () => {
    const entry = draft.trim();
    if (!entry || value.includes(entry)) {
      setDraft('');
      return;
    }
    onChange([...value, entry]);
    setDraft('');
  };

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
          {value.map((entry) => (
            <span key={entry} className="cedros-admin__chip" role="listitem">
              {entry}
              <button
                type="button"
                className="cedros-admin__chip-remove"
                aria-label={`Remove ${entry}`}
                title={`Remove ${entry}`}
                onClick={() => onChange(value.filter((item) => item !== entry))}
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
          className="cedros-data-input cedros-admin__input"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
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
      {description && <div className="cedros-admin__field-description">{description}</div>}
    </div>
  );
}

/** Pick countries by name (or 2-letter code); stores ISO codes, shows names as chips. */
export function CountriesField({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  description?: string;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const listId = useId();

  const add = () => {
    const code = resolveCountry(draft);
    if (!code) {
      setError('Pick a country from the list.');
      return;
    }
    if (!value.includes(code)) onChange([...value, code]);
    setDraft('');
    setError(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
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
          {value.map((code) => (
            <span key={code} className="cedros-admin__chip" role="listitem">
              {countryName(code)}
              <button
                type="button"
                className="cedros-admin__chip-remove"
                aria-label={`Remove ${countryName(code)}`}
                title={`Remove ${countryName(code)}`}
                onClick={() => onChange(value.filter((item) => item !== code))}
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
          className="cedros-data-input cedros-admin__input"
          list={listId}
          value={draft}
          placeholder="Filter countries…"
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
        />
        <datalist id={listId}>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.name} />
          ))}
        </datalist>
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
        description && <div className="cedros-admin__field-description">{description}</div>
      )}
    </div>
  );
}

/** Image chooser: shows a preview, opens the media library, and accepts a pasted URL. */
export function ImageField({
  value,
  onChange,
  onBrowse,
  canBrowse,
}: {
  value: string;
  onChange: (value: string) => void;
  onBrowse: () => void;
  canBrowse: boolean;
}) {
  const inputId = useId();
  return (
    <div className="cedros-data-field cedros-admin__field">
      <span className="cedros-data-label cedros-admin__field-label">Image</span>
      <div className="cedros-admin__image-field">
        {value ? (
          <img className="cedros-admin__image-preview" src={value} alt="" />
        ) : (
          <button
            type="button"
            className="cedros-admin__image-empty"
            onClick={onBrowse}
            disabled={!canBrowse}
          >
            {Icons.plus}
            Choose image
          </button>
        )}
        <div className="cedros-admin__image-side">
          {value && (
            <div className="cedros-admin__image-actions">
              <button
                type="button"
                className="cedros-data-btn cedros-admin__button cedros-data-btn--secondary cedros-admin__button--secondary cedros-data-btn--sm cedros-admin__button--sm"
                onClick={onBrowse}
                disabled={!canBrowse}
              >
                Replace
              </button>
              <button
                type="button"
                className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-data-btn--sm cedros-admin__button--sm"
                onClick={() => onChange('')}
              >
                {Icons.trash}
                Remove
              </button>
            </div>
          )}
          <input
            id={inputId}
            className="cedros-data-input cedros-admin__input"
            type="url"
            aria-label="Image URL"
            value={value}
            placeholder="…or paste an image URL"
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </div>
      <div className="cedros-admin__field-description">
        Shown on the product page and at checkout. A square image around 1000×1000 works best.
      </div>
    </div>
  );
}
