import { cn } from '../../utils/cn';
import { Button } from '../ui/button';

export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-200 bg-white p-6 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50',
        className
      )}
    >
      <h3 className="text-sm font-semibold">{title ?? 'Something went wrong'}</h3>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button type="button" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
