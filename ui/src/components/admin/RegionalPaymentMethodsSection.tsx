import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfigApiClient } from './configApi';
import { COUNTRIES, countryName } from './countries';
import { ErrorBanner } from './ErrorBanner';
import { LoadingState } from './LoadingState';
import { CountriesField, FieldGroup } from './productFormControls';
import {
  DEFAULT_REGIONAL_PAYMENT_POLICY,
  effectiveMethodsForCountry,
  PAYMENT_RAILS,
  US_EU_CARDS_POLICY,
  normalizeRegionalPaymentPolicy,
  parseRegionalPaymentPolicy,
  readRegionalPaymentPolicy,
  resolvePaymentRailReadiness,
  validateRegionalPaymentPolicy,
  type PaymentRail,
  type PaymentRailReadiness,
  type RegionalPaymentPolicy,
  type RegionalPaymentRule,
} from './regionalPaymentPolicy';
import { Switch } from './Switch';
import type { SectionProps } from './types';

const RAIL_LABELS: Record<PaymentRail, string> = {
  stripe: 'Credit and debit cards (Stripe)',
  x402: 'Stablecoin (x402)',
  credits: 'Cedros credits',
};

function nextRuleId(rules: RegionalPaymentRule[]): string {
  let index = rules.length + 1;
  while (rules.some((rule) => rule.id === `region-${index}`)) index += 1;
  return `region-${index}`;
}

function RailChoices({
  label,
  methods,
  readiness,
  onChange,
}: {
  label: string;
  methods: PaymentRail[];
  readiness: PaymentRailReadiness;
  onChange: (methods: PaymentRail[]) => void;
}) {
  return (
    <fieldset className="cedros-admin__regional-rails">
      <legend className="cedros-data-label cedros-admin__field-label">{label}</legend>
      {PAYMENT_RAILS.map((rail) => (
        <label key={rail} className="cedros-admin__checkbox-label">
          <input
            type="checkbox"
            checked={methods.includes(rail)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...methods, rail]
                  : methods.filter((method) => method !== rail)
              )
            }
          />
          <span>{RAIL_LABELS[rail]}</span>
          {!readiness[rail] && <span className="cedros-admin__regional-warning">Not ready</span>}
        </label>
      ))}
    </fieldset>
  );
}

function RegionRuleEditor({
  rule,
  readiness,
  onChange,
  onRemove,
}: {
  rule: RegionalPaymentRule;
  readiness: PaymentRailReadiness;
  onChange: (rule: RegionalPaymentRule) => void;
  onRemove: () => void;
}) {
  return (
    <FieldGroup
      title={rule.label || 'New region'}
      description="Countries can appear in only one regional override. Select no methods to block checkout."
    >
      <div className="cedros-admin__regional-rule-header">
        <label className="cedros-data-field cedros-admin__field">
          <span className="cedros-data-label cedros-admin__field-label">Region name</span>
          <input
            className="cedros-data-input cedros-admin__input"
            value={rule.label}
            onChange={(event) => onChange({ ...rule, label: event.target.value })}
          />
        </label>
        <button
          type="button"
          className="cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm"
          onClick={onRemove}
        >
          Remove region
        </button>
      </div>
      <CountriesField
        label="Countries"
        value={rule.countries}
        onChange={(countries) => onChange({ ...rule, countries })}
      />
      <RailChoices
        label="Accepted methods"
        methods={rule.methods}
        readiness={readiness}
        onChange={(methods) => onChange({ ...rule, methods })}
      />
    </FieldGroup>
  );
}

export function RegionalPaymentMethodsSection({ serverUrl, authManager }: SectionProps) {
  const client = useMemo(
    () => new ConfigApiClient(serverUrl, authManager),
    [serverUrl, authManager]
  );
  const [policy, setPolicy] = useState<RegionalPaymentPolicy>(DEFAULT_REGIONAL_PAYMENT_POLICY);
  const [readiness, setReadiness] = useState<PaymentRailReadiness>({
    stripe: false,
    x402: false,
    credits: false,
  });
  const [previewCountry, setPreviewCountry] = useState('US');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadFailed(false);
    try {
      const [shop, stripe, x402, credits] = await Promise.all([
        client.getConfig('shop'),
        client.getConfig('stripe'),
        client.getConfig('x402'),
        client.getConfig('cedros_login'),
      ]);
      const storedPolicy = shop.config.regional_payment_policy;
      if (storedPolicy === undefined || storedPolicy === null) {
        setPolicy(readRegionalPaymentPolicy(undefined));
      } else {
        const parsed = parseRegionalPaymentPolicy(storedPolicy);
        if (!parsed) throw new Error('Stored regional payment availability is invalid.');
        setPolicy(parsed);
      }
      setReadiness(resolvePaymentRailReadiness(
        shop.config,
        stripe.config,
        x402.config,
        credits.config
      ));
    } catch (cause) {
      setLoadFailed(true);
      setError(
        cause instanceof Error ? cause.message : 'Failed to load regional payment availability.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRule = (id: string, next: RegionalPaymentRule) => {
    setSaved(false);
    setPolicy((current) => ({
      ...current,
      rules: current.rules.map((rule) => (rule.id === id ? next : rule)),
    }));
  };

  const save = async () => {
    const validationError = validateRegionalPaymentPolicy(policy);
    if (validationError) {
      setError(validationError);
      return;
    }
    const normalized = normalizeRegionalPaymentPolicy(policy);
    setIsSaving(true);
    setSaved(false);
    setError(null);
    try {
      const validation = await client.validateConfig('shop', {
        regional_payment_policy: normalized,
      });
      if (!validation.valid) throw new Error(validation.errors[0] ?? 'Invalid policy');
      await client.patchConfig(
        'shop',
        { regional_payment_policy: normalized },
        'Updated regional payment availability'
      );
      setPolicy(normalized);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save regional availability.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState label="Loading payment availability…" />;

  const previewMethods = effectiveMethodsForCountry(policy, previewCountry, readiness);

  return (
    <div className="cedros-data-stack cedros-admin__settings cedros-admin__regional-payments">
      <ErrorBanner message={error} onRetry={loadFailed ? load : undefined} />
      {saved && (
        <div className="cedros-data-status cedros-data-status--success" role="status">
          Regional payment availability saved.
        </div>
      )}

      <FieldGroup
        title="Regional payment availability"
        description="Limit one-time storefront payment methods by the shopper's trusted market country."
      >
        <div className="cedros-admin__payment-toggle-row">
          <Switch
            checked={policy.enabled}
            onCheckedChange={(enabledValue) => {
              setSaved(false);
              setPolicy((current) => ({ ...current, enabled: enabledValue }));
            }}
            aria-label="Enable regional payment availability"
          />
          <span className="cedros-admin__payment-toggle-label">
            {policy.enabled ? 'Regional rules on' : 'All globally enabled methods available'}
          </span>
        </div>
        <p className="cedros-admin__field-description">
          A regional rule never enables an unconfigured rail. Unknown countries use the fallback.
        </p>
        <button
          type="button"
          className="cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm"
          onClick={() => {
            setSaved(false);
            setPolicy(structuredClone(US_EU_CARDS_POLICY));
          }}
        >
          Apply US + EU cards preset
        </button>
      </FieldGroup>

      {policy.enabled && (
        <>
          <FieldGroup
            title="Everywhere else"
            description="Used when the trusted country is absent or unmatched. Select no methods to block checkout."
          >
            <RailChoices
              label="Fallback methods"
              methods={policy.fallbackMethods}
              readiness={readiness}
              onChange={(fallbackMethods) => {
                setSaved(false);
                setPolicy((current) => ({ ...current, fallbackMethods }));
              }}
            />
          </FieldGroup>

          {policy.rules.map((rule) => (
            <RegionRuleEditor
              key={rule.id}
              rule={rule}
              readiness={readiness}
              onChange={(next) => updateRule(rule.id, next)}
              onRemove={() => {
                setSaved(false);
                setPolicy((current) => ({
                  ...current,
                  rules: current.rules.filter((item) => item.id !== rule.id),
                }));
              }}
            />
          ))}

          <button
            type="button"
            className="cedros-data-btn cedros-data-btn--secondary"
            onClick={() => {
              setSaved(false);
              setPolicy((current) => ({
                ...current,
                rules: [
                  ...current.rules,
                  {
                    id: nextRuleId(current.rules),
                    label: 'New region',
                    countries: [],
                    methods: ['x402'],
                  },
                ],
              }));
            }}
          >
            Add region
          </button>
        </>
      )}

      <FieldGroup title="Preview" description="Check the methods a storefront will receive.">
        <label className="cedros-data-field cedros-admin__field">
          <span className="cedros-data-label cedros-admin__field-label">Market country</span>
          <select
            className="cedros-data-select cedros-admin__select"
            value={previewCountry}
            onChange={(event) => setPreviewCountry(event.target.value)}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>{country.name}</option>
            ))}
          </select>
        </label>
        <p>
          {countryName(previewCountry)}: {previewMethods.length > 0
            ? previewMethods.map((rail) => RAIL_LABELS[rail]).join(', ')
            : 'No payment methods available'}
        </p>
      </FieldGroup>

      <div className="cedros-admin__form-actions">
        <button
          type="button"
          className="cedros-data-btn cedros-data-btn--primary"
          onClick={() => void save()}
          disabled={isSaving || loadFailed}
        >
          {isSaving ? 'Saving…' : 'Save availability'}
        </button>
      </div>
    </div>
  );
}
