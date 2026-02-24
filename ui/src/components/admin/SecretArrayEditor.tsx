/**
 * Secret Array Editor
 *
 * Manages an array of secret values (e.g., wallet keypairs) with
 * add/edit/delete per item and masked display by default.
 */

import { useState } from 'react';
import { REDACTED_VALUE } from './configApi';
import { Icons } from './icons';

export interface SecretArrayEditorProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  description?: string;
}

/** Secret array editor with add/edit/delete per item */
export function SecretArrayEditor({
  label,
  value,
  onChange,
  disabled = false,
  description,
}: SecretArrayEditorProps) {
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Ensure value is always an array
  const items = Array.isArray(value) ? value : [];

  const toggleReveal = (index: number) => {
    setRevealedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addItem = () => {
    onChange([...items, '']);
    setEditingIndex(items.length);
    setEditValue('');
  };

  const updateItem = (index: number, newValue: string) => {
    const updated = [...items];
    updated[index] = newValue;
    onChange(updated);
  };

  const deleteItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
    // Adjust revealed indices
    setRevealedIndices(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(items[index] || '');
  };

  const finishEditing = () => {
    if (editingIndex !== null) {
      updateItem(editingIndex, editValue);
      setEditingIndex(null);
      setEditValue('');
    }
  };

  const cancelEditing = () => {
    // If it's a new empty item, remove it
    if (editingIndex !== null && items[editingIndex] === '') {
      deleteItem(editingIndex);
    }
    setEditingIndex(null);
    setEditValue('');
  };

  return (
    <div className="cedros-admin__field">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <label className="cedros-admin__field-label" style={{ marginBottom: 0 }}>{label}</label>
        <button
          type="button"
          onClick={addItem}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            border: '1px solid var(--cedros-admin-border, #d4d4d4)',
            borderRadius: '0.375rem',
            background: 'var(--cedros-admin-bg, #fff)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {Icons.plus}
          Add
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.length === 0 && (
          <div style={{
            padding: '1rem',
            textAlign: 'center',
            color: 'var(--cedros-admin-text-muted, #64748b)',
            fontSize: '0.875rem',
            border: '1px dashed var(--cedros-admin-border, #d4d4d4)',
            borderRadius: '0.5rem',
          }}>
            No items. Click &quot;Add&quot; to create one.
          </div>
        )}

        {items.map((item, index) => {
          const isRevealed = revealedIndices.has(index);
          const isEditing = editingIndex === index;
          const isRedacted = item === REDACTED_VALUE;

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                background: 'var(--cedros-admin-bg-muted, #f9fafb)',
                borderRadius: '0.375rem',
                border: '1px solid var(--cedros-admin-border, #e5e7eb)',
              }}
            >
              {isEditing ? (
                <>
                  <input
                    type="text"
                    className="cedros-admin__input"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    placeholder="Enter wallet keypair..."
                    autoFocus
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') finishEditing();
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                  <button
                    type="button"
                    onClick={finishEditing}
                    style={{
                      padding: '0.375rem',
                      border: 'none',
                      background: 'var(--cedros-admin-success, #22c55e)',
                      color: '#fff',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                    }}
                    title="Save"
                  >
                    {Icons.check}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    style={{
                      padding: '0.375rem',
                      border: 'none',
                      background: 'var(--cedros-admin-text-muted, #64748b)',
                      color: '#fff',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                    }}
                    title="Cancel"
                  >
                    {Icons.close}
                  </button>
                </>
              ) : (
                <>
                  <div style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {isRevealed && !isRedacted
                      ? item
                      : isRedacted
                        ? '[REDACTED]'
                        : '••••••••••••••••••••'}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleReveal(index)}
                    disabled={disabled || isRedacted}
                    style={{
                      padding: '0.375rem',
                      border: 'none',
                      background: 'transparent',
                      cursor: disabled || isRedacted ? 'not-allowed' : 'pointer',
                      opacity: disabled || isRedacted ? 0.5 : 1,
                      color: 'var(--cedros-admin-text-muted, #64748b)',
                    }}
                    title={isRevealed ? 'Hide' : 'Show'}
                  >
                    {isRevealed ? Icons.eyeOff : Icons.eye}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(index)}
                    disabled={disabled}
                    style={{
                      padding: '0.375rem',
                      border: 'none',
                      background: 'transparent',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1,
                      color: 'var(--cedros-admin-text-muted, #64748b)',
                    }}
                    title="Edit"
                  >
                    {Icons.settings}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(index)}
                    disabled={disabled}
                    style={{
                      padding: '0.375rem',
                      border: 'none',
                      background: 'transparent',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1,
                      color: 'var(--cedros-admin-error, #ef4444)',
                    }}
                    title="Delete"
                  >
                    {Icons.trash}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {description && (
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--cedros-admin-text-muted, #64748b)',
          marginTop: '0.5rem',
        }}>
          {description}
        </div>
      )}
    </div>
  );
}
