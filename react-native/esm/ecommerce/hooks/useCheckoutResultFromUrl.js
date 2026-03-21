import * as React from 'react';
import { useCedrosShop } from '../config/context';
import { parseCheckoutReturn } from './checkoutReturn';
function searchParamsToRecord(params) {
    const out = {};
    params.forEach((value, key) => {
        out[key] = value;
    });
    return out;
}
function parseUrlQuery(url) {
    try {
        const parsed = new URL(url);
        return searchParamsToRecord(parsed.searchParams);
    }
    catch {
        // Fallback for non-standard URLs
        const queryIndex = url.indexOf('?');
        if (queryIndex === -1)
            return {};
        const search = url.slice(queryIndex + 1);
        return searchParamsToRecord(new URLSearchParams(search));
    }
}
export function useCheckoutResultFromUrl(options) {
    const { config } = useCedrosShop();
    const [result, setResult] = React.useState({ kind: 'idle' });
    const { url } = options;
    React.useEffect(() => {
        if (!url)
            return;
        const query = parseUrlQuery(url);
        (async () => {
            try {
                const resolved = config.adapter.resolveCheckoutReturn
                    ? await config.adapter.resolveCheckoutReturn({ query })
                    : parseCheckoutReturn(query);
                if (resolved.kind === 'success' && resolved.orderId && config.adapter.getOrderById) {
                    const order = await config.adapter.getOrderById(resolved.orderId);
                    if (order) {
                        setResult({ kind: 'success', orderId: resolved.orderId, order });
                        return;
                    }
                }
                setResult(resolved);
            }
            catch (e) {
                setResult({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to resolve checkout' });
            }
        })();
    }, [config.adapter, url]);
    return result;
}
//# sourceMappingURL=useCheckoutResultFromUrl.js.map