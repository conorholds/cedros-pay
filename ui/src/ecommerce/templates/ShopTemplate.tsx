import * as React from 'react';
import { useCedrosShop } from '../config/context';
import { useCart } from '../state/cart/CartProvider';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import type { Category, Product } from '../types';
import { cn } from '../utils/cn';
import { buildCartItemMetadataFromProduct } from '../utils/cartItemMetadata';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { CategoryNav } from '../components/catalog/CategoryNav';
import { FilterPanel, type CatalogFilters } from '../components/catalog/FilterPanel';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { SearchInput } from '../components/catalog/SearchInput';
import { Skeleton } from '../components/ui/skeleton';
import { ErrorState } from '../components/general/ErrorState';
import { CartSidebar } from '../components/cart/CartSidebar';
import { QuickViewDialog } from '../components/catalog/QuickViewDialog';
import { useOptionalToast } from '../components/general/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { readCatalogUrlState, useCatalogUrlSync } from '../hooks/useCatalogUrlState';

function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
  );
}

export type CedrosShopRoutes = {
  shop?: string;
  category?: (slug: string) => string;
  product?: (slug: string) => string;
  cart?: string;
  checkout?: string;
  orders?: string;
  subscribe?: string;
};

const defaultRoutes: Required<CedrosShopRoutes> = {
  shop: '/shop',
  category: (slug) => `/shop/${slug}`,
  product: (slug) => `/product/${slug}`,
  cart: '/cart',
  checkout: '/checkout',
  orders: '/account/orders',
  subscribe: '/subscribe',
};

function computeFacets(products: Product[]) {
  const tagSet = new Set<string>();
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const p of products) {
    for (const t of p.tags ?? []) tagSet.add(t);
    min = Math.min(min, p.price);
    max = Math.max(max, p.price);
  }
  const tags = Array.from(tagSet).slice(0, 12);
  const price = Number.isFinite(min) ? { min, max } : undefined;
  return { tags, price };
}

export function ShopTemplate({
  className,
  routes,
  initialCategorySlug,
}: {
  className?: string;
  routes?: CedrosShopRoutes;
  initialCategorySlug?: string;
}) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const toastApi = useOptionalToast();
  const r = { ...defaultRoutes, ...routes };

  const [cartSidebarTab, setCartSidebarTab] = React.useState<'cart' | 'chat'>('cart');

  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(min-width: 1024px)')?.matches ?? false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;

    const update = () => setIsDesktop(mq.matches);
    update();

    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const { categories, isLoading: catsLoading, error: catsError } = useCategories();
  const initialUrlState = React.useMemo(() => readCatalogUrlState({ includeCategory: true }), []);
  const [search, setSearch] = React.useState(initialUrlState?.search ?? '');
  const [activeCategory, setActiveCategory] = React.useState<string | undefined>(
    initialCategorySlug ?? initialUrlState?.category
  );
  const [page, setPage] = React.useState(initialUrlState?.page ?? 1);
  const [sort, setSort] = React.useState<string>(initialUrlState?.sort ?? 'featured');
  const [filters, setFilters] = React.useState<CatalogFilters>(initialUrlState?.filters ?? {});

  const { data, isLoading, error } = useProducts({
    category: activeCategory,
    search: search.trim() || undefined,
    filters,
    sort,
    page,
    pageSize: 24,
  });

  const facets = React.useMemo(() => computeFacets(data?.items ?? []), [data?.items]);

  // Storefront settings for filter/sort visibility
  const { settings: storefrontSettings } = useStorefrontSettings();
  const enabledFilters = storefrontSettings.catalog.filters;
  const enabledSort = storefrontSettings.catalog.sort;

  // Build available sort options based on settings
  const sortOptions = React.useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (enabledSort.featured) opts.push({ value: 'featured', label: 'Featured' });
    if (enabledSort.priceAsc) opts.push({ value: 'price_asc', label: 'Price: Low to High' });
    if (enabledSort.priceDesc) opts.push({ value: 'price_desc', label: 'Price: High to Low' });
    // Ensure at least one option
    if (opts.length === 0) opts.push({ value: 'featured', label: 'Featured' });
    return opts;
  }, [enabledSort]);

  // Ensure current sort is valid
  React.useEffect(() => {
    if (!sortOptions.some((o) => o.value === sort)) {
      setSort(sortOptions[0].value);
    }
  }, [sortOptions, sort]);

  useCatalogUrlSync(
    {
      search,
      sort,
      page,
      category: activeCategory,
      filters,
    },
    { includeCategory: true }
  );

  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [quickViewProduct, setQuickViewProduct] = React.useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);

  const onSelectCategory = (c: Category) => {
    setActiveCategory(c.slug);
    setPage(1);
    setIsNavOpen(false);
  };

  const addToCart = React.useCallback(
    (product: Product, variant: { id: string; title: string } | null, qty: number) => {
      cart.addItem(
        {
          productId: product.id,
          variantId: variant?.id,
          unitPrice: product.price,
          currency: product.currency,
          titleSnapshot: variant ? `${product.title} — ${variant.title}` : product.title,
          imageSnapshot: product.images[0]?.url,
          paymentResource: product.id,
          metadata: buildCartItemMetadataFromProduct(product),
        },
        qty
      );

      toastApi?.toast({
        title: 'Added to cart',
        description: product.title,
        actionLabel: 'View cart',
        onAction: () => {
          if (typeof window !== 'undefined') {
            if (window.matchMedia?.('(min-width: 1024px)').matches) {
              window.location.assign(r.cart);
            } else {
              setCartSidebarTab('cart');
              setIsCartOpen(true);
            }
          }
        },
      });
    },
    [cart, r.cart, toastApi]
  );

  return (
    <div className={cn('min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50', className)}>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <a href={r.shop} className="text-sm font-semibold tracking-tight">
            {config.brand?.name ?? 'Shop'}
          </a>
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} />
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline">
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Browse</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  {catsError ? <ErrorState description={catsError} /> : null}
                  {catsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-9" />
                      <Skeleton className="h-9" />
                      <Skeleton className="h-9" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <CategoryNav categories={categories} activeSlug={activeCategory} onSelect={onSelectCategory} />
                      <FilterPanel
                        facets={facets}
                        value={filters}
                        onChange={(next) => {
                          setFilters(next);
                          setPage(1);
                        }}
                        onClear={() => {
                          setFilters({});
                          setPage(1);
                        }}
                        enabledFilters={enabledFilters}
                      />
                      {sortOptions.length > 1 && (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold">Sort</div>
                          <Select
                            value={sort}
                            onValueChange={(v) => {
                              setSort(v);
                              setPage(1);
                            }}
                          >
                            <SelectTrigger aria-label="Sort">
                              <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                              {sortOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <CartSidebar
              open={!isDesktop && isCartOpen}
              onOpenChange={setIsCartOpen}
              side="bottom"
              preferredTab={cartSidebarTab}
              onCheckout={() => {
                if (typeof window !== 'undefined') window.location.assign(r.checkout);
              }}
              trigger={
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setCartSidebarTab('cart')}
                >
                  Cart ({cart.count})
                </Button>
              }
            />
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <CartSidebar
              open={isDesktop && isCartOpen}
              onOpenChange={setIsCartOpen}
              side="popup"
              preferredTab={cartSidebarTab}
              onCheckout={() => {
                if (typeof window !== 'undefined') window.location.assign(r.checkout);
              }}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCartSidebarTab('cart')}
                >
                  Cart ({cart.count})
                </Button>
              }
            />
            <Button
              type="button"
              variant="default"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.assign(r.checkout);
              }}
            >
              Checkout
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop ghost trigger */}
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'fixed bottom-4 right-4 z-30 hidden items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-900 shadow-sm backdrop-blur hover:bg-white dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-50 dark:hover:bg-neutral-950 lg:flex',
          isCartOpen ? 'lg:hidden' : undefined
        )}
        onClick={() => {
          setCartSidebarTab('chat');
          setIsCartOpen(true);
        }}
        aria-label="Open chat"
      >
        <ChatIcon className="h-4 w-4" />
        Chat
      </Button>

      <main className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Card className="flex max-h-[calc(100vh-6rem)] flex-col rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Browse</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-6 overflow-y-auto pr-2">
                <div>
                  <div className="text-sm font-semibold">Categories</div>
                  {catsError ? <ErrorState className="mt-3" description={catsError} /> : null}
                  {catsLoading ? (
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-9" />
                      <Skeleton className="h-9" />
                      <Skeleton className="h-9" />
                    </div>
                  ) : (
                    <div className="mt-3">
                      <CategoryNav categories={categories} activeSlug={activeCategory} onSelect={onSelectCategory} />
                    </div>
                  )}
                </div>

                {sortOptions.length > 1 && (
                  <div>
                    <div className="text-sm font-semibold">Sort</div>
                    <div className="mt-2">
                      <Select
                        value={sort}
                        onValueChange={(v) => {
                          setSort(v);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger aria-label="Sort">
                          <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <FilterPanel
                  facets={facets}
                  value={filters}
                  onChange={(next) => {
                    setFilters(next);
                    setPage(1);
                  }}
                  onClear={() => {
                    setFilters({});
                    setPage(1);
                  }}
                  enabledFilters={enabledFilters}
                />
              </CardContent>
            </Card>
          </div>
        </aside>

        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {storefrontSettings.shopPage.title || 'Shop'}
              </h1>
              {storefrontSettings.shopPage.description && (
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {storefrontSettings.shopPage.description}
                </p>
              )}
            </div>
          </div>

          {error ? <ErrorState className="mt-6" description={error} /> : null}
          {isLoading ? (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <ProductGrid
                products={data?.items ?? []}
                columns={config.ui?.productGrid?.columns}
                getProductHref={(p) => r.product(p.slug)}
                onAddToCart={(p) => addToCart(p, null, 1)}
                onQuickView={(p) => {
                  setQuickViewProduct(p);
                  setIsQuickViewOpen(true);
                }}
                layout={storefrontSettings.shopLayout.layout}
                imageCrop={storefrontSettings.shopLayout.imageCrop}
              />
              <div className="mt-8 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">Page {page}</div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!data?.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>

      </main>

      <QuickViewDialog
        product={quickViewProduct}
        open={isQuickViewOpen}
        onOpenChange={setIsQuickViewOpen}
        productHref={(slug) => r.product(slug)}
        onAddToCart={(p, v, qty) => addToCart(p, v, qty)}
      />
    </div>
  );
}
