import type { ShippingMethod } from '../../types';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/money';
import { Button } from '../ui/button';

export function ShippingMethodSelector({
  methods,
  value,
  onChange,
  currency,
  className,
}: {
  methods: ShippingMethod[];
  value?: string;
  onChange: (id: string) => void;
  currency: string;
  className?: string;
}) {
  if (methods.length === 0) return null;
  return (
    <section
      className={cn(
        'space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    >
      <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Shipping method</div>
      <div className="space-y-2">
        {methods.map((m) => {
          const active = m.id === value;
          return (
            <Button
              key={m.id}
              type="button"
              variant={active ? 'default' : 'outline'}
              className="h-auto w-full justify-between px-4 py-3"
              onClick={() => onChange(m.id)}
              aria-pressed={active}
            >
              <div className="text-left">
                <div className="text-sm font-medium">{m.label}</div>
                {m.detail ? <div className="text-xs opacity-80">{m.detail}</div> : null}
              </div>
              <div className="text-sm font-semibold">
                {formatMoney({ amount: m.price, currency: m.currency || currency })}
              </div>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
