import { useId, type ReactNode } from 'react';
import { AutosaveStatusIndicator } from '../../autosave';
import { Switch } from './Switch';
import { adminSectionHref } from './adminTabRouting';
import {
  COMMERCE_FEATURE_KEYS,
  type CommerceFeatureFlags,
  type CommerceFeatureKey,
} from './commerceFeatureSettings';
import type { AutosaveStatus } from './useAutosave';

export type OverviewSaveState = AutosaveStatus;

/** One line per workflow: what leaving it on does for a buyer. */
const FEATURE_COPY: Record<CommerceFeatureKey, { title: string; hint: ReactNode }> = {
  subscriptions: {
    title: 'Subscriptions',
    hint: (
      <>
        Recurring plans, pricing, and page copy live in{' '}
        <AdminRouteLink sectionId="catalog" tabId="subscriptions">Catalog</AdminRouteLink>.
      </>
    ),
  },
  refunds: { title: 'Refunds', hint: 'Buyers can request refunds and you review them.' },
  returns: { title: 'Returns', hint: 'Buyers can request returns and you review them.' },
  inventory: { title: 'Inventory', hint: 'Stock counts track and block oversold checkouts.' },
  coupons: { title: 'Coupons', hint: 'Buyers can redeem discount codes at checkout.' },
  shipping: { title: 'Shipping', hint: 'Checkout collects a shipping address for physical goods.' },
  taxes: { title: 'Taxes', hint: 'Checkout applies your configured tax rates.' },
};

function AdminRouteLink({
  children,
  sectionId,
  tabId,
}: {
  children: ReactNode;
  sectionId: string;
  tabId: string;
}) {
  return (
    <a
      className="cedros-admin__field-help"
      href={adminSectionHref(sectionId, tabId)}
      data-section-id={`cedros-pay:${sectionId}`}
      data-tab-id={`cedros-pay:${tabId}`}
    >
      {children}
    </a>
  );
}

function AutosaveLabel({ state }: { state: OverviewSaveState }) {
  return (
    <AutosaveStatusIndicator
      status={state}
      className={`cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${statusClass(state)}`}
    />
  );
}

function statusClass(state: OverviewSaveState): string {
  if (state === 'failed') return 'error';
  return state;
}

/**
 * Resting report for the workflow list: an operator confirms what is on
 * without expanding the editor, so the disclosure hides controls, not state.
 */
export function summarizeCommerceFeatures(
  flags: CommerceFeatureFlags,
  unavailableFeatures: CommerceFeatureKey[] = []
): { on: string[]; off: string[]; unavailable: string[] } {
  const unavailable = new Set(unavailableFeatures);
  const on: string[] = [];
  const off: string[] = [];
  const blocked: string[] = [];
  for (const key of COMMERCE_FEATURE_KEYS) {
    const { title } = FEATURE_COPY[key];
    if (unavailable.has(key)) blocked.push(title);
    else if (flags[key]) on.push(title);
    else off.push(title);
  }
  return { on, off, unavailable: blocked };
}

function SwitchRow({
  checked,
  disabled,
  hint,
  onChange,
  saveState,
  title,
  unavailable,
}: {
  checked: boolean;
  disabled: boolean;
  hint: ReactNode;
  onChange: (checked: boolean) => void;
  saveState: OverviewSaveState;
  title: string;
  unavailable: boolean;
}) {
  const hintId = useId();
  return (
    <div
      className={`cedros-admin__switch-row ${unavailable ? 'cedros-admin__switch-row--unavailable' : ''}`}
    >
      <div className="cedros-admin__switch-row-text">
        <span className="cedros-admin__switch-row-label">{title}</span>
        <span className="cedros-admin__switch-row-hint" id={hintId}>
          {unavailable ? 'This workflow isn’t supported for this site yet.' : hint}
        </span>
      </div>
      <div className="cedros-admin__payment-toggle-row">
        <AutosaveLabel state={saveState} />
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled || unavailable}
          aria-label={`Turn ${title} on or off`}
          aria-describedby={hintId}
        />
      </div>
    </div>
  );
}

export function CommerceFeaturesList({
  disabled,
  flags,
  onChange,
  saveState,
  statusFeature,
  unavailableFeatures = [],
}: {
  disabled: boolean;
  flags: CommerceFeatureFlags;
  onChange: (key: CommerceFeatureKey, checked: boolean) => void;
  saveState: OverviewSaveState;
  statusFeature: CommerceFeatureKey | null;
  unavailableFeatures?: CommerceFeatureKey[];
}) {
  return (
    <div className="cedros-admin__switch-rows">
      {COMMERCE_FEATURE_KEYS.map((key) => (
        <SwitchRow
          key={key}
          title={FEATURE_COPY[key].title}
          hint={FEATURE_COPY[key].hint}
          checked={flags[key]}
          disabled={disabled}
          unavailable={unavailableFeatures.includes(key)}
          saveState={statusFeature === key ? saveState : 'idle'}
          onChange={(checked) => onChange(key, checked)}
        />
      ))}
    </div>
  );
}
