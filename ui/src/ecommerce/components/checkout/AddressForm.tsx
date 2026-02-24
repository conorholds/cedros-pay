import type { Address } from '../../types';
import { cn } from '../../utils/cn';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function AddressForm({
  title,
  value,
  onChange,
  errors,
  className,
}: {
  title: string;
  value: Address;
  onChange: (next: Address) => void;
  errors?: Record<string, string>;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    >
      <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{title}</div>
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor={`${title}-line1`}>Address line 1</Label>
          <Input
            id={`${title}-line1`}
            value={value.line1}
            onChange={(e) => onChange({ ...value, line1: e.target.value })}
            aria-invalid={Boolean(errors?.line1)}
          />
          {errors?.line1 ? <div className="text-xs text-red-600">{errors.line1}</div> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${title}-line2`}>Address line 2</Label>
          <Input
            id={`${title}-line2`}
            value={value.line2 ?? ''}
            onChange={(e) => onChange({ ...value, line2: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${title}-city`}>City</Label>
            <Input
              id={`${title}-city`}
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              aria-invalid={Boolean(errors?.city)}
            />
            {errors?.city ? <div className="text-xs text-red-600">{errors.city}</div> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${title}-state`}>State</Label>
            <Input
              id={`${title}-state`}
              value={value.state ?? ''}
              onChange={(e) => onChange({ ...value, state: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${title}-postal`}>Postal code</Label>
            <Input
              id={`${title}-postal`}
              value={value.postalCode}
              onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
              aria-invalid={Boolean(errors?.postalCode)}
            />
            {errors?.postalCode ? <div className="text-xs text-red-600">{errors.postalCode}</div> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${title}-country`}>Country</Label>
            <Input
              id={`${title}-country`}
              value={value.country}
              onChange={(e) => onChange({ ...value, country: e.target.value })}
              aria-invalid={Boolean(errors?.country)}
            />
            {errors?.country ? <div className="text-xs text-red-600">{errors.country}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
