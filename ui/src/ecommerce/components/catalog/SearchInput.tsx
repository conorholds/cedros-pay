import { cn } from '../../utils/cn';
import { Input } from '../ui/input';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search products…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <div
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500 dark:text-neutral-400"
        aria-hidden
      >
        ⌕
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label="Search"
      />
    </div>
  );
}
