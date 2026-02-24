import * as React from 'react';
import { useCart } from '../state/cart/CartProvider';
import { useProduct } from '../hooks/useProduct';
import { useProducts } from '../hooks/useProducts';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useAIRelatedProducts } from '../hooks/useAIRelatedProducts';
import type { Product, ProductVariant } from '../types';
import { cn } from '../utils/cn';
import { buildCartItemMetadataFromProduct } from '../utils/cartItemMetadata';
import { Breadcrumbs } from '../components/catalog/Breadcrumbs';
import { ProductGallery } from '../components/catalog/ProductGallery';
import { VariantSelector } from '../components/catalog/VariantSelector';
import { QuantitySelector } from '../components/catalog/QuantitySelector';
import { Price } from '../components/catalog/Price';
import { Button } from '../components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Skeleton } from '../components/ui/skeleton';
import { ErrorState } from '../components/general/ErrorState';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { useOptionalToast } from '../components/general/toast';
import { parseCsv } from '../../utils/csvHelpers';

export function ProductTemplate({
  slug,
  className,
  routes,
}: {
  slug: string;
  className?: string;
  routes?: { shop?: string; checkout?: string; cart?: string; product?: (slug: string) => string };
}) {
  const cart = useCart();
  const toastApi = useOptionalToast();
  const { product, isLoading, error } = useProduct(slug);
  const [qty, setQty] = React.useState(1);
  const [selected, setSelected] = React.useState<{ selectedOptions: Record<string, string>; variant: ProductVariant | null }>({
    selectedOptions: {},
    variant: null,
  });

  React.useEffect(() => {
    if (!product || !product.variants?.length) return;
    const first = product.variants[0];
    setSelected({ selectedOptions: { ...first.options }, variant: first });
    // Only reset when product identity changes, not on every property update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Storefront settings for related products
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { mode, maxItems } = storefrontSettings.relatedProducts;

  // AI recommendations (only fetched when mode is 'ai')
  const aiRecommendations = useAIRelatedProducts({
    productId: product?.id,
    enabled: mode === 'ai' && !!product?.id,
  });

  // Determine related products query based on mode
  const relatedQuery = React.useMemo(() => {
    if (mode === 'by_category' && product?.categoryIds?.length) {
      return { category: product.categoryIds[0], page: 1, pageSize: maxItems + 1 };
    }
    // For most_recent, manual, and ai (fallback) - fetch general products
    return { page: 1, pageSize: maxItems + 4 };
  }, [mode, maxItems, product?.categoryIds]);

  const related = useProducts(relatedQuery);

  // Filter and select related products based on mode
  const relatedItems = React.useMemo((): Product[] => {
    const allProducts = related.data?.items ?? [];
    const filtered = allProducts.filter((p) => p.slug !== slug);

    if (mode === 'manual' && product) {
      // Manual mode: read relatedProductIds from product attributes
      const relatedIdsRaw = product.attributes?.relatedProductIds || product.attributes?.related_product_ids;
      if (relatedIdsRaw) {
        const relatedIds = parseCsv(String(relatedIdsRaw));
        if (relatedIds.length > 0) {
          // Filter to only products in the relatedIds list, preserving order
          const byId = new Map(filtered.map((p) => [p.id, p]));
          const manual = relatedIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
          return manual.slice(0, maxItems);
        }
      }
      // Fallback to most_recent if no manual IDs set
    }

    if (mode === 'ai') {
      // AI mode: use AI-recommended product IDs if available
      if (aiRecommendations.relatedProductIds && aiRecommendations.relatedProductIds.length > 0) {
        const byId = new Map(filtered.map((p) => [p.id, p]));
        const aiProducts = aiRecommendations.relatedProductIds
          .map((id) => byId.get(id))
          .filter((p): p is Product => !!p);
        if (aiProducts.length > 0) {
          return aiProducts.slice(0, maxItems);
        }
      }
      // Fallback to most_recent if AI not configured or returned no results
    }

    // Default: most_recent or by_category (already filtered by query)
    return filtered.slice(0, maxItems);
  }, [related.data?.items, slug, mode, maxItems, product, aiRecommendations.relatedProductIds]);

  const shopHref = routes?.shop ?? '/shop';
  const checkoutHref = routes?.checkout ?? '/checkout';
  const cartHref = routes?.cart ?? '/cart';
  const productHref = routes?.product ?? ((s: string) => `/product/${s}`);

  if (isLoading) {
    return (
      <div className={cn('min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950', className)}>
        <div className="mx-auto max-w-6xl">
          <Skeleton className="h-5 w-40" />
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-20" />
              <Skeleton className="h-11" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950', className)}>
        <div className="mx-auto max-w-6xl">
          <ErrorState description={error} />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={cn('min-h-screen bg-neutral-50 p-6 dark:bg-neutral-950', className)}>
        <div className="mx-auto max-w-6xl">
          <ErrorState description="Product not found." />
        </div>
      </div>
    );
  }

  const unitPrice = selected.variant?.price ?? product.price;
  const compareAt = selected.variant?.compareAtPrice ?? product.compareAtPrice;
  const variantOutOfStock =
    selected.variant?.inventoryStatus === 'out_of_stock' ||
    (typeof selected.variant?.inventoryQuantity === 'number' && selected.variant.inventoryQuantity <= 0);
  const productOutOfStock =
    product.inventoryStatus === 'out_of_stock' ||
    (typeof product.inventoryQuantity === 'number' && product.inventoryQuantity <= 0);
  // When a variant is selected, its inventory takes precedence over the product-level status.
  const isOutOfStock = selected.variant ? variantOutOfStock : productOutOfStock;

  const addToCart = () => {
    if (isOutOfStock) return;
    cart.addItem(
      {
        productId: product.id,
        variantId: selected.variant?.id,
        unitPrice,
        currency: product.currency,
        titleSnapshot: selected.variant ? `${product.title} — ${selected.variant.title}` : product.title,
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
        if (typeof window !== 'undefined') window.location.assign(cartHref);
      },
    });
  };

  const buyNow = () => {
    if (isOutOfStock) return;
    addToCart();
    if (typeof window !== 'undefined') window.location.assign(checkoutHref);
  };

  return (
    <div className={cn('min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50', className)}>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Breadcrumbs items={[{ label: 'Shop', href: shopHref }, { label: product.title }]} />

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <ProductGallery images={product.images} />
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{product.title}</h1>
              <div className="mt-3">
                <Price amount={unitPrice} currency={product.currency} compareAt={compareAt} />
              </div>
              {isOutOfStock ? (
                <div className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">Out of stock</div>
              ) : typeof product.inventoryQuantity === 'number' && product.inventoryQuantity > 0 && product.inventoryQuantity <= 5 ? (
                <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  Only <span className="font-semibold text-neutral-950 dark:text-neutral-50">{product.inventoryQuantity}</span> left
                </div>
              ) : null}
              <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{product.description}</p>
            </div>

            <VariantSelector
              product={product}
              value={{ selectedOptions: selected.selectedOptions, variantId: selected.variant?.id }}
              onChange={(next) => setSelected(next)}
            />

            <div className="flex flex-wrap items-center gap-3">
              <QuantitySelector qty={qty} onChange={setQty} />
              <Button type="button" onClick={addToCart} className="flex-1" disabled={isOutOfStock}>
                {isOutOfStock ? 'Out of stock' : 'Add to cart'}
              </Button>
              <Button type="button" variant="outline" onClick={buyNow} disabled={isOutOfStock}>
                Buy now
              </Button>
            </div>

            {(storefrontSettings.sections.showDescription || storefrontSettings.sections.showSpecs || storefrontSettings.sections.showShipping) && (
              <Accordion type="single" collapsible defaultValue={storefrontSettings.sections.showDescription ? 'desc' : undefined}>
                {storefrontSettings.sections.showDescription && (
                  <AccordionItem value="desc">
                    <AccordionTrigger>Description</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">{product.description}</div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {storefrontSettings.sections.showSpecs && (
                  <AccordionItem value="specs">
                    <AccordionTrigger>Specs</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {product.attributes ? (
                          <div className="space-y-1">
                            {Object.entries(product.attributes).map(([k, v]) => (
                              <div key={k}>
                                <span className="font-medium text-neutral-950 dark:text-neutral-50">{k}:</span> {String(v)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          'No specs provided.'
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {storefrontSettings.sections.showShipping && (
                  <AccordionItem value="ship">
                    <AccordionTrigger>Shipping & returns</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Ships in 2–3 business days. Easy returns within 30 days.
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}
          </div>
        </div>

        {storefrontSettings.sections.showRelatedProducts && relatedItems.length ? (
          <section className="mt-12">
            <h2 className="text-lg font-semibold">Related products</h2>
            <div className="mt-4">
              <ProductGrid
                products={relatedItems}
                columns={{ base: 2, md: 4, lg: 4 }}
                layout={storefrontSettings.relatedProducts.layout.layout}
                imageCrop={storefrontSettings.relatedProducts.layout.imageCrop}
                getProductHref={(p) => productHref(p.slug)}
                onAddToCart={(p) =>
                  cart.addItem(
                    {
                      productId: p.id,
                      unitPrice: p.price,
                      currency: p.currency,
                      titleSnapshot: p.title,
                      imageSnapshot: p.images[0]?.url,
                      paymentResource: p.id,
                    },
                    1
                  )
                }
              />
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
