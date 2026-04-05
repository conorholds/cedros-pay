import { useMemo } from 'react';
import { useCedrosContext } from '../context';
import {
  collapseRenderablePaymentMethods,
  detectDistributionChannel,
  resolvePaymentPolicy,
} from '../policy';
import type {
  AvailablePaymentAdapters,
  CedrosPayPolicyOverrides,
  CedrosProductDefinition,
  DistributionChannel,
  OrchestratedPaymentMethod,
  PaymentPolicyPurchaseMode,
  PaymentPolicyResolution,
  StorefrontRegion,
} from '../types/storePolicy';

interface UseStoreAwarePaymentPolicyArgs {
  product?: CedrosProductDefinition;
  policy?: CedrosPayPolicyOverrides;
  purchaseMode?: PaymentPolicyPurchaseMode;
}

interface UseStoreAwarePaymentPolicyResult {
  usesOrchestration: boolean;
  resolution: PaymentPolicyResolution | null;
  availableAdapters: AvailablePaymentAdapters;
  renderableMethods: OrchestratedPaymentMethod[];
}

function resolveDistributionChannel(
  explicitChannel: CedrosPayPolicyOverrides['distributionChannel'],
  configChannel: CedrosPayPolicyOverrides['distributionChannel'],
  resolver?: () => DistributionChannel | undefined
) {
  if (explicitChannel) {
    return explicitChannel;
  }

  if (configChannel) {
    return configChannel;
  }

  try {
    const resolved = resolver?.();
    return resolved === undefined ? detectDistributionChannel() : resolved;
  } catch {
    return detectDistributionChannel();
  }
}

function resolveStorefrontRegion(
  explicitRegion: CedrosPayPolicyOverrides['storefrontRegion'],
  configRegion: StorefrontRegion | undefined,
  resolver?: () => StorefrontRegion | undefined
): StorefrontRegion {
  if (explicitRegion) {
    return explicitRegion;
  }

  if (configRegion) {
    return configRegion;
  }

  try {
    return resolver?.() ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function resolveAvailableAdapters(
  configAdapters: AvailablePaymentAdapters | undefined,
  overrideAdapters: AvailablePaymentAdapters | undefined,
  hasBuiltInStoreBilling: boolean,
  hasAppleHandler: boolean,
  hasGoogleHandler: boolean
): AvailablePaymentAdapters {
  const merged = {
    stripe: true,
    x402: true,
    crypto: false,
    credits: false,
    apple_iap: hasBuiltInStoreBilling,
    google_play_billing: hasBuiltInStoreBilling,
    ...configAdapters,
    ...overrideAdapters,
  };

  return {
    ...merged,
    apple_iap:
      (hasBuiltInStoreBilling || hasAppleHandler) && merged.apple_iap !== false,
    google_play_billing:
      (hasBuiltInStoreBilling || hasGoogleHandler) &&
      merged.google_play_billing !== false,
  };
}

export function useStoreAwarePaymentPolicy({
  product,
  policy,
  purchaseMode = 'single',
}: UseStoreAwarePaymentPolicyArgs): UseStoreAwarePaymentPolicyResult {
  const { config } = useCedrosContext();

  return useMemo(() => {
    const paymentPolicyConfig = config.paymentPolicy;
    const builtInStoreBillingEnabled =
      paymentPolicyConfig?.storeBilling?.enabled !== false;

    const availableAdapters = resolveAvailableAdapters(
      paymentPolicyConfig?.availableAdapters,
      policy?.availableAdapters,
      builtInStoreBillingEnabled,
      Boolean(paymentPolicyConfig?.nativeHandlers?.apple_iap),
      Boolean(paymentPolicyConfig?.nativeHandlers?.google_play_billing)
    );

    if (!product) {
      return {
        usesOrchestration: false,
        resolution: null,
        availableAdapters,
        renderableMethods: [],
      };
    }

    const distributionChannel = resolveDistributionChannel(
      policy?.distributionChannel,
      paymentPolicyConfig?.distributionChannel,
      paymentPolicyConfig?.distributionChannelResolver
    );
    const storefrontRegion = resolveStorefrontRegion(
      policy?.storefrontRegion,
      paymentPolicyConfig?.storefrontRegion,
      paymentPolicyConfig?.storefrontRegionResolver
    );

    const strictMode =
      policy?.strictMode ?? paymentPolicyConfig?.strictMode ?? true;

    const resolution = resolvePaymentPolicy({
      product,
      distributionChannel,
      storefrontRegion,
      programs: policy?.programs ?? paymentPolicyConfig?.programs,
      availableAdapters,
      strictMode,
      purchaseMode,
    });

    return {
      usesOrchestration: true,
      resolution,
      availableAdapters,
      renderableMethods: collapseRenderablePaymentMethods(
        resolution.allowedPaymentMethods
      ),
    };
  }, [
    config.paymentPolicy,
    policy?.availableAdapters,
    policy?.distributionChannel,
    policy?.programs,
    policy?.storefrontRegion,
    policy?.strictMode,
    product,
    purchaseMode,
  ]);
}
