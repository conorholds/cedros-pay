import type {
  AvailablePaymentAdapters,
  OrchestratedPaymentMethod,
  PaymentPolicyContext,
  PaymentPolicyFailure,
  PaymentPolicyResolution,
  StorefrontRegion,
} from '../types/storePolicy';

const STRICT_DEFAULT = true;
const STOREFRONT_DEFAULT: StorefrontRegion = 'unknown';

const EXTERNAL_RAIL_ORDER: readonly OrchestratedPaymentMethod[] = [
  'stripe',
  'x402',
  'crypto',
  'credits',
];

function getExternalRails(
  availableAdapters: AvailablePaymentAdapters
): OrchestratedPaymentMethod[] {
  return EXTERNAL_RAIL_ORDER.filter((method) => availableAdapters[method]);
}

function uniqueMethods(
  methods: OrchestratedPaymentMethod[]
): OrchestratedPaymentMethod[] {
  return Array.from(new Set(methods));
}

function appleUsExternalPurchaseAllowed(context: PaymentPolicyContext): boolean {
  return (
    context.distributionChannel === 'apple_app_store' &&
    (context.storefrontRegion ?? STOREFRONT_DEFAULT) === 'us' &&
    context.programs?.apple?.usStorefrontExternalPurchaseLink === true
  );
}

function appleReaderExternalPurchaseAllowed(
  context: PaymentPolicyContext
): boolean {
  const storefrontRegion = context.storefrontRegion ?? STOREFRONT_DEFAULT;
  return (
    context.distributionChannel === 'apple_app_store' &&
    (context.programs?.apple?.readerExternalLinkAccount === true ||
      storefrontRegion === 'us')
  );
}

function googleUserChoiceBillingAllowed(
  context: PaymentPolicyContext
): boolean {
  return (
    context.distributionChannel === 'google_play_store' &&
    (context.storefrontRegion ?? STOREFRONT_DEFAULT) !== 'unknown' &&
    context.programs?.google?.userChoiceBilling === true
  );
}

function googleAlternativeBillingOnlyAllowed(
  context: PaymentPolicyContext
): boolean {
  return (
    context.distributionChannel === 'google_play_store' &&
    (context.storefrontRegion ?? STOREFRONT_DEFAULT) !== 'unknown' &&
    context.programs?.google?.alternativeBillingOnly === true
  );
}

function googleExternalOffersAllowed(context: PaymentPolicyContext): boolean {
  return (
    context.distributionChannel === 'google_play_store' &&
    (context.storefrontRegion ?? STOREFRONT_DEFAULT) !== 'unknown' &&
    context.programs?.google?.externalOffers === true
  );
}

function buildFailure(
  context: PaymentPolicyContext,
  externalRails: OrchestratedPaymentMethod[]
): PaymentPolicyFailure {
  const strictMode = context.strictMode ?? STRICT_DEFAULT;
  const purchaseMode = context.purchaseMode ?? 'single';
  const storefrontRegion = context.storefrontRegion ?? STOREFRONT_DEFAULT;
  const { distributionChannel, product, availableAdapters } = context;

  if (
    product.fulfillmentType === 'digital_in_app' &&
    purchaseMode === 'cart' &&
    (distributionChannel === 'apple_app_store' ||
      distributionChannel === 'google_play_store')
  ) {
    return {
      code: 'unsupported_purchase_mode',
      message:
        'Cart-style native billing is not supported for store-managed digital products. Resolve a single store product instead.',
    };
  }

  if (
    product.fulfillmentType === 'digital_in_app' &&
    distributionChannel === 'unknown' &&
    strictMode
  ) {
    return {
      code: 'distribution_channel_required',
      message:
        'Distribution channel is required for digital in-app products when strict mode is enabled.',
    };
  }

  if (
    (context.programs?.apple?.usStorefrontExternalPurchaseLink === true ||
      context.programs?.apple?.readerExternalLinkAccount === true ||
      context.programs?.google?.userChoiceBilling === true ||
      context.programs?.google?.alternativeBillingOnly === true ||
      context.programs?.google?.externalOffers === true) &&
    storefrontRegion === 'unknown' &&
    strictMode
  ) {
    return {
      code: 'storefront_region_required',
      message:
        'Storefront region is required when store policy programs or entitlements are configured.',
    };
  }

  if (
    distributionChannel === 'apple_app_store' &&
    product.fulfillmentType === 'digital_in_app' &&
    !availableAdapters.apple_iap
  ) {
    return {
      code: 'native_adapter_missing',
      message:
        'Apple App Store digital products require an Apple In-App Purchase adapter in this build.',
    };
  }

  if (
    distributionChannel === 'google_play_store' &&
    product.fulfillmentType === 'digital_in_app' &&
    !availableAdapters.google_play_billing
  ) {
    return {
      code: 'native_adapter_missing',
      message:
        'Google Play Store digital products require a Google Play Billing adapter in this build.',
    };
  }

  if (
    (product.fulfillmentType === 'reader_content' ||
      product.fulfillmentType === 'other') &&
    strictMode &&
    !(
      appleReaderExternalPurchaseAllowed(context) ||
      googleExternalOffersAllowed(context)
    ) &&
    (distributionChannel === 'apple_app_store' ||
      distributionChannel === 'google_play_store' ||
      distributionChannel === 'unknown')
  ) {
    return {
      code: 'policy_restricted',
      message:
        'This fulfillment type needs explicit store policy handling before payment methods can be exposed safely.',
    };
  }

  if (
    distributionChannel === 'apple_app_store' &&
    product.fulfillmentType === 'reader_content' &&
    storefrontRegion !== 'us' &&
    context.programs?.apple?.readerExternalLinkAccount !== true &&
    strictMode
  ) {
    return {
      code: 'policy_program_required',
      message:
        'Apple App Store reader apps need an explicit reader entitlement or United States storefront context before external purchase rails can be exposed.',
    };
  }

  if (
    distributionChannel === 'google_play_store' &&
    (product.fulfillmentType === 'digital_in_app' ||
      product.fulfillmentType === 'reader_content' ||
      product.fulfillmentType === 'other') &&
    storefrontRegion !== 'unknown' &&
    strictMode &&
    context.programs?.google?.userChoiceBilling !== true &&
    context.programs?.google?.alternativeBillingOnly !== true &&
    context.programs?.google?.externalOffers !== true &&
    product.fulfillmentType !== 'digital_in_app'
  ) {
    return {
      code: 'policy_program_required',
      message:
        'Google Play external purchase flows require an explicit enrolled billing or external offers program before Cedros can expose external rails.',
    };
  }

  if (externalRails.length === 0) {
    return {
      code: 'no_allowed_payment_methods',
      message:
        'No allowed payment methods are available for the current policy context and enabled adapters.',
    };
  }

  return {
    code: 'policy_restricted',
    message:
      'No store-compliant payment method could be resolved for the current context.',
  };
}

/**
 * Core payment policy resolver.
 *
 * This function is intentionally pure so it can be reused across UI,
 * checkout orchestration, and tests.
 */
export function resolveAllowedPaymentMethods(
  context: PaymentPolicyContext
): OrchestratedPaymentMethod[] {
  const strictMode = context.strictMode ?? STRICT_DEFAULT;
  const purchaseMode = context.purchaseMode ?? 'single';
  const { distributionChannel, product, availableAdapters } = context;
  const externalRails = getExternalRails(availableAdapters);

  switch (product.fulfillmentType) {
    case 'digital_in_app':
      if (
        purchaseMode === 'cart' &&
        (distributionChannel === 'apple_app_store' ||
          distributionChannel === 'google_play_store')
      ) {
        return [];
      }

      if (distributionChannel === 'apple_app_store') {
        if (!availableAdapters.apple_iap) {
          return [];
        }

        return appleUsExternalPurchaseAllowed(context)
          ? uniqueMethods(['apple_iap', ...externalRails])
          : ['apple_iap'];
      }

      if (distributionChannel === 'google_play_store') {
        if (googleAlternativeBillingOnlyAllowed(context)) {
          return externalRails;
        }

        if (googleUserChoiceBillingAllowed(context)) {
          return availableAdapters.google_play_billing
            ? uniqueMethods(['google_play_billing', ...externalRails])
            : externalRails;
        }

        return availableAdapters.google_play_billing
          ? ['google_play_billing']
          : [];
      }

      if (
        distributionChannel === 'solana_dapp_store' ||
        distributionChannel === 'android_sideload' ||
        distributionChannel === 'web'
      ) {
        return externalRails;
      }

      return strictMode ? [] : externalRails;

    case 'physical_goods':
    case 'real_world_service':
      return externalRails;

    case 'reader_content':
    case 'other':
      if (distributionChannel === 'apple_app_store') {
        return appleReaderExternalPurchaseAllowed(context) ? externalRails : [];
      }

      if (distributionChannel === 'google_play_store') {
        return googleExternalOffersAllowed(context) ||
          googleUserChoiceBillingAllowed(context) ||
          googleAlternativeBillingOnlyAllowed(context)
          ? externalRails
          : [];
      }

      if (
        distributionChannel === 'solana_dapp_store' ||
        distributionChannel === 'android_sideload' ||
        distributionChannel === 'web'
      ) {
        return externalRails;
      }

      return strictMode ? [] : externalRails;

    default:
      return strictMode ? [] : externalRails;
  }
}

export function resolvePaymentPolicy(
  context: PaymentPolicyContext
): PaymentPolicyResolution {
  const strictMode = context.strictMode ?? STRICT_DEFAULT;
  const externalRails = getExternalRails(context.availableAdapters);
  const allowedPaymentMethods = resolveAllowedPaymentMethods({
    ...context,
    strictMode,
  });

  return {
    product: context.product,
    distributionChannel: context.distributionChannel,
    storefrontRegion: context.storefrontRegion ?? STOREFRONT_DEFAULT,
    strictMode,
    allowedPaymentMethods,
    failure:
      allowedPaymentMethods.length === 0
        ? buildFailure({ ...context, strictMode }, externalRails)
        : undefined,
  };
}

export function collapseRenderablePaymentMethods(
  methods: OrchestratedPaymentMethod[]
): OrchestratedPaymentMethod[] {
  const seen = new Set<string>();
  const collapsed: OrchestratedPaymentMethod[] = [];

  methods.forEach((method) => {
    const renderKey = method === 'x402' || method === 'crypto' ? 'crypto' : method;
    if (seen.has(renderKey)) {
      return;
    }

    seen.add(renderKey);
    collapsed.push(method);
  });

  return collapsed;
}
