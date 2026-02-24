import { cn } from '../../utils/cn';

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav className={cn('flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400', className)} aria-label="Breadcrumb">
      {items.map((it, idx) => (
        <span key={`${it.label}-${idx}`} className="flex items-center gap-2">
          {it.href ? (
            <a href={it.href} className="hover:underline">
              {it.label}
            </a>
          ) : (
            <span className="text-neutral-900 dark:text-neutral-50">{it.label}</span>
          )}
          {idx < items.length - 1 ? <span aria-hidden>·</span> : null}
        </span>
      ))}
    </nav>
  );
}
