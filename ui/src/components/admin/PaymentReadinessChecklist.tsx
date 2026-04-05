import { useEffect, useMemo, useState } from 'react';
import { ConfigApiClient } from './configApi';
import { ErrorBanner } from './ErrorBanner';
import { StatsBar } from './StatsBar';
import type { IAdminAuthManager } from './AdminAuthManager';
import type {
  Product,
  StorePolicyFulfillmentType,
} from './types';

type ReadinessStatus = 'complete' | 'manual' | 'incomplete';

interface ReadinessItem {
  title: string;
  status: ReadinessStatus;
  detail: string;
}

interface ReadinessSection {
  title: string;
  description: string;
  items: ReadinessItem[];
}

interface PaymentReadinessChecklistProps {
  serverUrl: string;
  apiKey?: string;
  authManager?: IAdminAuthManager;
}

function isPresentValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getStatusLabel(status: ReadinessStatus) {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'manual':
      return 'Manual check';
    case 'incomplete':
    default:
      return 'Needs setup';
  }
}

function getStatusColors(status: ReadinessStatus) {
  switch (status) {
    case 'complete':
      return {
        background: 'rgba(34, 197, 94, 0.12)',
        color: '#166534',
        border: 'rgba(34, 197, 94, 0.24)',
      };
    case 'manual':
      return {
        background: 'rgba(245, 158, 11, 0.12)',
        color: '#92400e',
        border: 'rgba(245, 158, 11, 0.24)',
      };
    case 'incomplete':
    default:
      return {
        background: 'rgba(239, 68, 68, 0.12)',
        color: '#991b1b',
        border: 'rgba(239, 68, 68, 0.24)',
      };
  }
}

function derivePolicyFulfillment(product: Product): StorePolicyFulfillmentType | undefined {
  const explicit = product.metadata?.store_policy_fulfillment_type;
  if (
    explicit === 'digital_in_app' ||
    explicit === 'physical_goods' ||
    explicit === 'real_world_service' ||
    explicit === 'reader_content' ||
    explicit === 'other'
  ) {
    return explicit;
  }

  switch (product.fulfillment?.type) {
    case 'shipping':
      return 'physical_goods';
    case 'service':
      return 'real_world_service';
    case 'digital_download':
      return 'digital_in_app';
    default:
      return undefined;
  }
}

function countMissingDigitalMappings(products: Product[]) {
  let digitalCount = 0;
  let fullyMappedCount = 0;
  let missingAppleCount = 0;
  let missingGoogleCount = 0;
  let missingBasePlanCount = 0;

  products.forEach((product) => {
    const fulfillmentType = derivePolicyFulfillment(product);
    if (fulfillmentType !== 'digital_in_app') {
      return;
    }

    digitalCount += 1;
    const storeBilling = product.storeBilling;
    const hasApple = Boolean(storeBilling?.apple?.productId);
    const hasGoogle = Boolean(storeBilling?.google?.productId);
    const needsBasePlan =
      storeBilling?.kind === 'auto_renewable_subscription' && hasGoogle;
    const hasBasePlan = Boolean(storeBilling?.google?.basePlanId);

    if (hasApple && hasGoogle && (!needsBasePlan || hasBasePlan)) {
      fullyMappedCount += 1;
    }
    if (!hasApple) {
      missingAppleCount += 1;
    }
    if (!hasGoogle) {
      missingGoogleCount += 1;
    }
    if (needsBasePlan && !hasBasePlan) {
      missingBasePlanCount += 1;
    }
  });

  return {
    digitalCount,
    fullyMappedCount,
    missingAppleCount,
    missingGoogleCount,
    missingBasePlanCount,
  };
}

function sectionStatus(items: ReadinessItem[]): ReadinessStatus {
  if (items.some((item) => item.status === 'incomplete')) {
    return 'incomplete';
  }
  if (items.some((item) => item.status === 'manual')) {
    return 'manual';
  }
  return 'complete';
}

async function fetchProducts(options: {
  serverUrl: string;
  apiKey?: string;
  authManager?: IAdminAuthManager;
}): Promise<Product[]> {
  const { serverUrl, apiKey, authManager } = options;

  if (authManager?.isAuthenticated()) {
    const data = await authManager.fetchWithAuth<{ products: Product[] }>(
      '/admin/products?limit=500'
    );
    return data.products ?? [];
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const response = await fetch(`${serverUrl.replace(/\/$/, '')}/admin/products?limit=500`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch products (${response.status})`);
  }

  const data = (await response.json()) as { products?: Product[] };
  return data.products ?? [];
}

function SectionCard({ section }: { section: ReadinessSection }) {
  const status = sectionStatus(section.items);
  const colors = getStatusColors(status);

  return (
    <div
      style={{
        border: '1px solid var(--cedros-admin-border, #e5e7eb)',
        borderRadius: '0.75rem',
        padding: '1rem',
        background: 'var(--cedros-admin-surface, #ffffff)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '0.5rem',
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>{section.title}</div>
          <div style={{ color: 'var(--cedros-admin-text-muted, #64748b)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {section.description}
          </div>
        </div>
        <span
          style={{
            background: colors.background,
            color: colors.color,
            border: `1px solid ${colors.border}`,
            borderRadius: '999px',
            padding: '0.2rem 0.6rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      <div style={{ display: 'grid', gap: '0.65rem', marginTop: '0.85rem' }}>
        {section.items.map((item) => {
          const itemColors = getStatusColors(item.status);
          return (
            <div
              key={`${section.title}-${item.title}`}
              style={{
                border: '1px solid var(--cedros-admin-border, #e5e7eb)',
                borderRadius: '0.65rem',
                padding: '0.8rem',
                background: 'rgba(15, 23, 42, 0.015)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  marginBottom: '0.35rem',
                }}
              >
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                <span
                  style={{
                    background: itemColors.background,
                    color: itemColors.color,
                    border: `1px solid ${itemColors.border}`,
                    borderRadius: '999px',
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getStatusLabel(item.status)}
                </span>
              </div>
              <div
                style={{
                  color: 'var(--cedros-admin-text-muted, #64748b)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                }}
              >
                {item.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PaymentReadinessChecklist({
  serverUrl,
  apiKey,
  authManager,
}: PaymentReadinessChecklistProps) {
  const client = useMemo(
    () => new ConfigApiClient(serverUrl, undefined, authManager),
    [serverUrl, authManager]
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [stripeConfig, setStripeConfig] = useState<Record<string, unknown>>({});
  const [nativeStoreConfig, setNativeStoreConfig] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [stripeResponse, nativeStoreResponse, productsResponse] = await Promise.all([
          client.getConfig('stripe', true),
          client.getConfig('native_store', true),
          fetchProducts({ serverUrl, apiKey, authManager }),
        ]);

        if (cancelled) {
          return;
        }

        setStripeConfig(stripeResponse.config ?? {});
        setNativeStoreConfig(nativeStoreResponse.config ?? {});
        setProducts(productsResponse);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load payment readiness data'
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [apiKey, authManager, client, reloadToken, serverUrl]);

  const readiness = useMemo(() => {
    const stripeConfigured =
      isPresentValue(stripeConfig.secret_key) &&
      isPresentValue(stripeConfig.publishable_key);
    const stripeWebhookConfigured = isPresentValue(stripeConfig.webhook_secret);

    const appleEnabled = nativeStoreConfig.apple_enabled === true;
    const appleCredentialsConfigured =
      appleEnabled &&
      isPresentValue(nativeStoreConfig.apple_issuer_id) &&
      isPresentValue(nativeStoreConfig.apple_key_id) &&
      isPresentValue(nativeStoreConfig.apple_private_key) &&
      isPresentValue(nativeStoreConfig.apple_bundle_id);

    const googleEnabled = nativeStoreConfig.google_enabled === true;
    const googleCredentialsConfigured =
      googleEnabled &&
      isPresentValue(nativeStoreConfig.google_service_account_email) &&
      isPresentValue(nativeStoreConfig.google_private_key) &&
      isPresentValue(nativeStoreConfig.google_package_name) &&
      isPresentValue(nativeStoreConfig.google_push_service_account_email) &&
      isPresentValue(nativeStoreConfig.google_push_audience);

    const {
      digitalCount,
      fullyMappedCount,
      missingAppleCount,
      missingGoogleCount,
      missingBasePlanCount,
    } = countMissingDigitalMappings(products);

    const sections: ReadinessSection[] = [
      {
        title: 'Website / Stripe',
        description:
          'Web checkout and browser-based mobile Stripe flows rely on your Stripe keys and webhook wiring.',
        items: [
          {
            title: 'Stripe API keys',
            status: stripeConfigured ? 'complete' : 'incomplete',
            detail: stripeConfigured
              ? 'Publishable and secret keys are configured in Cedros.'
              : 'Add both the Stripe publishable key and secret key in Payment Options → Stripe.',
          },
          {
            title: 'Stripe webhook signing secret',
            status: stripeWebhookConfigured ? 'complete' : 'incomplete',
            detail: stripeWebhookConfigured
              ? 'Cedros has a webhook signing secret configured.'
              : 'Add the Stripe webhook signing secret so Cedros can trust subscription and checkout lifecycle events.',
          },
          {
            title: 'Stripe dashboard webhook endpoint',
            status: stripeConfigured && stripeWebhookConfigured ? 'manual' : 'incomplete',
            detail: stripeConfigured && stripeWebhookConfigured
              ? `Confirm Stripe sends events to ${serverUrl.replace(/\/$/, '')}/webhook/stripe and that test events succeed.`
              : 'Finish the Stripe config above, then create the webhook in Stripe Dashboard and point it at Cedros.',
          },
        ],
      },
      {
        title: 'Apple App Store',
        description:
          'Apple digital goods require App Store billing plus matching App Store Connect catalog and server credentials.',
        items: [
          {
            title: 'Apple native-store credentials',
            status: appleCredentialsConfigured
              ? 'complete'
              : appleEnabled
                ? 'incomplete'
                : 'incomplete',
            detail: appleCredentialsConfigured
              ? 'Issuer ID, key ID, private key, and bundle ID are configured.'
              : appleEnabled
                ? 'Apple billing is enabled, but Cedros is still missing one or more App Store Server API credentials.'
                : 'Enable Apple App Store billing and add the App Store Server API credentials in Payment Options → App Stores.',
          },
          {
            title: 'Apple product mapping',
            status:
              digitalCount === 0
                ? 'manual'
                : missingAppleCount === 0
                  ? 'complete'
                  : 'incomplete',
            detail:
              digitalCount === 0
                ? 'No digital in-app products are classified yet. Create or classify a digital product before shipping on the App Store.'
                : missingAppleCount === 0
                  ? `All ${digitalCount} digital in-app products have an Apple product ID.`
                  : `${missingAppleCount} of ${digitalCount} digital in-app products still need an Apple product ID.`,
          },
          {
            title: 'App Store Connect server notifications',
            status: appleCredentialsConfigured ? 'manual' : 'incomplete',
            detail: appleCredentialsConfigured
              ? `Confirm App Store Server Notifications point to ${serverUrl.replace(/\/$/, '')}/paywall/v1/native-store/apple/notifications using your tenant-scoped Cedros URL.`
              : 'Finish the Apple credentials first, then configure App Store Server Notifications in App Store Connect.',
          },
        ],
      },
      {
        title: 'Google Play',
        description:
          'Google digital goods require Play Billing plus Play Console product mapping, service-account access, and RTDN wiring.',
        items: [
          {
            title: 'Google Play API and RTDN credentials',
            status: googleCredentialsConfigured
              ? 'complete'
              : googleEnabled
                ? 'incomplete'
                : 'incomplete',
            detail: googleCredentialsConfigured
              ? 'Service account, package name, RTDN push identity, and audience are configured.'
              : googleEnabled
                ? 'Google Play billing is enabled, but Cedros is still missing one or more API or RTDN verification fields.'
                : 'Enable Google Play billing and add the Android Publisher / RTDN credentials in Payment Options → App Stores.',
          },
          {
            title: 'Google product and base-plan mapping',
            status:
              digitalCount === 0
                ? 'manual'
                : missingGoogleCount === 0 && missingBasePlanCount === 0
                  ? 'complete'
                  : 'incomplete',
            detail:
              digitalCount === 0
                ? 'No digital in-app products are classified yet. Create or classify a digital product before shipping on Google Play.'
                : missingGoogleCount === 0 && missingBasePlanCount === 0
                  ? `All ${digitalCount} digital in-app products have a Google Play mapping${missingBasePlanCount === 0 ? '' : ' and required base plans'}.`
                  : `${missingGoogleCount} products still need a Google product ID and ${missingBasePlanCount} subscription products still need a base plan ID.`,
          },
          {
            title: 'Play Console RTDN delivery',
            status: googleCredentialsConfigured ? 'manual' : 'incomplete',
            detail: googleCredentialsConfigured
              ? `Confirm Real-time developer notifications are configured to reach ${serverUrl.replace(/\/$/, '')}/paywall/v1/native-store/google/notifications through your approved Pub/Sub push identity.`
              : 'Finish the Google Play credentials first, then configure RTDN delivery in Google Play Console and Google Cloud Pub/Sub.',
          },
        ],
      },
      {
        title: 'Cedros product catalog',
        description:
          'Cedros packages can only route correctly when the catalog itself is classified and mapped cleanly.',
        items: [
          {
            title: 'Products created in Cedros',
            status: products.length > 0 ? 'complete' : 'incomplete',
            detail:
              products.length > 0
                ? `${products.length} products are present in the Cedros catalog.`
                : 'Create at least one product in Admin → Products.',
          },
          {
            title: 'Digital product app-store mapping coverage',
            status:
              digitalCount === 0
                ? 'manual'
                : fullyMappedCount === digitalCount
                  ? 'complete'
                  : 'incomplete',
            detail:
              digitalCount === 0
                ? 'No digital in-app products are currently classified. If you sell only physical goods or real-world services, this is expected.'
                : `${fullyMappedCount} of ${digitalCount} digital in-app products currently have both Apple/Google mapping requirements satisfied.`,
          },
          {
            title: 'Manual end-to-end store test purchases',
            status:
              stripeConfigured ||
              appleCredentialsConfigured ||
              googleCredentialsConfigured
                ? 'manual'
                : 'incomplete',
            detail:
              stripeConfigured || appleCredentialsConfigured || googleCredentialsConfigured
                ? 'Run at least one website purchase, one App Store sandbox purchase, and one Google Play test purchase before shipping.'
                : 'Finish the payment channel setup first, then run real test purchases through every channel you plan to support.',
          },
        ],
      },
    ];

    return {
      sections,
      stats: {
        products: products.length,
        digitalProducts: digitalCount,
        fullyMappedProducts: fullyMappedCount,
        autoVerifiedChecks: sections.flatMap((section) => section.items).filter((item) => item.status === 'complete').length,
      },
    };
  }, [nativeStoreConfig, products, serverUrl, stripeConfig]);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div className="cedros-admin__page-header" style={{ marginBottom: '1rem' }}>
        <h3 className="cedros-admin__page-title">Readiness Checklist</h3>
        <p className="cedros-admin__page-description">
          Cedros can verify configuration and product mapping automatically, but external console wiring and test purchases still require a human check.
        </p>
      </div>

      <ErrorBanner
        message={error}
        onRetry={() => {
          setReloadToken((value) => value + 1);
        }}
      />

      <StatsBar
        stats={[
          { label: 'Products', value: readiness.stats.products },
          { label: 'Digital App Products', value: readiness.stats.digitalProducts },
          { label: 'Fully Mapped', value: readiness.stats.fullyMappedProducts },
          { label: 'Auto-Verified Checks', value: readiness.stats.autoVerifiedChecks },
        ]}
        isLoading={isLoading}
      />

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          marginTop: '1rem',
        }}
      >
        {readiness.sections.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </div>
    </div>
  );
}
