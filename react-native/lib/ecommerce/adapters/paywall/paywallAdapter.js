"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaywallCommerceAdapter = createPaywallCommerceAdapter;
function titleCaseId(id) {
    return id
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
function normalizeCurrency(c) {
    if (!c)
        return 'USD';
    return c.toUpperCase();
}
function normalizeInventoryStatus(v) {
    if (!v)
        return undefined;
    if (v === 'in_stock' || v === 'low' || v === 'out_of_stock' || v === 'backorder')
        return v;
    return undefined;
}
function normalizeShippingProfile(v) {
    if (!v)
        return undefined;
    if (v === 'physical' || v === 'digital')
        return v;
    return undefined;
}
function parseShippingCountries(raw) {
    const rawParts = [];
    if (Array.isArray(raw)) {
        for (const v of raw) {
            if (typeof v === 'string')
                rawParts.push(v);
        }
    }
    else if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    for (const v of parsed) {
                        if (typeof v === 'string')
                            rawParts.push(v);
                    }
                }
                else {
                    rawParts.push(raw);
                }
            }
            catch {
                rawParts.push(raw);
            }
        }
        else {
            rawParts.push(raw);
        }
    }
    return rawParts
        .flatMap((part) => part.split(','))
        .map((part) => part.trim().toUpperCase())
        .filter(Boolean);
}
function mapPaywallProductToEcommerceProduct(p) {
    const currency = normalizeCurrency(p.fiatCurrency);
    const images = p.images && p.images.length
        ? p.images
        : p.imageUrl
            ? [{ url: p.imageUrl, alt: p.title }]
            : [];
    const priceCents = p.effectiveFiatAmountCents ?? p.fiatAmountCents ?? 0;
    const compareAtCents = p.compareAtAmountCents;
    const rawShippingCountries = p.metadata?.shippingCountries ??
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
function extractProducts(data) {
    if (Array.isArray(data))
        return { products: data };
    const products = data.products ?? data.items ?? [];
    const total = data.total ?? data.count;
    return { products, total };
}
async function fetchJson(serverUrl, path, apiKey) {
    const headers = {};
    if (apiKey)
        headers['X-API-Key'] = apiKey;
    const res = await fetch(`${serverUrl}${path}`, { headers });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = new Error(`Request failed (${res.status}): ${text}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}
function createPaywallCommerceAdapter(opts) {
    const listProducts = async (params) => {
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 24;
        const limit = pageSize;
        const offset = (page - 1) * pageSize;
        const qs = new URLSearchParams();
        qs.set('limit', String(limit));
        qs.set('offset', String(offset));
        if (params.search)
            qs.set('search', params.search);
        if (params.category)
            qs.set('category', params.category);
        if (params.sort)
            qs.set('sort', params.sort);
        // These query params are best-effort; server may ignore.
        if (params.filters?.inStock)
            qs.set('in_stock', 'true');
        if (params.filters?.minPrice != null)
            qs.set('min_price', String(params.filters.minPrice));
        if (params.filters?.maxPrice != null)
            qs.set('max_price', String(params.filters.maxPrice));
        const rawTags = params.filters?.tags;
        const tags = Array.isArray(rawTags) ? rawTags : typeof rawTags === 'string' ? [rawTags] : [];
        if (tags.length)
            qs.set('tags', tags.join(','));
        const data = (await fetchJson(opts.serverUrl, `/paywall/v1/products?${qs.toString()}`, opts.apiKey));
        const { products, total } = extractProducts(data);
        return {
            items: products.map(mapPaywallProductToEcommerceProduct),
            page,
            pageSize,
            total,
            hasNextPage: typeof total === 'number' ? offset + limit < total : products.length === limit,
        };
    };
    const getProductBySlug = async (slug) => {
        try {
            const data = (await fetchJson(opts.serverUrl, `/paywall/v1/products/by-slug/${encodeURIComponent(slug)}`, opts.apiKey));
            return mapPaywallProductToEcommerceProduct(data);
        }
        catch (err) {
            const status = err?.status;
            if (status !== 404 && status !== 405)
                throw err;
            try {
                const byId = (await fetchJson(opts.serverUrl, `/paywall/v1/products/${encodeURIComponent(slug)}`, opts.apiKey));
                return mapPaywallProductToEcommerceProduct(byId);
            }
            catch (err2) {
                const status2 = err2?.status;
                if (status2 !== 404 && status2 !== 405)
                    throw err2;
                const data = (await fetchJson(opts.serverUrl, `/paywall/v1/products?limit=200&offset=0`, opts.apiKey));
                const { products } = extractProducts(data);
                const found = products.find((p) => p.slug === slug || p.id === slug);
                return found ? mapPaywallProductToEcommerceProduct(found) : null;
            }
        }
    };
    const listCategories = async () => {
        // Server doesn’t yet expose category details. Derive from products as a pragmatic fallback.
        const data = (await fetchJson(opts.serverUrl, `/paywall/v1/products?limit=500&offset=0`, opts.apiKey));
        const { products } = extractProducts(data);
        const ids = new Set();
        for (const p of products) {
            for (const id of p.categoryIds ?? [])
                ids.add(id);
        }
        return Array.from(ids).map((id) => ({ id, slug: id, name: titleCaseId(id) }));
    };
    // This adapter is catalog-only. Checkout/session creation stays provider-specific.
    const createCheckoutSession = async (_payload) => {
        throw new Error('createCheckoutSession is not implemented for paywall adapter');
    };
    const getStorefrontSettings = async () => {
        try {
            const data = (await fetchJson(opts.serverUrl, '/admin/config/shop', opts.apiKey));
            return data.config ?? null;
        }
        catch {
            // Config not available - return null to use defaults
            return null;
        }
    };
    const getPaymentMethodsConfig = async () => {
        try {
            // Fetch all three payment config categories in parallel
            const [stripeRes, x402Res, creditsRes] = await Promise.allSettled([
                fetchJson(opts.serverUrl, '/admin/config/stripe', opts.apiKey),
                fetchJson(opts.serverUrl, '/admin/config/x402', opts.apiKey),
                fetchJson(opts.serverUrl, '/admin/config/cedros_login', opts.apiKey),
            ]);
            // Extract enabled status, defaulting to false if fetch failed
            const stripeEnabled = stripeRes.status === 'fulfilled'
                ? Boolean(stripeRes.value?.config?.enabled)
                : false;
            const cryptoEnabled = x402Res.status === 'fulfilled'
                ? Boolean(x402Res.value?.config?.enabled)
                : false;
            const creditsEnabled = creditsRes.status === 'fulfilled'
                ? Boolean(creditsRes.value?.config?.enabled)
                : false;
            return {
                card: stripeEnabled,
                crypto: cryptoEnabled,
                credits: creditsEnabled,
            };
        }
        catch {
            // Config not available - return null to use defaults (all enabled)
            return null;
        }
    };
    const getAIRelatedProducts = async (params) => {
        const headers = { 'Content-Type': 'application/json' };
        if (opts.apiKey)
            headers['X-API-Key'] = opts.apiKey;
        const res = await fetch(`${opts.serverUrl}/admin/ai/related-products`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`AI related products request failed (${res.status}): ${text}`);
        }
        return res.json();
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
//# sourceMappingURL=paywallAdapter.js.map