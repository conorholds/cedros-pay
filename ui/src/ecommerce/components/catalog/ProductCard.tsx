import type { Product, ProductVariant } from '../../types';
import type { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Price } from './Price';

const ASPECT_CLASSES: Record<ProductCardLayout, string> = {
  large: 'aspect-[4/5]',
  square: 'aspect-square',
  compact: 'aspect-[3/4]',
};

const IMAGE_CROP_CLASSES: Record<ImageCropPosition, string> = {
  center: 'object-center',
  top: 'object-top',
  bottom: 'object-bottom',
  left: 'object-left',
  right: 'object-right',
};

export function ProductCard({
  product,
  href,
  onAddToCart,
  onQuickView,
  className,
  layout = 'large',
  imageCrop = 'center',
}: {
  product: Product;
  href?: string;
  onAddToCart?: (product: Product, variant: ProductVariant | null) => void;
  onQuickView?: (product: Product) => void;
  className?: string;
  /** Card layout style */
  layout?: ProductCardLayout;
  /** Image crop/focus position */
  imageCrop?: ImageCropPosition;
}) {
  const isOutOfStock =
    product.inventoryStatus === 'out_of_stock' ||
    (typeof product.inventoryQuantity === 'number' && product.inventoryQuantity <= 0);
  const lowStockQty = typeof product.inventoryQuantity === 'number' ? product.inventoryQuantity : null;

  return (
    <Card className={cn('group flex h-full flex-col overflow-hidden rounded-2xl', className)}>
      <div className="relative">
        {href ? (
          <a href={href} className="block" aria-label={`View ${product.title}`}>
            <div className={cn('overflow-hidden bg-neutral-100 dark:bg-neutral-900', ASPECT_CLASSES[layout])}>
              <img
                src={product.images[0]?.url}
                alt={product.images[0]?.alt ?? product.title}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]',
                  IMAGE_CROP_CLASSES[imageCrop]
                )}
                loading="lazy"
              />
            </div>
          </a>
        ) : (
          <div className={cn('overflow-hidden bg-neutral-100 dark:bg-neutral-900', ASPECT_CLASSES[layout])}>
            <img
              src={product.images[0]?.url}
              alt={product.images[0]?.alt ?? product.title}
              className={cn(
                'h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]',
                IMAGE_CROP_CLASSES[imageCrop]
              )}
              loading="lazy"
            />
          </div>
        )}

        {layout !== 'compact' && product.tags?.length ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex gap-1 p-3">
            {product.tags.slice(0, 2).map((t) => (
              <Badge key={t} className="pointer-events-none bg-white/90 text-neutral-900 backdrop-blur dark:bg-neutral-950/80 dark:text-neutral-50">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}

        {isOutOfStock ? (
          <div className="pointer-events-none absolute left-3 top-3">
            <Badge variant="secondary" className="bg-white/90 text-neutral-900 backdrop-blur dark:bg-neutral-950/80 dark:text-neutral-50">
              Out of stock
            </Badge>
          </div>
        ) : lowStockQty != null && lowStockQty > 0 && lowStockQty <= 5 ? (
          <div className="pointer-events-none absolute left-3 top-3">
            <Badge variant="secondary" className="bg-white/90 text-neutral-900 backdrop-blur dark:bg-neutral-950/80 dark:text-neutral-50">
              Only {lowStockQty} left
            </Badge>
          </div>
        ) : null}

        {onQuickView ? (
          <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9"
              onClick={() => onQuickView(product)}
            >
              Quick view
            </Button>
          </div>
        ) : null}
      </div>

      <div className={cn('flex flex-1 flex-col', layout === 'compact' ? 'p-3' : 'p-4')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cn(
              'line-clamp-1 font-medium text-neutral-950 dark:text-neutral-50',
              layout === 'compact' ? 'text-xs' : 'text-sm'
            )}>
              {product.title}
            </div>
            <div className="mt-1">
              <Price
                amount={product.price}
                currency={product.currency}
                compareAt={product.compareAtPrice}
                size={layout === 'compact' ? 'sm' : 'default'}
              />
            </div>
          </div>
        </div>

        {layout === 'large' && (
          <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-neutral-600 dark:text-neutral-400">
            {product.description}
          </p>
        )}

        <div className={cn('mt-auto', layout === 'compact' ? 'pt-3' : 'pt-4')}>
          <Button
            type="button"
            className="w-full"
            size={layout === 'compact' ? 'sm' : 'default'}
            onClick={() => onAddToCart?.(product, null)}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? 'Out of stock' : 'Add to cart'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
