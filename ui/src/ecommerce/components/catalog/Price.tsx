import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/money';

export function Price({
  amount,
  currency,
  compareAt,
  className,
  size = 'default',
}: {
  amount: number;
  currency: string;
  compareAt?: number;
  className?: string;
  /** Size variant */
  size?: 'sm' | 'default';
}) {
  const isSale = typeof compareAt === 'number' && compareAt > amount;

  return (
    <div className={cn('flex items-baseline gap-2 tabular-nums', className)}>
      <span className={cn('font-semibold', size === 'sm' ? 'text-sm' : 'text-base')}>
        {formatMoney({ amount, currency })}
      </span>
      {isSale ? (
        <span className={cn(
          'text-neutral-500 line-through dark:text-neutral-400',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          {formatMoney({ amount: compareAt!, currency })}
        </span>
      ) : null}
    </div>
  );
}
