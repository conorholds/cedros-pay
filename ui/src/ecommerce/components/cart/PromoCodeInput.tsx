import * as React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function PromoCodeInput({
  value,
  onApply,
  className,
}: {
  value?: string;
  onApply: (code?: string) => void;
  className?: string;
}) {
  const [code, setCode] = React.useState(value ?? '');

  React.useEffect(() => {
    setCode(value ?? '');
  }, [value]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-sm font-medium text-neutral-950 dark:text-neutral-50">Promo code</div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="SAVE10"
          aria-label="Promo code"
        />
        <Button type="button" variant="outline" onClick={() => onApply(code.trim() || undefined)}>
          Apply
        </Button>
      </div>
    </div>
  );
}
