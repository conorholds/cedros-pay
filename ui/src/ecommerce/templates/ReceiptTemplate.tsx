import { cn } from '../utils/cn';
import { formatMoney } from '../utils/money';
import { useCedrosShop } from '../config/context';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import type { Order } from '../types';

export interface ReceiptTemplateProps {
  /** The order to display */
  order: Order;
  /** Override payment source (defaults to order.source) */
  source?: 'stripe' | 'x402' | 'credits';
  /** Override purchase ID (defaults to order.purchaseId) */
  purchaseId?: string;
  /** Override customer email (defaults to order.customerEmail) */
  customerEmail?: string;
  /** Override customer name (defaults to order.customerName) */
  customerName?: string;
  /** Additional CSS class */
  className?: string;
  /** Callback to go back */
  onBack?: () => void;
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function sourceLabel(source?: string): string {
  switch (source) {
    case 'x402':
      return 'Crypto (x402)';
    case 'credits':
      return 'Credits';
    case 'stripe':
      return 'Card';
    default:
      return 'Payment';
  }
}

export function ReceiptTemplate({
  order,
  source,
  purchaseId,
  customerEmail,
  customerName,
  className,
  onBack,
}: ReceiptTemplateProps) {
  const { config } = useCedrosShop();

  // Use props or fall back to order fields
  const resolvedSource = source ?? order.source;
  const resolvedPurchaseId = purchaseId ?? order.purchaseId;
  const resolvedEmail = customerEmail ?? order.customerEmail;
  const resolvedName = customerName ?? order.customerName;
  const brandName = config.brand?.name ?? 'Store';
  const brandLogo = config.brand?.logoUrl;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(order.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className={cn('min-h-screen bg-neutral-100 dark:bg-neutral-900 print:bg-white print:dark:bg-white', className)}>
      {/* Header - hidden when printing */}
      <div className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 print:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          {onBack ? (
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeftIcon className="mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}
          <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
            <PrintIcon className="mr-2" /> Print Receipt
          </Button>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 print:border-0 print:shadow-none print:dark:bg-white print:dark:text-neutral-950">
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-6 dark:border-neutral-800 print:dark:border-neutral-200">
            <div className="flex items-center gap-3">
              {brandLogo ? (
                <img src={brandLogo} alt={brandName} className="h-10 w-10 rounded-lg object-contain" />
              ) : null}
              <div className="text-xl font-semibold">{brandName}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">Receipt</div>
              <div className="mt-1 font-mono text-sm">{order.id}</div>
            </div>
          </div>

          {/* Order Meta */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <div className="text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">Date</div>
              <div className="mt-1 font-medium">{formattedDate}</div>
              <div className="text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">{formattedTime}</div>
            </div>
            <div>
              <div className="text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">Payment Method</div>
              <div className="mt-1 font-medium">{sourceLabel(resolvedSource)}</div>
            </div>
            <div>
              <div className="text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">Status</div>
              <div className="mt-1">
                <Badge variant="outline" className="capitalize print:border-neutral-300">
                  {order.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          {(resolvedName || resolvedEmail) && (
            <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 print:dark:border-neutral-200">
              <div className="text-sm text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">Customer</div>
              {resolvedName && <div className="mt-1 font-medium">{resolvedName}</div>}
              {resolvedEmail && (
                <div className="text-sm text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">
                  {resolvedEmail}
                </div>
              )}
            </div>
          )}

          {/* Line Items */}
          <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 print:dark:border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 print:dark:border-neutral-200">
                  <th className="pb-3 text-left font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">
                    Item
                  </th>
                  <th className="pb-3 text-center font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">
                    Qty
                  </th>
                  <th className="pb-3 text-right font-medium text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={`${item.title}-${idx}`} className="border-b border-neutral-100 dark:border-neutral-800/50 print:dark:border-neutral-100">
                    <td className="py-3">
                      <div className="font-medium">{item.title}</div>
                    </td>
                    <td className="py-3 text-center text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">
                      {item.qty}
                    </td>
                    <td className="py-3 text-right">
                      {formatMoney({ amount: item.unitPrice * item.qty, currency: item.currency })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex flex-col items-end gap-2 text-sm">
            <div className="flex w-48 justify-between">
              <span className="text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">Subtotal</span>
              <span>{formatMoney({ amount: order.total, currency: order.currency })}</span>
            </div>
            <div className="flex w-48 justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-800 print:dark:border-neutral-200">
              <span>Total</span>
              <span>{formatMoney({ amount: order.total, currency: order.currency })}</span>
            </div>
          </div>

          {/* Transaction ID */}
          {resolvedPurchaseId && (
            <div className="mt-6 border-t border-neutral-200 pt-6 dark:border-neutral-800 print:dark:border-neutral-200">
              <div className="text-sm text-neutral-600 dark:text-neutral-400 print:dark:text-neutral-600">
                Transaction ID
              </div>
              <div className="mt-1 break-all font-mono text-xs">{resolvedPurchaseId}</div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 print:dark:border-neutral-200 print:dark:text-neutral-500">
            <p>Thank you for your purchase!</p>
            <p className="mt-1">If you have any questions, please contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
