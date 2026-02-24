import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';

export type CatalogFilters = {
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
};

export type CatalogFacets = {
  tags?: string[];
  price?: { min: number; max: number };
};

/** Which filters are enabled/visible */
export type EnabledFilters = {
  tags?: boolean;
  priceRange?: boolean;
  inStock?: boolean;
};

export function FilterPanel({
  facets,
  value,
  onChange,
  onClear,
  className,
  enabledFilters,
}: {
  facets: CatalogFacets;
  value: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
  onClear: () => void;
  className?: string;
  /** Which filters to show (defaults to all) */
  enabledFilters?: EnabledFilters;
}) {
  const tags = facets.tags ?? [];
  const activeTags = new Set(value.tags ?? []);

  // Default to all filters enabled
  const showTags = enabledFilters?.tags ?? true;
  const showPriceRange = enabledFilters?.priceRange ?? true;
  const showInStock = enabledFilters?.inStock ?? true;

  // If no filters are enabled, don't render anything
  const hasAnyFilter = showTags || showPriceRange || showInStock;
  if (!hasAnyFilter) return null;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Filters</div>
        <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={onClear}>
          Clear
        </Button>
      </div>
      <Separator />

      {showTags && tags.length ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">Tags</div>
          <div className="space-y-2">
            {tags.map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={activeTags.has(t)}
                  onChange={(e) => {
                    const next = new Set(activeTags);
                    if (e.target.checked) next.add(t);
                    else next.delete(t);
                    onChange({ ...value, tags: Array.from(next) });
                  }}
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {showPriceRange && facets.price ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">Price</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label className="text-xs" htmlFor="price-min">
                Min
              </Label>
              <Input
                id="price-min"
                inputMode="decimal"
                placeholder={String(facets.price.min)}
                value={value.priceMin ?? ''}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  onChange({ ...value, priceMin: Number.isFinite(n) && e.target.value !== '' ? n : undefined });
                }}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs" htmlFor="price-max">
                Max
              </Label>
              <Input
                id="price-max"
                inputMode="decimal"
                placeholder={String(facets.price.max)}
                value={value.priceMax ?? ''}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  onChange({ ...value, priceMax: Number.isFinite(n) && e.target.value !== '' ? n : undefined });
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showInStock ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">Availability</div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={value.inStock ?? false}
              onChange={(e) => onChange({ ...value, inStock: e.target.checked })}
            />
            In stock
          </label>
        </div>
      ) : null}
    </div>
  );
}
