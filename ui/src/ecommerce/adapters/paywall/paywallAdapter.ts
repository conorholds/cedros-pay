import type { CommerceAdapter, ProductListParams, CheckoutSessionPayload, CheckoutSessionResult, StorefrontConfig, PaymentMethodsConfig, AIRelatedProductsParams, AIRelatedProductsResult } from '../CommerceAdapter';
import type { Category, ListResult, Product } from '../../types';
import { retryWithBackoff } from '../../../utils/exponentialBackoff';
import { fetchWithTimeout } from '../../../utils/fetchWithTimeout';

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

const FALLBACK_PAGE_SIZE = 50;
const FALLBACK_MAX_PAGES_SINGLE_LOOKUP = 4;
const FALLBACK_MAX_PAGES_BATCH_LOOKUP = 5;
const PAYWALL_FETCH_TIMEOUT_MS = 10000;
const PAYWALL_READ_RETRY_CONFIG = {
  maxRetries: 2,
  initialDelayMs: 100,
  backoffFactor: 2,
  maxDelayMs: 500,
  jitter: false,
} as const;

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

interface FetchJsonOptions {
  body?: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
  retryableRead?: boolean;
  timeoutMs?: number;
}

async function fetchJson(
  serverUrl: string,
  path: string,
  apiKey?: string,
  options: FetchJsonOptions = {}
): Promise<unknown> {
  const {
    body,
    headers: extraHeaders,
    method = 'GET',
    retryableRead = false,
    timeoutMs = PAYWALL_FETCH_TIMEOUT_MS,
  } = options;
  const headers: Record<string, string> = {};
  if (apiKey) headers['X-API-Key'] = apiKey;
  if (extraHeaders) Object.assign(headers, extraHeaders);

  const request = async (): Promise<unknown> => {
    const res = await fetchWithTimeout(
      `${serverUrl}${path}`,
      {
        body,
        headers,
        method,
      },
      timeoutMs
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Request failed (${res.status}): ${text}`) as FetchError;
      err.status = res.status;
      throw err;
    }
    return res.json();
  };

  if (retryableRead) {
    return retryWithBackoff(request, {
      ...PAYWALL_READ_RETRY_CONFIG,
      name: `paywall-read-${method.toLowerCase()}`,
    });
  }

  return request();
}

async function fetchProductsPage(
  serverUrl: string,
  apiKey: string | undefined,
  limit: number,
  offset: number
): Promise<{ products: PaywallProduct[]; total?: number }> {
  const data = (await fetchJson(
    serverUrl,
    `/paywall/v1/products?limit=${limit}&offset=${offset}`,
    apiKey,
    { retryableRead: true }
  )) as PaywallProductsResponse;
  return extractProducts(data);
}

async function scanCatalogPages(
  serverUrl: string,
  apiKey: string | undefined,
  options: { maxPages: number; pageSize: number },
  onPage: (products: PaywallProduct[]) => boolean
): Promise<void> {
  const { maxPages, pageSize } = options;
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const offset = pageIndex * pageSize;
    const { products, total } = await fetchProductsPage(serverUrl, apiKey, pageSize, offset);
    if (products.length === 0) return;

    if (onPage(products)) return;

    const endByTotal = typeof total === 'number' && offset + products.length >= total;
    const endByShortPage = products.length < pageSize;
    if (endByTotal || endByShortPage) return;
  }
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

    const data = (await fetchJson(
      opts.serverUrl,
      `/paywall/v1/products?${qs.toString()}`,
      opts.apiKey,
      { retryableRead: true }
    )) as PaywallProductsResponse;
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
          opts.apiKey,
          { retryableRead: true }
        )) as PaywallProduct;
      return mapPaywallProductToEcommerceProduct(data);
    } catch (err) {
      const status = (err as FetchError)?.status;
      if (status !== 404 && status !== 405) throw err;

      try {
        const byId = (await fetchJson(
          opts.serverUrl,
          `/paywall/v1/products/${encodeURIComponent(slug)}`,
          opts.apiKey,
          { retryableRead: true }
        )) as PaywallProduct;
        return mapPaywallProductToEcommerceProduct(byId);
      } catch (err2) {
        const status2 = (err2 as FetchError)?.status;
        if (status2 !== 404 && status2 !== 405) throw err2;

        let found: PaywallProduct | undefined;
        await scanCatalogPages(
          opts.serverUrl,
          opts.apiKey,
          {
            maxPages: FALLBACK_MAX_PAGES_SINGLE_LOOKUP,
            pageSize: FALLBACK_PAGE_SIZE,
          },
          (products) => {
            found = products.find((p) => p.slug === slug || p.id === slug);
            return Boolean(found);
          }
        );
        return found ? mapPaywallProductToEcommerceProduct(found) : null;
      }
    }
  };

  const getProductsByIds = async (ids: string[]): Promise<Map<string, Product>> => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return new Map();

    const productMap = new Map<string, Product>();

    try {
      const qs = new URLSearchParams();
      qs.set('ids', uniqueIds.join(','));
      qs.set('limit', String(uniqueIds.length));
      qs.set('offset', '0');

      const data = (await fetchJson(
        opts.serverUrl,
        `/paywall/v1/products?${qs.toString()}`,
        opts.apiKey,
        { retryableRead: true }
      )) as PaywallProductsResponse;
      const { products } = extractProducts(data);
      for (const product of products) {
        const mapped = mapPaywallProductToEcommerceProduct(product);
        productMap.set(mapped.id, mapped);
        if (mapped.slug && mapped.slug !== mapped.id) {
          productMap.set(mapped.slug, mapped);
        }
      }
    } catch {
      // Endpoint may not support ids filter; fall back below.
    }

    const missing = uniqueIds.filter((id) => !productMap.has(id));
    if (missing.length === 0) {
      return productMap;
    }
    let unresolvedIds = missing;

    // Bounded paged fallback avoids large one-shot catalog fetches.
    try {
      const missingSet = new Set(unresolvedIds);
      await scanCatalogPages(
        opts.serverUrl,
        opts.apiKey,
        {
          maxPages: FALLBACK_MAX_PAGES_BATCH_LOOKUP,
          pageSize: FALLBACK_PAGE_SIZE,
        },
        (products) => {
          for (const product of products) {
            const mapped = mapPaywallProductToEcommerceProduct(product);
            if (!missingSet.has(mapped.id) && !(mapped.slug && missingSet.has(mapped.slug))) {
              continue;
            }

            productMap.set(mapped.id, mapped);
            if (mapped.slug && mapped.slug !== mapped.id) {
              productMap.set(mapped.slug, mapped);
            }
            missingSet.delete(mapped.id);
            if (mapped.slug) {
              missingSet.delete(mapped.slug);
            }
          }
          return missingSet.size === 0;
        }
      );
      unresolvedIds = Array.from(missingSet);
      if (unresolvedIds.length === 0) {
        return productMap;
      }
    } catch {
      // Best effort fallback: resolve missing items individually.
    }

    for (const id of unresolvedIds) {
      try {
        const found = await getProductBySlug(id);
        if (found) {
          productMap.set(found.id, found);
          if (found.slug && found.slug !== found.id) {
            productMap.set(found.slug, found);
          }
        }
      } catch {
        // Keep best-effort semantics: unresolved IDs are omitted.
      }
    }

    return productMap;
  };

  const listCategories = async (): Promise<Category[]> => {
    // Server doesn’t yet expose category details. Derive from products as a pragmatic fallback.
    const data = (await fetchJson(
      opts.serverUrl,
      `/paywall/v1/products?limit=500&offset=0`,
      opts.apiKey,
      { retryableRead: true }
    )) as PaywallProductsResponse;
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
      const data = (await fetchJson(
        opts.serverUrl,
        '/admin/config/shop',
        opts.apiKey,
        { retryableRead: true }
      )) as { config?: StorefrontConfig };
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
        fetchJson(opts.serverUrl, '/admin/config/stripe', opts.apiKey, { retryableRead: true }),
        fetchJson(opts.serverUrl, '/admin/config/x402', opts.apiKey, { retryableRead: true }),
        fetchJson(opts.serverUrl, '/admin/config/cedros_login', opts.apiKey, { retryableRead: true }),
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
    return fetchJson(
      opts.serverUrl,
      '/admin/ai/related-products',
      opts.apiKey,
      {
        method: 'POST',
        body: JSON.stringify(params),
        headers: { 'Content-Type': 'application/json' },
        retryableRead: false,
      }
    ) as Promise<AIRelatedProductsResult>;
  };

  return {
    listProducts,
    getProductBySlug,
    getProductsByIds,
    listCategories,
    getOrderHistory: async () => [],
    createCheckoutSession,
    getStorefrontSettings,
    getPaymentMethodsConfig,
    getAIRelatedProducts,
  };
}
