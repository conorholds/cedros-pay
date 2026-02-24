/**
 * VariationTypeEditor - Admin component for managing product variation types
 *
 * Allows admins to create variation types (e.g., Size, Color) and their values
 * (e.g., S, M, L for Size). Supports reordering and will support hierarchical
 * dependencies in a future phase.
 */

import { useState, useCallback } from 'react';
import type { VariationType, VariationValue, ProductVariationConfig } from '../../ecommerce/types';
import { Icons } from './icons';

export interface VariationTypeEditorProps {
  /** Current variation config */
  value: ProductVariationConfig;
  /** Called when config changes */
  onChange: (config: ProductVariationConfig) => void;
  /** Max variation types allowed (default: 5) */
  maxTypes?: number;
  /** Max values per type (default: 20) */
  maxValuesPerType?: number;
  /** Whether editing is disabled */
  disabled?: boolean;
}

function generateId(): string {
  return `var_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function VariationTypeEditor({
  value,
  onChange,
  maxTypes = 5,
  maxValuesPerType = 20,
  disabled = false,
}: VariationTypeEditorProps) {
  const [expandedTypeId, setExpandedTypeId] = useState<string | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [newValueLabels, setNewValueLabels] = useState<Record<string, string>>({});

  const types = value.variationTypes;

  const handleAddType = useCallback(() => {
    if (!newTypeName.trim() || types.length >= maxTypes) return;

    const newType: VariationType = {
      id: generateId(),
      name: newTypeName.trim(),
      displayOrder: types.length,
      values: [],
    };

    onChange({
      variationTypes: [...types, newType],
    });
    setNewTypeName('');
    setExpandedTypeId(newType.id);
  }, [newTypeName, types, maxTypes, onChange]);

  const handleRemoveType = useCallback(
    (typeId: string) => {
      onChange({
        variationTypes: types
          .filter((t) => t.id !== typeId)
          .map((t, idx) => ({ ...t, displayOrder: idx })),
      });
      if (expandedTypeId === typeId) setExpandedTypeId(null);
    },
    [types, onChange, expandedTypeId]
  );

  const handleRenameType = useCallback(
    (typeId: string, newName: string) => {
      onChange({
        variationTypes: types.map((t) =>
          t.id === typeId ? { ...t, name: newName } : t
        ),
      });
    },
    [types, onChange]
  );

  const handleMoveType = useCallback(
    (typeId: string, direction: 'up' | 'down') => {
      const idx = types.findIndex((t) => t.id === typeId);
      if (idx === -1) return;
      if (direction === 'up' && idx === 0) return;
      if (direction === 'down' && idx === types.length - 1) return;

      const newTypes = [...types];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newTypes[idx], newTypes[swapIdx]] = [newTypes[swapIdx], newTypes[idx]];

      onChange({
        variationTypes: newTypes.map((t, i) => ({ ...t, displayOrder: i })),
      });
    },
    [types, onChange]
  );

  const handleAddValue = useCallback(
    (typeId: string) => {
      const label = (newValueLabels[typeId] || '').trim();
      if (!label) return;

      const varType = types.find((t) => t.id === typeId);
      if (!varType || varType.values.length >= maxValuesPerType) return;

      const newValue: VariationValue = {
        id: generateId(),
        label,
      };

      onChange({
        variationTypes: types.map((t) =>
          t.id === typeId ? { ...t, values: [...t.values, newValue] } : t
        ),
      });
      setNewValueLabels((prev) => ({ ...prev, [typeId]: '' }));
    },
    [types, newValueLabels, maxValuesPerType, onChange]
  );

  const handleRemoveValue = useCallback(
    (typeId: string, valueId: string) => {
      onChange({
        variationTypes: types.map((t) =>
          t.id === typeId
            ? { ...t, values: t.values.filter((v) => v.id !== valueId) }
            : t
        ),
      });
    },
    [types, onChange]
  );

  const handleRenameValue = useCallback(
    (typeId: string, valueId: string, newLabel: string) => {
      onChange({
        variationTypes: types.map((t) =>
          t.id === typeId
            ? {
                ...t,
                values: t.values.map((v) =>
                  v.id === valueId ? { ...v, label: newLabel } : v
                ),
              }
            : t
        ),
      });
    },
    [types, onChange]
  );

  return (
    <div className="cedros-admin__variation-editor">
      <div className="cedros-admin__variation-editor-header">
        <h4 className="cedros-admin__field-label" style={{ marginBottom: 0 }}>
          Variation Types
        </h4>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {types.length}/{maxTypes} types
        </span>
      </div>

      {types.length === 0 ? (
        <div className="cedros-admin__variation-empty">
          No variation types defined. Add types like "Size" or "Color" to create
          product variants.
        </div>
      ) : (
        <div className="cedros-admin__variation-type-list">
          {types.map((varType, idx) => (
            <div key={varType.id} className="cedros-admin__variation-type-item">
              <div className="cedros-admin__variation-type-header">
                <div className="cedros-admin__variation-type-controls">
                  <button
                    type="button"
                    className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon"
                    onClick={() => handleMoveType(varType.id, 'up')}
                    disabled={disabled || idx === 0}
                    title="Move up"
                  >
                    {Icons.arrowUp}
                  </button>
                  <button
                    type="button"
                    className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon"
                    onClick={() => handleMoveType(varType.id, 'down')}
                    disabled={disabled || idx === types.length - 1}
                    title="Move down"
                  >
                    {Icons.arrowDown}
                  </button>
                </div>

                <input
                  type="text"
                  className="cedros-admin__input cedros-admin__variation-type-name"
                  value={varType.name}
                  onChange={(e) => handleRenameType(varType.id, e.target.value)}
                  disabled={disabled}
                  placeholder="Type name"
                />

                <span className="cedros-admin__variation-value-count">
                  {varType.values.length} values
                </span>

                <button
                  type="button"
                  className="cedros-admin__button cedros-admin__button--ghost"
                  onClick={() =>
                    setExpandedTypeId(
                      expandedTypeId === varType.id ? null : varType.id
                    )
                  }
                >
                  {expandedTypeId === varType.id ? 'Collapse' : 'Edit values'}
                </button>

                <button
                  type="button"
                  className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--danger"
                  onClick={() => handleRemoveType(varType.id)}
                  disabled={disabled}
                  title="Remove type"
                >
                  {Icons.delete}
                </button>
              </div>

              {expandedTypeId === varType.id && (
                <div className="cedros-admin__variation-values">
                  <div className="cedros-admin__variation-values-header">
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      Values for "{varType.name}"
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>
                      {varType.values.length}/{maxValuesPerType}
                    </span>
                  </div>

                  {varType.values.length === 0 ? (
                    <div className="cedros-admin__variation-empty" style={{ padding: '8px 0' }}>
                      No values yet. Add values like "Small", "Medium", "Large".
                    </div>
                  ) : (
                    <div className="cedros-admin__variation-value-list">
                      {varType.values.map((val) => (
                        <div key={val.id} className="cedros-admin__variation-value-item">
                          <input
                            type="text"
                            className="cedros-admin__input cedros-admin__input--sm"
                            value={val.label}
                            onChange={(e) =>
                              handleRenameValue(varType.id, val.id, e.target.value)
                            }
                            disabled={disabled}
                          />
                          <button
                            type="button"
                            className="cedros-admin__button cedros-admin__button--ghost cedros-admin__button--icon cedros-admin__button--danger"
                            onClick={() => handleRemoveValue(varType.id, val.id)}
                            disabled={disabled}
                            title="Remove value"
                          >
                            {Icons.close}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {varType.values.length < maxValuesPerType && (
                    <div className="cedros-admin__variation-add-value">
                      <input
                        type="text"
                        className="cedros-admin__input cedros-admin__input--sm"
                        value={newValueLabels[varType.id] || ''}
                        onChange={(e) =>
                          setNewValueLabels((prev) => ({
                            ...prev,
                            [varType.id]: e.target.value,
                          }))
                        }
                        placeholder="Add value..."
                        disabled={disabled}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddValue(varType.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="cedros-admin__button cedros-admin__button--secondary cedros-admin__button--sm"
                        onClick={() => handleAddValue(varType.id)}
                        disabled={disabled || !newValueLabels[varType.id]?.trim()}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {types.length < maxTypes && (
        <div className="cedros-admin__variation-add-type">
          <input
            type="text"
            className="cedros-admin__input"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="New variation type (e.g., Size, Color)"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddType();
              }
            }}
          />
          <button
            type="button"
            className="cedros-admin__button cedros-admin__button--secondary"
            onClick={handleAddType}
            disabled={disabled || !newTypeName.trim()}
          >
            Add Type
          </button>
        </div>
      )}
    </div>
  );
}
