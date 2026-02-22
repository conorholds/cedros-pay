import type { CommerceAdapter, ProductListParams, CheckoutSessionPayload, CheckoutSessionResult, StorefrontConfig, PaymentMethodsConfig, AIRelatedProductsParams, AIRelatedProductsResult } from '../CommerceAdapter';
import type { Category, ListResult, Product } from '../../types';

type PaywallProduct = {
  id: string;
  title?: string;
  slug?: string;
  description?: string;
  images?: Array<{ url: string; alt?: string }>;
  imageUrl?: string;
  tags?: string[];
  categoryIds?: string[];
  inventoryStatus?: string;
  inventoryQuantity?: number;
  shippingProfile?: string;
  checkoutRequirements?: Product['checkoutRequirements'];
  fulfillment?: Product['fulfillment'];
  // Pricing
  fiatAmountCents?: number;
  compareAtAmountCents?: number;
  effectiveFiatAmountCents?: number;
  fiatCurrency?: string;
  // Metadata from backend
  metadata?: {
    shippingCountries?: string | string[];
    shipping_countries?: string | string[];
    [key: string]: unknown;
  };
};

type PaywallProductsResponse =
  | PaywallProduct[]
  | {
      products?: PaywallProduct[];
      items?: PaywallProduct[];
      total?: number;
      count?: number;
      limit?: number;
      offset?: number;
    };

function titleCaseId(id: string) {
  return id
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeCurrency(c?: string) {
  if (!c) return 'USD';
  return c.toUpperCase();
}

function normalizeInventoryStatus(v?: string): Product['inventoryStatus'] | undefined {
  if (!v) return undefined;
  if (v === 'in_stock' || v === 'low' || v === 'out_of_stock' || v === 'backorder') return v;
  return undefined;
}

function normalizeShippingProfile(v?: string): Product['shippingProfile'] | undefined {
  if (!v) return undefined;
  if (v === 'physical' || v === 'digital') return v;
  return undefined;
}

function parseShippingCountries(raw: unknown): string[] {
  const rawParts: string[] = [];
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v === 'string') rawParts.push(v);
    }
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          for (const v of parsed) {
            if (typeof v === 'string') rawParts.push(v);
          }
        } else {
          rawParts.push(raw);
        }
      } catch {
        rawParts.push(raw);
      }
    } else {
    rawParts.push(raw);
    }
  }

  return rawParts
    .flatMap((part) => part.split(','))
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);
}

function mapPaywallProductToEcommerceProduct(p: PaywallProduct): Product {
  const currency = normalizeCurrency(p.fiatCurrency);
  const images =
    p.images && p.images.length
      ? p.images
      : p.imageUrl
        ? [{ url: p.imageUrl, alt: p.title }]
        : [];

  const priceCents = p.effectiveFiatAmountCents ?? p.fiatAmountCents ?? 0;
  const compareAtCents = p.compareAtAmountCents;

  const rawShippingCountries =
    p.metadata?.shippingCountries ??
    p.metadata?.shipping_countries;
  const shippingCountries = parseShippingCountries(rawShippingCountries);

  return {
    id: p.id,
    slug: p.slug ?? p.id,
    title: p.title ?? titleCaseId(p.id),
    description: p.description ?? '',
    images,
    price: priceCents / 100,
    currency,
    tags: p.tags ?? [],
    categoryIds: p.categoryIds ?? [],
    inventoryStatus: normalizeInventoryStatus(p.inventoryStatus),
    inventoryQuantity: typeof p.inventoryQuantity === 'number' ? p.inventoryQuantity : undefined,
    compareAtPrice: typeof compareAtCents === 'number' ? compareAtCents / 100 : undefined,
    shippingProfile: normalizeShippingProfile(p.shippingProfile),
    checkoutRequirements: p.checkoutRequirements,
    fulfillment: p.fulfillment,
    attributes: shippingCountries.length
      ? {
          shippingCountries: shippingCountries.join(','),
        }
      : undefined,
  };
}

function extractProducts(data: PaywallProductsResponse): {
  products: PaywallProduct[];
  total?: number;
} {
  if (Array.isArray(data)) return { products: data };
  const products = data.products ?? data.items ?? [];
  const total = data.total ?? data.count;
  return { products, total };
}

interface FetchError extends Error {
  status: number;
}

async function fetchJson(serverUrl: string, path: string, apiKey?: string): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(`${serverUrl}${path}`, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Request failed (${res.status}): ${text}`) as FetchError;
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function createPaywallCommerceAdapter(opts: {
  serverUrl: string;
  apiKey?: string;
}): CommerceAdapter {
  const listProducts = async (params: ProductListParams): Promise<ListResult<Product>> => {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 24;
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const qs = new URLSearchParams();
    qs.set('limit', String(limit));
    qs.set('offset', String(offset));
    if (params.search) qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    if (params.sort) qs.set('sort', params.sort);

    // These query params are best-effort; server may ignore.
    if (params.filters?.inStock) qs.set('in_stock', 'true');
    if (params.filters?.minPrice != null) qs.set('min_price', String(params.filters.minPrice));
    if (params.filters?.maxPrice != null) qs.set('max_price', String(params.filters.maxPrice));
    const rawTags = params.filters?.tags;
    const tags = Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? [rawTags] : [];
    if (tags.length) qs.set('tags', tags.join(','));

    const data = (await fetchJson(opts.serverUrl, `/paywall/v1/products?${qs.toString()}`, opts.apiKey)) as PaywallProductsResponse;
    const { products, total } = extractProducts(data);

    return {
      items: products.map(mapPaywallProductToEcommerceProduct),
      page,
      pageSize,
      total,
      hasNextPage: typeof total === 'number' ? offset + limit < total : products.length === limit,
    };
  };

  const getProductBySlug = async (slug: string): Promise<Product | null> => {
    try {
      const data = (await fetchJson(
        opts.serverUrl,
        `/paywall/v1/products/by-slug/${encodeURIComponent(slug)}`,
        opts.apiKey
      )) as PaywallProduct;
      return mapPaywallProductToEcommerceProduct(data);
    } catch (err) {
      const status = (err as FetchError)?.status;
      if (status !== 404 && status !== 405) throw err;

      try {
        const byId = (await fetchJson(
          opts.serverUrl,
          `/paywall/v1/products/${encodeURIComponent(slug)}`,
          opts.apiKey
        )) as PaywallProduct;
        return mapPaywallProductToEcommerceProduct(byId);
      } catch (err2) {
        const status2 = (err2 as FetchError)?.status;
        if (status2 !== 404 && status2 !== 405) throw err2;

        const data = (await fetchJson(opts.serverUrl, `/paywall/v1/products?limit=200&offset=0`, opts.apiKey)) as PaywallProductsResponse;
        const { products } = extractProducts(data);
        const found = products.find((p) => p.slug === slug || p.id === slug);
        return found ? mapPaywallProductToEcommerceProduct(found) : null;
      }
    }
  };

  const listCategories = async (): Promise<Category[]> => {
    // Server doesn’t yet expose category details. Derive from products as a pragmatic fallback.
    const data = (await fetchJson(opts.serverUrl, `/paywall/v1/products?limit=500&offset=0`, opts.apiKey)) as PaywallProductsResponse;
    const { products } = extractProducts(data);
    const ids = new Set<string>();
    for (const p of products) {
      for (const id of p.categoryIds ?? []) ids.add(id);
    }
    return Array.from(ids).map((id) => ({ id, slug: id, name: titleCaseId(id) }));
  };

  // This adapter is catalog-only. Checkout/session creation stays provider-specific.
  const createCheckoutSession = async (_payload: CheckoutSessionPayload): Promise<CheckoutSessionResult> => {
    throw new Error('createCheckoutSession is not implemented for paywall adapter');
  };

  const getStorefrontSettings = async (): Promise<StorefrontConfig | null> => {
    try {
      const data = (await fetchJson(opts.serverUrl, '/admin/config/shop', opts.apiKey)) as { config?: StorefrontConfig };
      return data.config ?? null;
    } catch {
      // Config not available - return null to use defaults
      return null;
    }
  };

  const getPaymentMethodsConfig = async (): Promise<PaymentMethodsConfig | null> => {
    try {
      // Fetch all three payment config categories in parallel
      const [stripeRes, x402Res, creditsRes] = await Promise.allSettled([
        fetchJson(opts.serverUrl, '/admin/config/stripe', opts.apiKey),
        fetchJson(opts.serverUrl, '/admin/config/x402', opts.apiKey),
        fetchJson(opts.serverUrl, '/admin/config/cedros_login', opts.apiKey),
      ]);

      // Extract enabled status, defaulting to false if fetch failed
      const stripeEnabled = stripeRes.status === 'fulfilled'
        ? Boolean((stripeRes.value as { config?: { enabled?: boolean } })?.config?.enabled)
        : false;
      const cryptoEnabled = x402Res.status === 'fulfilled'
        ? Boolean((x402Res.value as { config?: { enabled?: boolean } })?.config?.enabled)
        : false;
      const creditsEnabled = creditsRes.status === 'fulfilled'
        ? Boolean((creditsRes.value as { config?: { enabled?: boolean } })?.config?.enabled)
        : false;

      return {
        card: stripeEnabled,
        crypto: cryptoEnabled,
        credits: creditsEnabled,
      };
    } catch {
      // Config not available - return null to use defaults (all enabled)
      return null;
    }
  };

  const getAIRelatedProducts = async (params: AIRelatedProductsParams): Promise<AIRelatedProductsResult> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opts.apiKey) headers['X-API-Key'] = opts.apiKey;

    const res = await fetch(`${opts.serverUrl}/admin/ai/related-products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI related products request failed (${res.status}): ${text}`);
    }

    return res.json() as Promise<AIRelatedProductsResult>;
  };

  return {
    listProducts,
    getProductBySlug,
    listCategories,
    getOrderHistory: async () => [],
    createCheckoutSession,
    getStorefrontSettings,
    getPaymentMethodsConfig,
    getAIRelatedProducts,
  };
}
