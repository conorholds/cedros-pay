export type CedrosShopRoutes = {
    shop?: string;
    category?: (slug: string) => string;
    product?: (slug: string) => string;
    cart?: string;
    checkout?: string;
    orders?: string;
    subscribe?: string;
};
export declare function ShopTemplate({ className, routes, initialCategorySlug, }: {
    className?: string;
    routes?: CedrosShopRoutes;
    initialCategorySlug?: string;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ShopTemplate.d.ts.map