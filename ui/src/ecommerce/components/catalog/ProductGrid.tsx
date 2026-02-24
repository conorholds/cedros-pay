import type { Product } from '../../types';
import type { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
import { cn } from '../../utils/cn';
import { ProductCard } from './ProductCard';

export function ProductGrid({
  products,
  columns,
  onAddToCart,
  onQuickView,
  getProductHref,
  className,
  layout,
  imageCrop,
}: {
  products: Product[];
  columns?: { base?: number; md?: number; lg?: number };
  onAddToCart?: Parameters<typeof ProductCard>[0]['onAddToCart'];
  onQuickView?: (product: Product) => void;
  getProductHref?: (product: Product) => string;
  className?: string;
  /** Card layout style */
  layout?: ProductCardLayout;
  /** Image crop/focus position */
  imageCrop?: ImageCropPosition;
}) {
  const base = columns?.base ?? 2;
  const md = columns?.md ?? 3;
  const lg = columns?.lg ?? 3;

  const colsBase = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;
  const colsMd = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' } as const;
  const colsLg = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' } as const;

  const gridClass = cn(
    'grid gap-4',
    colsBase[Math.min(4, Math.max(1, base)) as 1 | 2 | 3 | 4],
    colsMd[Math.min(4, Math.max(1, md)) as 1 | 2 | 3 | 4],
    colsLg[Math.min(4, Math.max(1, lg)) as 1 | 2 | 3 | 4]
  );

  return (
    <div className={cn(gridClass, className)}>
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          href={getProductHref ? getProductHref(p) : undefined}
          onAddToCart={onAddToCart}
          onQuickView={onQuickView}
          layout={layout}
          imageCrop={imageCrop}
        />
      ))}
    </div>
  );
}
