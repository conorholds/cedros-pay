/**
 * RedemptionForm
 *
 * Buyer-facing component rendered post-purchase so the buyer can submit
 * redemption information for a tokenized asset product.
 *
 * @param serverUrl  - Base URL of the Cedros Pay server.
 * @param productId  - The product for which redemption info is collected.
 * @param authToken  - Optional Bearer token for authenticated requests.
 *
 * Fetches form config from GET /paywall/v1/asset-redemption/:productId/form,
 * also checks existing submission status on mount. Submits to
 * POST /paywall/v1/asset-redemption/:productId/submit.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

// --------------------------------------------------------------------------
// Types (mirroring the server response shapes)
// --------------------------------------------------------------------------

interface RedemptionField {
  id: string;
  label: string;
  fieldType: 'text' | 'email' | 'phone' | 'address' | 'file_upload' | 'dropdown' | 'textarea';
  required?: boolean;
  options?: string[];      // for dropdown
  placeholder?: string;
}

interface RedemptionConfig {
  fields: RedemptionField[];
  instructions?: string;
  requiresApproval?: boolean;
  estimatedProcessingDays?: number;
}

interface FormResponse {
  productId: string;
  collectionId: string;
  assetClass: string;
  redemptionConfig: RedemptionConfig | null;
}

interface StatusResponse {
  redemptions: Array<{ status: string; redemptionId: string }>;
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function buildHeaders(authToken?: string): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    info_submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    processing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  };
  const label = status.replace(/_/g, ' ');
  return <Badge className={map[status] ?? 'bg-neutral-100 text-neutral-700'}>{label}</Badge>;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: RedemptionField;
  value: string;
  onChange: (val: string) => void;
}) {
  const base = 'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500';

  if (field.fieldType === 'dropdown' && field.options?.length) {
    return (
      <select
        id={field.id}
        required={field.required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      >
        <option value="">Select…</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.fieldType === 'address' || field.fieldType === 'textarea') {
    return (
      <textarea
        id={field.id}
        required={field.required}
        value={value}
        placeholder={field.placeholder}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className={cn(base, 'resize-y')}
      />
    );
  }

  if (field.fieldType === 'file_upload') {
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) { onChange(''); return; }
      // Cap at 1.5 MB raw — base64 expands ~33%, server body limit is 2 MB
      if (file.size > 1.5 * 1024 * 1024) { onChange(''); e.target.value = ''; alert('File must be under 1.5 MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        // Sanitize filename: keep only safe characters, cap length
        const safeName = file.name.replace(/[^a-zA-Z0-9._\-() ]/g, '_').slice(0, 200);
        // Store as structured JSON so the delimiter cannot be injected
        onChange(JSON.stringify({ name: safeName, data: b64 }));
      };
      reader.readAsDataURL(file);
    };
    return (
      <input
        id={field.id}
        type="file"
        required={field.required}
        onChange={handleFile}
        className="w-full text-sm text-neutral-700 file:mr-3 file:rounded file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:text-neutral-300 dark:file:bg-neutral-800 dark:file:text-neutral-200"
      />
    );
  }

  const typeMap: Record<string, string> = { email: 'email', phone: 'tel', text: 'text' };
  return (
    <input
      id={field.id}
      type={typeMap[field.fieldType] ?? 'text'}
      required={field.required}
      value={value}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={base}
    />
  );
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------

export interface RedemptionFormProps {
  serverUrl: string;
  productId: string;
  /** Optional auth token for authenticated requests */
  authToken?: string;
}

type ViewState = 'loading' | 'no_config' | 'already_submitted' | 'form' | 'success';

export function RedemptionForm({ serverUrl, productId, authToken }: RedemptionFormProps) {
  const [view, setView] = React.useState<ViewState>('loading');
  const [config, setConfig] = React.useState<RedemptionConfig | null>(null);
  const [existingStatus, setExistingStatus] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const setField = React.useCallback((id: string, val: string) => {
    setFormData((prev) => ({ ...prev, [id]: val }));
  }, []);

  // Poll redemption status every 30s when already submitted or just submitted
  React.useEffect(() => {
    if (view !== 'already_submitted' && view !== 'success') return;
    const headers = buildHeaders(authToken);
    const poll = async () => {
      try {
        const res = await fetch(`${serverUrl}/paywall/v1/asset-redemption/${productId}/status`, { headers });
        if (!res.ok) return;
        const data: StatusResponse = await res.json();
        if (data.redemptions?.length) {
          setExistingStatus(data.redemptions[0]!.status);
          if (view === 'success') setView('already_submitted');
        }
      } catch { /* non-critical polling failure */ }
    };
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [view, serverUrl, productId, authToken]);

  React.useEffect(() => {
    let cancelled = false;
    const headers = buildHeaders(authToken);

    async function load() {
      try {
        // Check for existing submission first
        const statusRes = await fetch(`${serverUrl}/paywall/v1/asset-redemption/${productId}/status`, { headers });
        if (!cancelled && statusRes.ok) {
          const statusData: StatusResponse = await statusRes.json();
          if (statusData.redemptions?.length) {
            setExistingStatus(statusData.redemptions[0]!.status);
            setView('already_submitted');
            return;
          }
        }

        // Load form config
        const formRes = await fetch(`${serverUrl}/paywall/v1/asset-redemption/${productId}/form`, { headers });
        if (cancelled) return;
        if (!formRes.ok) throw new Error(`Server error: ${formRes.status}`);

        const data: FormResponse = await formRes.json();
        if (!data.redemptionConfig) {
          setView('no_config');
          return;
        }
        setConfig(data.redemptionConfig);
        setView('form');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load redemption form.');
          setView('form');
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [serverUrl, productId, authToken]);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch(`${serverUrl}/paywall/v1/asset-redemption/${productId}/submit`, {
          method: 'POST',
          headers: buildHeaders(authToken),
          body: JSON.stringify({ formData }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `Server error: ${res.status}`);
        }
        setView('success');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [serverUrl, productId, authToken, formData]
  );

  if (view === 'loading') {
    return (
      <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Loading redemption form...
      </div>
    );
  }

  if (view === 'no_config') {
    return (
      <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Redemption not available for this product.
      </div>
    );
  }

  if (view === 'already_submitted') {
    return (
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Redemption request status</p>
        {existingStatus ? <StatusBadge status={existingStatus} /> : null}
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          You have already submitted redemption information. We will notify you of any updates.
        </p>
      </div>
    );
  }

  if (view === 'success') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
        Redemption submitted! You will be notified when reviewed.
      </div>
    );
  }

  // form view
  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
      {config?.instructions ? (
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{config.instructions}</p>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {config?.fields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label htmlFor={field.id} className="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {field.label}
            {field.required ? <span className="ml-1 text-red-500" aria-hidden="true">*</span> : null}
          </label>
          <FieldInput field={field} value={formData[field.id] ?? ''} onChange={(val) => setField(field.id, val)} />
        </div>
      ))}

      {config?.estimatedProcessingDays ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Estimated processing time: {config.estimatedProcessingDays} business day{config.estimatedProcessingDays !== 1 ? 's' : ''}.
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit redemption info'}
      </Button>
    </form>
  );
}
