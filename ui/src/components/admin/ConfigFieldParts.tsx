import { useState, type ReactNode } from 'react';
import { REDACTED_VALUE, type ResolvedFieldMeta } from './configMetadata';
import { Icons } from './icons';

export function FieldShell({
  meta,
  warning,
  children,
}: {
  meta: ResolvedFieldMeta;
  warning?: string;
  children: ReactNode;
}) {
  return (
    <div className="cedros-data-field cedros-admin__field">
      {children}
      {warning && <div className="cedros-admin__field-hint">{warning}</div>}
      {(meta.description || meta.helpUrl) && (
        <div className="cedros-admin__field-description">
          {meta.description}
          {meta.helpUrl && (
            <>
              {meta.description ? ' ' : ''}
              <a
                className="cedros-admin__field-help"
                href={meta.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {meta.helpLabel ?? 'Learn more'}
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SecretStringInput({
  fieldKey,
  value,
  meta,
  originalValue,
  disabled,
  multiline,
  onChange,
}: {
  fieldKey: string;
  value: string;
  meta: ResolvedFieldMeta;
  originalValue: unknown;
  disabled?: boolean;
  multiline: boolean;
  onChange: (key: string, value: unknown) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const isSaved = value === REDACTED_VALUE;
  const shown = isSaved ? '' : value;
  const placeholder = isSaved
    ? 'Saved — enter a new value to replace it'
    : meta.placeholder ?? '';

  const restoreIfCleared = () => {
    if (shown === '' && originalValue === REDACTED_VALUE && !isSaved) {
      onChange(fieldKey, REDACTED_VALUE);
    }
  };

  if (multiline) {
    return (
      <div className="cedros-admin__input-affix">
        <textarea
          aria-label={meta.label}
          className="cedros-data-textarea cedros-admin__textarea cedros-admin__textarea--mono"
          value={shown}
          rows={4}
          placeholder={placeholder}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          onBlur={restoreIfCleared}
          disabled={disabled}
        />
        {isSaved && <span className="cedros-admin__saved-chip">Saved</span>}
      </div>
    );
  }

  return (
    <div className="cedros-admin__input-group">
      <div className="cedros-admin__input-affix">
        <input
          aria-label={meta.label}
          type={revealed ? 'text' : 'password'}
          className="cedros-data-input cedros-admin__input"
          value={shown}
          placeholder={placeholder}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          onBlur={restoreIfCleared}
          disabled={disabled}
          autoComplete="off"
        />
        {isSaved && <span className="cedros-admin__saved-chip">Saved</span>}
      </div>
      {shown !== '' && (
        <button
          type="button"
          className="cedros-data-btn cedros-admin__button cedros-data-btn--ghost cedros-admin__button--ghost cedros-admin__button--icon"
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? 'Hide value' : 'Show value'}
          title={revealed ? 'Hide' : 'Show'}
        >
          {revealed ? Icons.eyeOff : Icons.eye}
        </button>
      )}
    </div>
  );
}
