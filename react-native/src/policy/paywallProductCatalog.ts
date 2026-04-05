import type {
  CedrosProductCatalog,
  CedrosProductDefinition,
  FulfillmentType,
  StoreManagedProductKind,
} from '../types/storePolicy';

export interface PaywallCatalogStoreBillingConfig {
  kind?: StoreManagedProductKind;
  apple?: {
    productId?: string;
  };
  google?: {
    productId?: string;
    packageName?: string;
    basePlanId?: string;
    offerId?: string;
  };
}

export interface PaywallCatalogProduct {
  id: string;
  title?: string;
  description?: string;
  shippingProfile?: string;
  fulfillment?: {
    type?: string;
    notes?: string;
  };
  fulfillmentType?: string;
  storeBilling?: PaywallCatalogStoreBillingConfig;
  metadata?: Record<string, unknown>;
}

type PaywallProductsResponse =
  | PaywallCatalogProduct[]
  | {
      products?: PaywallCatalogProduct[];
      items?: PaywallCatalogProduct[];
    };

const VALID_POLICY_FULFILLMENT_TYPES = new Set<FulfillmentType>([
  'digital_in_app',
  'physical_goods',
  'real_world_service',
  'reader_content',
  'other',
]);

function extractProducts(response: PaywallProductsResponse): PaywallCatalogProduct[] {
  if (Array.isArray(response)) {
    return response;
  }

  return response.products ?? response.items ?? [];
}

function getMetadataPolicyFulfillmentType(
  metadata: Record<string, unknown> | undefined
): FulfillmentType | undefined {
  const explicit =
    metadata?.store_policy_fulfillment_type ?? metadata?.storePolicyFulfillmentType;

  if (typeof explicit === 'string' && VALID_POLICY_FULFILLMENT_TYPES.has(explicit as FulfillmentType)) {
    return explicit as FulfillmentType;
  }

  return undefined;
}

function derivePolicyFulfillmentType(product: PaywallCatalogProduct): FulfillmentType {
  const explicit = getMetadataPolicyFulfillmentType(product.metadata);
  if (explicit) {
    return explicit;
  }

  const fulfillmentType = product.fulfillment?.type ?? product.fulfillmentType;
  if (fulfillmentType === 'shipping' || product.shippingProfile === 'physical') {
    return 'physical_goods';
  }
  if (fulfillmentType === 'service') {
    return 'real_world_service';
  }
  if (fulfillmentType === 'digital_download' || product.shippingProfile === 'digital') {
    // Conservative compliance default: treat unspecified digital catalog items as
    // in-app digital functionality unless the merchant explicitly marks them as
    // reader content or another exception.
    return 'digital_in_app';
  }

  return 'other';
}

export function mapPaywallProductToCedrosProductDefinition(
  product: PaywallCatalogProduct
): CedrosProductDefinition {
  return {
    id: product.id,
    name: product.title ?? product.description ?? product.id,
    fulfillmentType: derivePolicyFulfillmentType(product),
    storeProduct: product.storeBilling
      ? {
          kind: product.storeBilling.kind,
          apple: product.storeBilling.apple,
          google: product.storeBilling.google,
        }
      : undefined,
  };
}

export function createCedrosProductCatalogFromPaywallProducts(
  products: PaywallCatalogProduct[]
): CedrosProductCatalog {
  return products.reduce<CedrosProductCatalog>((catalog, product) => {
    if (!product?.id) {
      return catalog;
    }

    catalog[product.id] = mapPaywallProductToCedrosProductDefinition(product);
    return catalog;
  }, {});
}

export async function fetchCedrosProductCatalog(options: {
  serverUrl: string;
  apiKey?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<CedrosProductCatalog> {
  const { serverUrl, apiKey, limit = 500, signal } = options;
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const baseUrl = serverUrl.replace(/\/$/, '');
  const response = await fetch(
    `${baseUrl}/paywall/v1/products?limit=${encodeURIComponent(String(limit))}&offset=0`,
    {
      headers,
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load paywall product catalog (${response.status})`);
  }

  const data = (await response.json()) as PaywallProductsResponse;
  return createCedrosProductCatalogFromPaywallProducts(extractProducts(data));
}
