import * as React from 'react';
import { useCedrosShop } from '../config/context';
export function useProducts(params) {
    const { config } = useCedrosShop();
    const [data, setData] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    // Serialize filters for stable dependency comparison
    const filtersKey = JSON.stringify(params.filters ?? {});
    React.useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);
        config.adapter
            .listProducts(params)
            .then((res) => {
            if (cancelled)
                return;
            setData(res);
        })
            .catch((e) => {
            if (cancelled)
                return;
            setError(e instanceof Error ? e.message : 'Failed to load products');
        })
            .finally(() => {
            if (cancelled)
                return;
            setIsLoading(false);
        });
        return () => {
            cancelled = true;
        };
        // Using individual param properties for granular control
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.adapter, params.category, params.search, params.sort, params.page, params.pageSize, filtersKey]);
    return { data, isLoading, error };
}
//# sourceMappingURL=useProducts.js.map