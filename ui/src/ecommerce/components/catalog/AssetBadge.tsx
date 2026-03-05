/**
 * AssetBadge
 *
 * Displays the tokenized asset class for a product card.
 *
 * @param assetClass - The assetClassCollectionId from tokenizedAssetConfig
 *   (e.g. "securities", "commodities", "property", "collectibles").
 *   Falls back to a neutral "Tokenized Asset" badge for unknown values.
 */

import { Badge } from '../ui/badge';

const ASSET_LABELS: Record<string, { label: string; className: string }> = {
  securities: {
    label: 'Security',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  },
  commodities: {
    label: 'Commodity',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
  property: {
    label: 'Property',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  },
  collectibles: {
    label: 'Collectible',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  },
};

const FALLBACK = {
  label: 'Tokenized Asset',
  className: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

export function AssetBadge({ assetClass }: { assetClass: string }) {
  const { label, className } = ASSET_LABELS[assetClass.toLowerCase()] ?? FALLBACK;
  return (
    <Badge className={className}>
      {label}
    </Badge>
  );
}
