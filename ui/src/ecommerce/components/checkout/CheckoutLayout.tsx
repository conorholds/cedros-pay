import { cn } from '../../utils/cn';

export function CheckoutLayout({
  left,
  right,
  className,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid items-start gap-8 lg:grid-cols-[1fr_420px]', className)}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}
