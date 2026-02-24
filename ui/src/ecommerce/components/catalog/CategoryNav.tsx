import type { Category } from '../../types';
import { cn } from '../../utils/cn';

export function CategoryNav({
  categories,
  activeSlug,
  onSelect,
  className,
}: {
  categories: Category[];
  activeSlug?: string;
  onSelect?: (category: Category) => void;
  className?: string;
}) {
  return (
    <nav className={cn('space-y-1', className)} aria-label="Categories">
      {categories.map((c) => {
        const isActive = activeSlug === c.slug;
        return (
          <button
            key={c.id}
            type="button"
            className={cn(
              'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            )}
            onClick={() => onSelect?.(c)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="truncate">{c.name}</span>
            <span className="text-xs opacity-70">›</span>
          </button>
        );
      })}
    </nav>
  );
}
