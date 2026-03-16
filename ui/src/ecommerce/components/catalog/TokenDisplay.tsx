/**
 * Token Display
 *
 * Shows on-chain token/NFT information for tokenized asset products.
 * Displays mint address, token mint signature, and links to Solana explorer.
 *
 * @example
 * ```tsx
 * <TokenDisplay
 *   mintAddress="7xKXqYz..."
 *   mintSignature="5fHp3nR..."
 *   assetClass="securities"
 *   cluster="mainnet-beta"
 * />
 * ```
 */

import { cn } from '../../utils/cn';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';

export interface TokenDisplayProps {
  /** On-chain mint address (SPL token or NFT). */
  mintAddress?: string;
  /** Transaction signature from the token mint. */
  mintSignature?: string;
  /** Transaction signature from token burn (if redeemed). */
  burnSignature?: string;
  /** Asset class label (e.g., "securities", "commodities"). */
  assetClass?: string;
  /** Backing value in cents. */
  backingValueCents?: number;
  /** Backing currency (e.g., "USD"). */
  backingCurrency?: string;
  /** Solana cluster for explorer links. */
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
  /** Additional CSS class. */
  className?: string;
}

function explorerUrl(
  type: 'address' | 'tx',
  value: string,
  cluster: string
): string {
  const base = 'https://explorer.solana.com';
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `${base}/${type}/${value}${clusterParam}`;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatCents(cents: number, currency: string): string {
  const major = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  securities: 'Security Token',
  commodities: 'Commodity Token',
  property: 'Property Token',
  collectibles: 'Collectible NFT',
};

export function TokenDisplay({
  mintAddress,
  mintSignature,
  burnSignature,
  assetClass,
  backingValueCents,
  backingCurrency,
  cluster = 'mainnet-beta',
  className,
}: TokenDisplayProps) {
  if (!mintAddress && !mintSignature) return null;

  const assetLabel = assetClass
    ? ASSET_CLASS_LABELS[assetClass.toLowerCase()] ?? 'Tokenized Asset'
    : 'Tokenized Asset';

  const isRedeemed = !!burnSignature;

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-xl border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ChainIcon />
            <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
              {assetLabel}
            </span>
          </div>
          {isRedeemed ? (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              redeemed
            </Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
              on-chain
            </Badge>
          )}
        </div>

        <div className="mt-3 space-y-2 text-sm">
          {mintAddress && (
            <Row
              label="Token address"
              value={truncateAddress(mintAddress)}
              href={explorerUrl('address', mintAddress, cluster)}
              mono
            />
          )}

          {mintSignature && (
            <Row
              label="Mint transaction"
              value={truncateAddress(mintSignature)}
              href={explorerUrl('tx', mintSignature, cluster)}
              mono
            />
          )}

          {burnSignature && (
            <Row
              label="Burn transaction"
              value={truncateAddress(burnSignature)}
              href={explorerUrl('tx', burnSignature, cluster)}
              mono
            />
          )}

          {backingValueCents != null && backingCurrency && (
            <Row
              label="Backing value"
              value={formatCents(backingValueCents, backingCurrency)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  href,
  mono,
}: {
  label: string;
  value: string;
  href?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'text-blue-600 underline decoration-blue-600/30 hover:decoration-blue-600 dark:text-blue-400',
            mono && 'font-mono text-xs'
          )}
        >
          {value}
        </a>
      ) : (
        <span
          className={cn(
            'text-neutral-950 dark:text-neutral-50',
            mono && 'font-mono text-xs'
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function ChainIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-neutral-400 dark:text-neutral-500"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
