export const PAYMENT_RAILS = ['stripe', 'x402', 'credits'] as const;

export type PaymentRail = (typeof PAYMENT_RAILS)[number];
export type PaymentRailReadiness = Record<PaymentRail, boolean>;

export interface RegionalPaymentRule {
  id: string;
  label: string;
  countries: string[];
  methods: PaymentRail[];
}

export interface RegionalPaymentPolicy {
  schemaVersion: 1;
  enabled: boolean;
  fallbackMethods: PaymentRail[];
  rules: RegionalPaymentRule[];
}

export const DEFAULT_REGIONAL_PAYMENT_POLICY: RegionalPaymentPolicy = {
  schemaVersion: 1,
  enabled: false,
  fallbackMethods: [...PAYMENT_RAILS],
  rules: [],
};

const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE',
];

export const US_EU_CARDS_POLICY: RegionalPaymentPolicy = {
  schemaVersion: 1,
  enabled: true,
  fallbackMethods: ['x402'],
  rules: [
    {
      id: 'us-eu-cards',
      label: 'United States and European Union',
      countries: ['US', ...EU_COUNTRIES].sort(),
      methods: ['stripe', 'x402'],
    },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function present(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function storedObject(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function snapshotReadiness(shop: Record<string, unknown>): PaymentRailReadiness | null {
  const snapshot = storedObject(shop.payment_availability_snapshot);
  const methods = snapshot && isRecord(snapshot.paymentMethods) ? snapshot.paymentMethods : null;
  if (!methods) return null;
  const available = (rail: PaymentRail): boolean | null => {
    const value = methods[rail];
    return isRecord(value) && typeof value.available === 'boolean' ? value.available : null;
  };
  const stripe = available('stripe');
  const x402 = available('x402');
  const credits = available('credits');
  return stripe === null || x402 === null || credits === null
    ? null
    : { stripe, x402, credits };
}

/** Resolve executable rail readiness from the packaged host snapshot when
 * available, otherwise from standalone minimum execution configuration. */
export function resolvePaymentRailReadiness(
  shop: Record<string, unknown>,
  stripe: Record<string, unknown>,
  x402: Record<string, unknown>,
  credits: Record<string, unknown>
): PaymentRailReadiness {
  return snapshotReadiness(shop) ?? {
    stripe: stripe.enabled === true
      && present(stripe.publishable_key)
      && present(stripe.secret_key),
    x402: x402.enabled === true
      && present(x402.payment_address)
      && present(x402.token_mint)
      && present(x402.rpc_url),
    credits: credits.enabled === true
      && credits.credits_enabled === true,
  };
}

function readMethods(value: unknown): PaymentRail[] | null {
  if (!Array.isArray(value)) return null;
  const methods = value.filter((item): item is PaymentRail =>
    PAYMENT_RAILS.includes(item as PaymentRail)
  );
  return methods.length === value.length
    ? PAYMENT_RAILS.filter((method) => methods.includes(method))
    : null;
}

function readRule(value: unknown): RegionalPaymentRule | null {
  if (!isRecord(value) || !Array.isArray(value.countries)) return null;
  const methods = readMethods(value.methods);
  const countries = value.countries.filter((item): item is string => typeof item === 'string');
  if (
    typeof value.id !== 'string' ||
    typeof value.label !== 'string' ||
    countries.length !== value.countries.length ||
    !methods
  ) return null;
  return {
    id: value.id,
    label: value.label,
    countries: countries.map((country) => country.toUpperCase()).sort(),
    methods,
  };
}

export function parseRegionalPaymentPolicy(value: unknown): RegionalPaymentPolicy | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.enabled !== 'boolean') {
    return null;
  }
  const fallbackMethods = readMethods(value.fallbackMethods);
  if (!fallbackMethods || !Array.isArray(value.rules)) {
    return null;
  }
  const rules = value.rules.map(readRule);
  if (rules.some((rule) => !rule)) return null;
  const policy: RegionalPaymentPolicy = {
    schemaVersion: 1,
    enabled: value.enabled,
    fallbackMethods,
    rules: rules as RegionalPaymentRule[],
  };
  return validateRegionalPaymentPolicy(policy) ? null : policy;
}

export function readRegionalPaymentPolicy(value: unknown): RegionalPaymentPolicy {
  return parseRegionalPaymentPolicy(value) ?? {
    ...DEFAULT_REGIONAL_PAYMENT_POLICY,
    fallbackMethods: [...DEFAULT_REGIONAL_PAYMENT_POLICY.fallbackMethods],
  };
}

export function normalizeRegionalPaymentPolicy(
  policy: RegionalPaymentPolicy
): RegionalPaymentPolicy {
  return {
    schemaVersion: 1,
    enabled: policy.enabled,
    fallbackMethods: PAYMENT_RAILS.filter((method) => policy.fallbackMethods.includes(method)),
    rules: policy.rules
      .map((rule) => ({
        id: rule.id.trim(),
        label: rule.label.trim(),
        countries: [...new Set(rule.countries.map((country) => country.toUpperCase()))].sort(),
        methods: PAYMENT_RAILS.filter((method) => rule.methods.includes(method)),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function validateRegionalPaymentPolicy(policy: RegionalPaymentPolicy): string | null {
  const normalized = normalizeRegionalPaymentPolicy(policy);
  const ids = new Set<string>();
  const countries = new Set<string>();
  for (const rule of normalized.rules) {
    if (!rule.id || !rule.label) return 'Every region needs a name.';
    if (rule.id.length > 64) return 'Region identifiers must be 64 characters or fewer.';
    if (rule.label.length > 100) return 'Region names must be 100 characters or fewer.';
    if (ids.has(rule.id)) return 'Every region needs a unique identifier.';
    if (rule.countries.length === 0) return `${rule.label} needs at least one country.`;
    ids.add(rule.id);
    for (const country of rule.countries) {
      if (!/^[A-Z]{2}$/.test(country)) return `${country} is not an ISO alpha-2 country code.`;
      if (countries.has(country)) return `${country} can belong to only one region.`;
      countries.add(country);
    }
  }
  return null;
}

export function methodsForCountry(
  policy: RegionalPaymentPolicy,
  country: string | null
): PaymentRail[] {
  if (!policy.enabled) return [...PAYMENT_RAILS];
  return policy.rules.find((rule) => country && rule.countries.includes(country))?.methods ??
    policy.fallbackMethods;
}

export function effectiveMethodsForCountry(
  policy: RegionalPaymentPolicy,
  country: string | null,
  readiness: PaymentRailReadiness
): PaymentRail[] {
  return methodsForCountry(policy, country).filter((method) => readiness[method]);
}
