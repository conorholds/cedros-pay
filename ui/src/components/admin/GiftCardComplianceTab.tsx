/**
 * Gift Card Compliance Tab
 *
 * Displays state-specific regulatory guidance for gift card programs:
 * cash-out thresholds, expiration rules, escheatment, and AML caps.
 */

import { useState, useEffect, useCallback } from 'react';
import type { SectionProps } from './types';
import { ConfigApiClient } from './configApi';

// ---------------------------------------------------------------------------
// State regulation data
// ---------------------------------------------------------------------------

interface StateRegulation {
  /** Cash-out threshold in cents (states requiring cash refund for low balances) */
  cashOutCents?: number;
  /** State prohibits gift card expiration entirely */
  expirationProhibited?: boolean;
  /** Escheatment dormancy period in years */
  escheatmentYears?: number;
  /** Additional notes */
  notes?: string;
}

const STATE_REGULATIONS: Record<string, StateRegulation> = {
  CA: { cashOutCents: 1500, expirationProhibited: true, escheatmentYears: 3, notes: 'Cash-out threshold increases to $15 on April 1, 2026.' },
  CO: { cashOutCents: 500, escheatmentYears: 5 },
  CT: { cashOutCents: 300, escheatmentYears: 3 },
  FL: { expirationProhibited: true, escheatmentYears: 5 },
  ME: { cashOutCents: 500, escheatmentYears: 3 },
  MA: { cashOutCents: 500, escheatmentYears: 3, notes: 'Cash-out also required when 90% of value is used.' },
  MT: { cashOutCents: 500, escheatmentYears: 5 },
  NJ: { cashOutCents: 500, escheatmentYears: 3 },
  OR: { cashOutCents: 500, escheatmentYears: 3, notes: 'May require at least one prior transaction.' },
  RI: { cashOutCents: 100, escheatmentYears: 3 },
  TX: { cashOutCents: 250, escheatmentYears: 3 },
  VT: { cashOutCents: 100, escheatmentYears: 3 },
  WA: { cashOutCents: 500, escheatmentYears: 5 },
  PR: { cashOutCents: 500, escheatmentYears: 5 },
};

/** Federal defaults when state has no specific regulation */
const FEDERAL_DEFAULTS: StateRegulation = {
  escheatmentYears: 5,
};

const AML_MAX_CENTS = 1_000_000; // $10,000 FinCEN cap

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GiftCardComplianceTab({ serverUrl, authManager }: SectionProps) {
  const [businessState, setBusinessState] = useState<string | null>(null);
  const [minValueCents, setMinValueCents] = useState<number | null>(null);
  const [maxValueCents, setMaxValueCents] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const api = new ConfigApiClient(serverUrl, undefined, authManager);
      const resp = await api.getConfig('gift_cards');
      const cfg = resp.config ?? {};
      setBusinessState((cfg.business_state as string) || null);
      setMinValueCents(cfg.min_gift_card_value_cents != null ? Number(cfg.min_gift_card_value_cents) : null);
      setMaxValueCents(cfg.max_gift_card_value_cents != null ? Number(cfg.max_gift_card_value_cents) : null);
    } catch {
      // Config may not exist yet — show guidance for unconfigured state
    } finally {
      setIsLoading(false);
    }
  }, [serverUrl, authManager]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>Loading compliance data...</div>;
  }

  const reg = businessState ? (STATE_REGULATIONS[businessState] ?? FEDERAL_DEFAULTS) : null;
  const stateName = businessState ? (STATE_NAMES[businessState] ?? businessState) : null;

  return (
    <div>
      {!businessState ? (
        <NoStateSelected />
      ) : (
        <>
          <h3 className="cedros-admin__section-title" style={{ marginBottom: '1rem' }}>
            Compliance Guidance — {stateName}
          </h3>
          <div style={{ display: 'grid', gap: '1rem', maxWidth: 720 }}>
            <CashOutCard reg={reg!} minValueCents={minValueCents} />
            <ExpirationCard reg={reg!} />
            <EscheatmentCard reg={reg!} />
            <AmlCard maxValueCents={maxValueCents} />
          </div>
          <ComplianceChecklist reg={reg!} minValueCents={minValueCents} maxValueCents={maxValueCents} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NoStateSelected() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ fontSize: 15, opacity: 0.7, marginBottom: '0.5rem' }}>
        No business state configured.
      </p>
      <p style={{ fontSize: 13, opacity: 0.5 }}>
        Set your <strong>business_state</strong> in the Gift Cards config category to see state-specific compliance guidance.
      </p>
    </div>
  );
}

function GuidanceCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid rgba(0,0,0,0.1)',
      borderRadius: 8,
      padding: '1rem 1.25rem',
    }}>
      <h4 style={{ margin: '0 0 0.5rem', fontSize: 14, fontWeight: 600 }}>{title}</h4>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function CashOutCard({ reg, minValueCents }: { reg: StateRegulation; minValueCents: number | null }) {
  if (!reg.cashOutCents) {
    return (
      <GuidanceCard title="Cash-Out Threshold">
        <p style={{ margin: 0 }}>
          Your state does not have a specific cash-out threshold for gift cards.
          Federal law does not require cash redemption.
        </p>
      </GuidanceCard>
    );
  }

  const thresholdDollars = (reg.cashOutCents / 100).toFixed(2);
  const minOk = minValueCents != null && minValueCents > reg.cashOutCents;

  return (
    <GuidanceCard title="Cash-Out Threshold">
      <p style={{ margin: '0 0 0.5rem' }}>
        Your state requires cash redemption for gift cards with a remaining balance
        of <strong>${thresholdDollars}</strong> or less.
      </p>
      <p style={{ margin: '0 0 0.5rem' }}>
        Since this system uses <strong>one-shot full redemption</strong> (entire gift card value is converted
        to credits at once), cash-out is avoided by setting the minimum gift card face value above the threshold.
      </p>
      {minOk ? (
        <StatusBadge ok>Min value (${((minValueCents ?? 0) / 100).toFixed(2)}) exceeds threshold</StatusBadge>
      ) : (
        <StatusBadge ok={false}>
          Set <code>min_gift_card_value_cents</code> above {reg.cashOutCents} to avoid cash-out obligations
        </StatusBadge>
      )}
      {reg.notes && <p style={{ margin: '0.5rem 0 0', opacity: 0.7, fontStyle: 'italic' }}>{reg.notes}</p>}
    </GuidanceCard>
  );
}

function ExpirationCard({ reg }: { reg: StateRegulation }) {
  return (
    <GuidanceCard title="Expiration Rules">
      {reg.expirationProhibited ? (
        <p style={{ margin: 0 }}>
          Your state <strong>prohibits</strong> gift card expiration. Do not set expiration dates on gift cards.
        </p>
      ) : (
        <p style={{ margin: 0 }}>
          Federal law (CARD Act) requires gift cards to remain valid for at least <strong>5 years</strong> from
          purchase or last reload. Your state follows the federal minimum.
        </p>
      )}
    </GuidanceCard>
  );
}

function EscheatmentCard({ reg }: { reg: StateRegulation }) {
  const years = reg.escheatmentYears ?? FEDERAL_DEFAULTS.escheatmentYears;
  return (
    <GuidanceCard title="Escheatment (Unclaimed Property)">
      <p style={{ margin: '0 0 0.5rem' }}>
        Gift card balances unredeemed for <strong>{years} years</strong> may need to be reported
        and remitted to the state as unclaimed property.
      </p>
      <p style={{ margin: 0, opacity: 0.7 }}>
        The system tracks <code>last_activity_at</code> on gift card redemptions to help identify
        dormant balances approaching the escheatment window.
      </p>
    </GuidanceCard>
  );
}

function AmlCard({ maxValueCents }: { maxValueCents: number | null }) {
  const effectiveMax = maxValueCents ?? AML_MAX_CENTS;
  const maxOk = effectiveMax <= AML_MAX_CENTS;
  return (
    <GuidanceCard title="Anti-Money Laundering (AML)">
      <p style={{ margin: '0 0 0.5rem' }}>
        FinCEN requires closed-loop prepaid cards to stay at or below <strong>$10,000</strong> per card.
        The server enforces this cap on product creation.
      </p>
      {maxOk ? (
        <StatusBadge ok>Max value (${(effectiveMax / 100).toFixed(2)}) within AML limit</StatusBadge>
      ) : (
        <StatusBadge ok={false}>
          <code>max_gift_card_value_cents</code> exceeds $10,000 AML cap
        </StatusBadge>
      )}
    </GuidanceCard>
  );
}

function StatusBadge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 500,
      background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.15)',
      color: ok ? '#16a34a' : '#a16207',
    }}>
      <span>{ok ? '\u2713' : '\u26A0'}</span>
      {children}
    </div>
  );
}

function ComplianceChecklist({
  reg,
  minValueCents,
  maxValueCents,
}: {
  reg: StateRegulation;
  minValueCents: number | null;
  maxValueCents: number | null;
}) {
  const effectiveMax = maxValueCents ?? AML_MAX_CENTS;
  const items = [
    {
      label: 'AML: Max card value \u2264 $10,000',
      ok: effectiveMax <= AML_MAX_CENTS,
    },
    ...(reg.cashOutCents
      ? [{
          label: `Cash-out: Min value > $${(reg.cashOutCents / 100).toFixed(2)} threshold`,
          ok: minValueCents != null && minValueCents > reg.cashOutCents,
        }]
      : []),
    {
      label: reg.expirationProhibited
        ? 'Expiration: State prohibits expiration (no action needed)'
        : 'Expiration: Federal 5-year minimum applies',
      ok: true,
    },
    {
      label: `Escheatment: ${reg.escheatmentYears ?? FEDERAL_DEFAULTS.escheatmentYears}-year dormancy tracking enabled`,
      ok: true,
    },
  ];

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: '0.75rem' }}>Compliance Checklist</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ color: item.ok ? '#16a34a' : '#d97706', fontWeight: 600 }}>
              {item.ok ? '\u2713' : '\u26A0'}
            </span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
