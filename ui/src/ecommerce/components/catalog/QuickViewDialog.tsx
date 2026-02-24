import * as React from 'react';
import type { Product, ProductVariant } from '../../types';
import { cn } from '../../utils/cn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ProductGallery } from './ProductGallery';
import { Price } from './Price';
import { VariantSelector } from './VariantSelector';
import { QuantitySelector } from './QuantitySelector';
import { Button } from '../ui/button';

export function QuickViewDialog({
  product,
  open,
  onOpenChange,
  productHref,
  onAddToCart,
  className,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productHref?: (slug: string) => string;
  onAddToCart: (product: Product, variant: ProductVariant | null, qty: number) => void;
  className?: string;
}) {
  const [qty, setQty] = React.useState(1);
  const [selected, setSelected] = React.useState<{ selectedOptions: Record<string, string>; variant: ProductVariant | null }>({
    selectedOptions: {},
    variant: null,
  });

  React.useEffect(() => {
    if (!product) return;
    setQty(1);
    if (product.variants?.length) {
      const first = product.variants[0];
      setSelected({ selectedOptions: { ...first.options }, variant: first });
    } else {
      setSelected({ selectedOptions: {}, variant: null });
    }
    // Only reset when product identity changes, not on every property update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) return null;

  const unitPrice = selected.variant?.price ?? product.price;
  const compareAt = selected.variant?.compareAtPrice ?? product.compareAtPrice;

  const variantOutOfStock =
    selected.variant?.inventoryStatus === 'out_of_stock' ||
    (typeof selected.variant?.inventoryQuantity === 'number' && selected.variant.inventoryQuantity <= 0);
  const productOutOfStock =
    product.inventoryStatus === 'out_of_stock' ||
    (typeof product.inventoryQuantity === 'number' && product.inventoryQuantity <= 0);
  // When a variant is selected, variant inventory takes precedence; otherwise fall back to product-level.
  const isOutOfStock = selected.variant ? variantOutOfStock : productOutOfStock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-3xl', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{product.title}</span>
            {productHref ? (
              <a
                href={productHref(product.slug)}
                className="text-sm font-normal text-neutral-700 hover:underline dark:text-neutral-300"
              >
                View details
              </a>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-8 md:grid-cols-2">
          <ProductGallery images={product.images} />
          <div className="space-y-5">
            <div>
              <Price amount={unitPrice} currency={product.currency} compareAt={compareAt} />
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{product.description}</p>
            </div>

            <VariantSelector
              product={product}
              value={{ selectedOptions: selected.selectedOptions, variantId: selected.variant?.id }}
              onChange={(next) => setSelected(next)}
            />

            <div className="flex flex-wrap items-center gap-3">
              <QuantitySelector qty={qty} onChange={setQty} />
              <Button
                type="button"
                className="flex-1"
                disabled={isOutOfStock}
                onClick={() => {
                  onAddToCart(product, selected.variant, qty);
                  onOpenChange(false);
                }}
              >
                {isOutOfStock ? 'Out of stock' : 'Add to cart'}
              </Button>
            </div>

            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {isOutOfStock ? 'Out of stock' : 'In stock'}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
