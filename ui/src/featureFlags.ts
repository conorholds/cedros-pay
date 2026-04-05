type FeatureFlagStage = 'experimental' | 'stable';

type FeatureFlagRegistryInput = Record<
  string,
  {
    description: string;
    default: boolean;
    stage?: FeatureFlagStage;
  }
>;

type FeatureFlagRegistry<T extends FeatureFlagRegistryInput> = {
  readonly [K in keyof T]: {
    readonly name: K & string;
    readonly description: T[K]['description'];
    readonly default: T[K]['default'];
    readonly stage: T[K]['stage'] extends FeatureFlagStage ? T[K]['stage'] : 'experimental';
    readonly envVar: string;
  };
};

export type FeatureFlagEnv = Record<string, string | undefined>;

function toEnvVarName(flagName: string): string {
  const normalized = flagName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return `CEDROS_FEATURE_${normalized}`;
}

function defineFeatureFlagRegistry<const T extends FeatureFlagRegistryInput>(
  registry: T
): FeatureFlagRegistry<T> {
  const entries = Object.entries(registry).map(([name, definition]) => [
    name,
    {
      name,
      description: definition.description,
      default: definition.default,
      stage: definition.stage ?? 'experimental',
      envVar: toEnvVarName(name),
    },
  ]);

  return Object.freeze(Object.fromEntries(entries)) as FeatureFlagRegistry<T>;
}

export const FEATURE_FLAG_REGISTRY = defineFeatureFlagRegistry({
  complianceCheck: {
    description: 'Enable pre-flight compliance checks before Stripe checkout.',
    default: false,
    stage: 'stable',
  },
});

export type FeatureFlagName = keyof typeof FEATURE_FLAG_REGISTRY;
export type FeatureFlagDefinition = (typeof FEATURE_FLAG_REGISTRY)[FeatureFlagName];
export type FeatureFlagOverrides = Partial<Record<FeatureFlagName, boolean>>;
export type ResolvedFeatureFlags = Record<FeatureFlagName, boolean>;

export const FEATURE_FLAG_NAMES = Object.freeze(
  Object.keys(FEATURE_FLAG_REGISTRY) as FeatureFlagName[]
);

function getDefaultEnv(): FeatureFlagEnv {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as FeatureFlagEnv;
  }
  return {};
}

function assertValidFeatureFlagOverrides(
  overrides: Record<string, unknown> | undefined,
  label: string
): asserts overrides is FeatureFlagOverrides {
  if (!overrides) return;

  for (const [key, value] of Object.entries(overrides)) {
    if (!(key in FEATURE_FLAG_REGISTRY)) {
      throw new Error(`Unknown feature flag "${key}" in ${label}`);
    }
    if (typeof value !== 'boolean') {
      throw new Error(`Feature flag "${key}" in ${label} must be a boolean`);
    }
  }
}

export function parseFeatureFlagBoolean(value: string | undefined): boolean | undefined {
  if (value == null) return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return undefined;
}

export function getFeatureFlagDefinition(name: FeatureFlagName): FeatureFlagDefinition {
  return FEATURE_FLAG_REGISTRY[name];
}

export function getFeatureFlagDefinitions(): FeatureFlagDefinition[] {
  return FEATURE_FLAG_NAMES.map((name) => FEATURE_FLAG_REGISTRY[name]);
}

export type ResolveFeatureFlagsOptions = {
  featureFlags?: FeatureFlagOverrides;
  env?: FeatureFlagEnv;
  fallbackFlags?: FeatureFlagOverrides;
};

export function resolveFeatureFlags(
  options: ResolveFeatureFlagsOptions = {}
): ResolvedFeatureFlags {
  const env = options.env ?? getDefaultEnv();
  assertValidFeatureFlagOverrides(
    options.featureFlags as Record<string, unknown> | undefined,
    'featureFlags'
  );
  assertValidFeatureFlagOverrides(
    options.fallbackFlags as Record<string, unknown> | undefined,
    'fallbackFlags'
  );

  const resolved = {} as ResolvedFeatureFlags;

  for (const name of FEATURE_FLAG_NAMES) {
    const runtimeOverride = options.featureFlags?.[name];
    const fallbackOverride = options.fallbackFlags?.[name];
    const envOverride = parseFeatureFlagBoolean(env[FEATURE_FLAG_REGISTRY[name].envVar]);

    resolved[name] =
      runtimeOverride ??
      fallbackOverride ??
      envOverride ??
      FEATURE_FLAG_REGISTRY[name].default;
  }

  return resolved;
}

export function isFeatureEnabled(
  name: FeatureFlagName,
  options: ResolveFeatureFlagsOptions = {}
): boolean {
  return resolveFeatureFlags(options)[name];
}

export function validateFeatureFlagOverrides(
  overrides: Record<string, unknown> | undefined,
  label = 'featureFlags'
): void {
  assertValidFeatureFlagOverrides(overrides, label);
}
