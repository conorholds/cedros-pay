"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCatalogUrlState = readCatalogUrlState;
exports.buildCatalogUrl = buildCatalogUrl;
exports.useCatalogUrlSync = useCatalogUrlSync;
const React = __importStar(require("react"));
function parseNumber(value) {
    if (!value)
        return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
function parseFilters(params) {
    const tagsRaw = params.get('tags');
    const tags = tagsRaw
        ? tagsRaw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined;
    const priceMin = parseNumber(params.get('min'));
    const priceMax = parseNumber(params.get('max'));
    const inStockRaw = params.get('inStock');
    const inStock = inStockRaw === '1' ? true : inStockRaw === '0' ? false : undefined;
    return {
        tags: tags && tags.length ? tags : undefined,
        priceMin,
        priceMax,
        inStock,
    };
}
function writeFilters(params, filters) {
    if (filters.tags?.length)
        params.set('tags', filters.tags.join(','));
    else
        params.delete('tags');
    if (typeof filters.priceMin === 'number')
        params.set('min', String(filters.priceMin));
    else
        params.delete('min');
    if (typeof filters.priceMax === 'number')
        params.set('max', String(filters.priceMax));
    else
        params.delete('max');
    if (typeof filters.inStock === 'boolean')
        params.set('inStock', filters.inStock ? '1' : '0');
    else
        params.delete('inStock');
}
/**
 * Reads catalog state from a URL string.
 * In React Native, provide the URL from Linking or deep linking handlers.
 */
function readCatalogUrlState({ url, includeCategory }) {
    if (!url)
        return null;
    try {
        const parsed = new URL(url);
        const params = parsed.searchParams;
        const search = params.get('q') ?? '';
        const sort = params.get('sort') ?? 'featured';
        const page = parseNumber(params.get('page')) ?? 1;
        const filters = parseFilters(params);
        const category = includeCategory ? params.get('cat') ?? undefined : undefined;
        return {
            search,
            sort,
            page: Math.max(1, Math.floor(page)),
            category,
            filters,
        };
    }
    catch {
        // Fallback for non-standard URLs
        const queryIndex = url.indexOf('?');
        if (queryIndex === -1) {
            return {
                search: '',
                sort: 'featured',
                page: 1,
                filters: {},
            };
        }
        const search = url.slice(queryIndex + 1);
        const params = new URLSearchParams(search);
        return {
            search: params.get('q') ?? '',
            sort: params.get('sort') ?? 'featured',
            page: parseNumber(params.get('page')) ?? 1,
            category: includeCategory ? params.get('cat') ?? undefined : undefined,
            filters: parseFilters(params),
        };
    }
}
/**
 * Builds a catalog URL with query parameters.
 * Use this with React Native navigation or Linking.openURL().
 */
function buildCatalogUrl({ baseUrl, state, includeCategory }) {
    const url = new URL(baseUrl);
    const params = url.searchParams;
    if (state.search.trim())
        params.set('q', state.search.trim());
    if (state.sort && state.sort !== 'featured')
        params.set('sort', state.sort);
    if (state.page && state.page !== 1)
        params.set('page', String(state.page));
    if (includeCategory) {
        if (state.category)
            params.set('cat', state.category);
    }
    writeFilters(params, state.filters);
    return `${url.pathname}?${params.toString()}`;
}
/**
 * Hook to sync catalog state with URL parameters.
 * In React Native, use the onStateChange callback to update navigation state.
 * Browser history manipulation is not supported in React Native.
 */
function useCatalogUrlSync(state, { onStateChange, baseUrl, includeCategory }) {
    // Serialize tags for stable dependency comparison
    const tagsKey = JSON.stringify(state.filters.tags ?? []);
    React.useEffect(() => {
        if (!onStateChange)
            return;
        const handle = setTimeout(() => {
            const newUrl = buildCatalogUrl({ baseUrl, state, includeCategory });
            onStateChange(newUrl);
        }, 250);
        return () => clearTimeout(handle);
        // Using individual filter properties for granular control
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        onStateChange,
        baseUrl,
        includeCategory,
        state.category,
        state.page,
        state.search,
        state.sort,
        tagsKey,
        state.filters.priceMin,
        state.filters.priceMax,
        state.filters.inStock,
    ]);
}
//# sourceMappingURL=useCatalogUrlState.js.map