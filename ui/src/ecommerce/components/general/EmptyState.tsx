import { cn } from '../../utils/cn';
import { Button } from '../ui/button';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-10 text-center dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    >
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
        ) : null}
        {actionLabel && onAction ? (
          <div className="mt-5">
            <Button type="button" onClick={onAction} variant="secondary">
              {actionLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
