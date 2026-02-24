import * as React from 'react';
import type { ProductImage } from '../../types';
import { cn } from '../../utils/cn';

export function ProductGallery({
  images,
  className,
}: {
  images: ProductImage[];
  className?: string;
}) {
  const [active, setActive] = React.useState(0);
  const activeImage = images[active];

  if (images.length === 0) {
    return (
      <div
        className={cn(
          'aspect-square w-full rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900',
          className
        )}
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="aspect-square overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
        <img
          src={activeImage?.url}
          alt={activeImage?.alt ?? ''}
          className="h-full w-full object-cover"
          loading="eager"
        />
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => {
            const isActive = idx === active;
            return (
              <button
                key={img.url}
                type="button"
                className={cn(
                  'h-16 w-16 shrink-0 overflow-hidden rounded-lg border',
                  isActive
                    ? 'border-neutral-900 dark:border-neutral-50'
                    : 'border-neutral-200 dark:border-neutral-800'
                )}
                onClick={() => setActive(idx)}
                aria-label={`View image ${idx + 1}`}
              >
                <img src={img.url} alt={img.alt ?? ''} className="h-full w-full object-cover" loading="lazy" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
