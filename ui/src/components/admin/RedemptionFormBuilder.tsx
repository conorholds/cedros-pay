/**
 * RedemptionFormBuilder — visual form builder for admin to define redemption
 * fields per asset class. value=null means the form is disabled.
 */

import { useState } from 'react';

export interface RedemptionField {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  options: string[];
  placeholder?: string;
}

export interface RedemptionConfig {
  fields: RedemptionField[];
  instructions?: string;
  requiresApproval: boolean;
  estimatedProcessingDays?: number;
}

interface RedemptionFormBuilderProps {
  value: RedemptionConfig | null;
  onChange: (config: RedemptionConfig | null) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'address', label: 'Address' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'file_upload', label: 'File Upload' },
];

const EMPTY_CONFIG: RedemptionConfig = { fields: [], requiresApproval: true };
const S_INPUT = { width: '100%', padding: '0.4rem 0.6rem', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: '0.9rem', boxSizing: 'border-box' as const };
const S_LABEL = { display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 } as const;
const S_BTN   = { padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid rgba(0,0,0,0.2)', background: 'white', cursor: 'pointer', fontSize: '0.85rem' } as const;

function newField(): RedemptionField {
  return { id: Math.random().toString(36).slice(2), label: '', fieldType: 'text', required: false, options: [], placeholder: '' };
}

function FieldEditor({ field, onSave, onCancel }: { field: RedemptionField; onSave: (f: RedemptionField) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<RedemptionField>(field);
  const [newOpt, setNewOpt] = useState('');
  const set = (p: Partial<RedemptionField>) => setDraft(d => ({ ...d, ...p }));
  const addOpt = () => { const t = newOpt.trim(); if (!t) return; set({ options: [...draft.options, t] }); setNewOpt(''); };

  return (
    <div style={{ padding: '0.75rem', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 6, background: '#eff6ff', marginTop: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
        <div>
          <label style={S_LABEL}>Label *</label>
          <input style={S_INPUT} value={draft.label} onChange={e => set({ label: e.target.value })} placeholder="e.g., Full Name" />
        </div>
        <div>
          <label style={S_LABEL}>Field Type</label>
          <select style={S_INPUT} value={draft.fieldType} onChange={e => set({ fieldType: e.target.value, options: [] })}>
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.6rem', alignItems: 'end', marginBottom: '0.6rem' }}>
        <div>
          <label style={S_LABEL}>Placeholder</label>
          <input style={S_INPUT} value={draft.placeholder ?? ''} onChange={e => set({ placeholder: e.target.value })} placeholder="Optional hint text" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', paddingBottom: 2 }}>
          <input type="checkbox" checked={draft.required} onChange={e => set({ required: e.target.checked })} /> Required
        </label>
      </div>
      {draft.fieldType === 'dropdown' && (
        <div style={{ marginBottom: '0.6rem' }}>
          <label style={S_LABEL}>Options</label>
          {draft.options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <span style={{ flex: 1, fontSize: '0.85rem', padding: '0.25rem 0.5rem', background: 'white', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 4 }}>{opt}</span>
              <button type="button" onClick={() => set({ options: draft.options.filter((_, j) => j !== i) })} style={{ padding: '0.2rem 0.5rem', borderRadius: 4, border: '1px solid rgba(0,0,0,0.2)', background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#dc2626' }}>x</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ ...S_INPUT, flex: 1 }} value={newOpt} onChange={e => setNewOpt(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOpt())} placeholder="Add option..." />
            <button type="button" onClick={addOpt} style={S_BTN}>Add</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={() => onSave(draft)} disabled={!draft.label.trim()} style={{ padding: '0.35rem 1rem', borderRadius: 6, border: 'none', background: '#2563eb', color: 'white', cursor: draft.label.trim() ? 'pointer' : 'not-allowed', fontSize: '0.85rem', opacity: draft.label.trim() ? 1 : 0.5 }}>
          Save Field
        </button>
        <button type="button" onClick={onCancel} style={S_BTN}>Cancel</button>
      </div>
    </div>
  );
}

function FieldPreview({ fields, instructions }: { fields: RedemptionField[]; instructions?: string }) {
  const s = { ...S_INPUT, fontSize: '0.85rem', background: 'white', opacity: 0.6 };
  return (
    <div style={{ padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Preview — Redeemer View</div>
      {instructions && <div style={{ padding: '0.6rem 0.75rem', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, fontSize: '0.85rem', marginBottom: '0.75rem', color: '#92400e' }}>{instructions}</div>}
      {fields.length === 0 && <div style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.35)', fontStyle: 'italic' }}>No fields added yet.</div>}
      {fields.map(f => (
        <div key={f.id} style={{ marginBottom: '0.6rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 4 }}>
            {f.label || 'Unlabelled field'}{f.required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
          </label>
          {f.fieldType === 'textarea'    && <textarea disabled rows={2} placeholder={f.placeholder ?? ''} style={{ ...s, resize: 'none' } as React.CSSProperties} />}
          {f.fieldType === 'file_upload' && <div style={{ padding: '0.5rem', border: '1px dashed rgba(0,0,0,0.25)', borderRadius: 4, fontSize: '0.8rem', color: 'rgba(0,0,0,0.4)', textAlign: 'center' }}>File upload</div>}
          {f.fieldType === 'dropdown'    && <select disabled style={s as React.CSSProperties}><option>{f.placeholder || 'Select...'}</option>{f.options.map((o, i) => <option key={i}>{o}</option>)}</select>}
          {!['textarea','file_upload','dropdown'].includes(f.fieldType) && <input disabled type={f.fieldType === 'email' ? 'email' : f.fieldType === 'phone' ? 'tel' : 'text'} placeholder={f.placeholder ?? ''} style={s as React.CSSProperties} />}
        </div>
      ))}
    </div>
  );
}

export function RedemptionFormBuilder({ value, onChange }: RedemptionFormBuilderProps) {
  const enabled = value !== null;
  const config  = value ?? EMPTY_CONFIG;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending,   setPending]   = useState<RedemptionField | null>(null);
  const [showPrev,  setShowPrev]  = useState(false);

  const update = (patch: Partial<RedemptionConfig>) => onChange({ ...config, ...patch });
  const cancelEdit = () => { setEditingId(null); setPending(null); };

  const handleToggle = (on: boolean) => {
    onChange(on ? { ...EMPTY_CONFIG } : null);
    cancelEdit();
  };

  const startAdd  = () => { const f = newField(); setPending(f); setEditingId('new'); };
  const startEdit = (f: RedemptionField) => { setPending({ ...f }); setEditingId(f.id); };

  const saveField = (saved: RedemptionField) => {
    update({ fields: editingId === 'new' ? [...config.fields, saved] : config.fields.map(f => f.id === saved.id ? saved : f) });
    cancelEdit();
  };

  const deleteField = (id: string) => {
    if (editingId === id) cancelEdit();
    update({ fields: config.fields.filter(f => f.id !== id) });
  };

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: enabled ? '1rem' : 4, fontSize: '0.9rem', fontWeight: 500 }}>
        <input type="checkbox" checked={enabled} onChange={e => handleToggle(e.target.checked)} />
        Enable Redemption Form
      </label>
      {!enabled && <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.4)' }}>No redemption form — token holders cannot request physical redemption.</div>}

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={S_LABEL}>Instructions shown to redeemer</label>
            <textarea value={config.instructions ?? ''} onChange={e => update({ instructions: e.target.value || undefined })} placeholder="Describe requirements, turnaround times, etc." rows={3} style={{ ...S_INPUT, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1rem', alignItems: 'center', padding: '0.6rem 0.75rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, background: 'rgba(0,0,0,0.02)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={config.requiresApproval} onChange={e => update({ requiresApproval: e.target.checked })} /> Requires admin approval
            </label>
            <div>
              <label style={S_LABEL}>Estimated processing days</label>
              <input type="number" min={0} value={config.estimatedProcessingDays ?? ''} onChange={e => update({ estimatedProcessingDays: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g., 5" style={{ ...S_INPUT, maxWidth: 120 }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.5rem' }}>Form Fields ({config.fields.length})</div>
            {config.fields.length === 0 && editingId !== 'new' && <div style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.35)', fontStyle: 'italic', marginBottom: '0.5rem' }}>No fields yet. Add fields below.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {config.fields.map(f => (
                <div key={f.id}>
                  <div style={{ padding: '0.5rem 0.75rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.9rem' }}>{f.label || <em style={{ color: 'rgba(0,0,0,0.35)' }}>Unlabelled</em>}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 10, background: '#dbeafe', color: '#1d4ed8', fontSize: '0.75rem' }}>{FIELD_TYPES.find(t => t.value === f.fieldType)?.label ?? f.fieldType}</span>
                      {f.required && <span style={{ padding: '2px 8px', borderRadius: 10, background: '#fef3c7', color: '#92400e', fontSize: '0.75rem' }}>required</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" onClick={() => startEdit(f)} style={{ ...S_BTN, padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}>Edit</button>
                      <button type="button" onClick={() => deleteField(f.id)} style={{ padding: '0.25rem 0.6rem', borderRadius: 4, border: '1px solid rgba(220,38,38,0.3)', background: 'white', cursor: 'pointer', fontSize: '0.8rem', color: '#dc2626' }}>Delete</button>
                    </div>
                  </div>
                  {editingId === f.id && pending && <FieldEditor field={pending} onSave={saveField} onCancel={cancelEdit} />}
                </div>
              ))}
              {editingId === 'new' && pending && <FieldEditor field={pending} onSave={saveField} onCancel={cancelEdit} />}
            </div>
            {editingId === null && <button type="button" onClick={startAdd} style={{ ...S_BTN, marginTop: '0.5rem' }}>+ Add Field</button>}
          </div>

          <div>
            <button type="button" onClick={() => setShowPrev(p => !p)} style={{ ...S_BTN, background: showPrev ? 'rgba(0,0,0,0.05)' : 'white' }}>
              {showPrev ? 'Hide Preview' : 'Show Preview'}
            </button>
            {showPrev && <div style={{ marginTop: '0.75rem' }}><FieldPreview fields={config.fields} instructions={config.instructions} /></div>}
          </div>
        </div>
      )}
    </div>
  );
}
