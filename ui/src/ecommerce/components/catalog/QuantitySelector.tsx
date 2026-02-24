import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../utils/cn';

export function QuantitySelector({
  qty,
  onChange,
  min = 1,
  max,
  className,
}:
  | {
      qty: number;
      onChange: (qty: number) => void;
      min?: number;
      max?: number;
      className?: string;
    }) {
  const safeQty = Number.isFinite(qty) ? Math.max(min, Math.floor(qty)) : min;
  const canDec = safeQty > min;
  const canInc = typeof max === 'number' ? safeQty < max : true;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => onChange(Math.max(min, safeQty - 1))}
        disabled={!canDec}
        aria-label="Decrease quantity"
      >
        -
      </Button>
      <Input
        inputMode="numeric"
        pattern="[0-9]*"
        value={String(safeQty)}
        onChange={(e) => {
          const next = Math.floor(Number(e.target.value));
          if (!Number.isFinite(next)) return;
          const clamped = Math.max(min, typeof max === 'number' ? Math.min(max, next) : next);
          onChange(clamped);
        }}
        className="h-10 w-16 text-center"
        aria-label="Quantity"
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => onChange(safeQty + 1)}
        disabled={!canInc}
        aria-label="Increase quantity"
      >
        +
      </Button>
    </div>
  );
}
