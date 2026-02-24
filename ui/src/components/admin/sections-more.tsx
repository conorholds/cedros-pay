/**
 * Admin Dashboard Section Components (Part 2)
 *
 * Coupons, Refunds sections + re-export Settings.
 *
 * @deprecated Import directly from './CouponsSection' or './RefundsSection' instead.
 * This file is kept for backwards compatibility.
 */

import { lazy, Suspense } from 'react';
import type { SettingsSectionProps } from './SettingsSection';

// Re-export for backwards compatibility
export { CouponsSection } from './CouponsSection';
export { RefundsSection } from './RefundsSection';

const LazySettingsSection = lazy(() =>
  import('./SettingsSection').then((module) => ({ default: module.SettingsSection }))
);

// Preserve export name while avoiding a static import edge.
export function SettingsSection(props: SettingsSectionProps) {
  return (
    <Suspense fallback={null}>
      <LazySettingsSection {...props} />
    </Suspense>
  );
}
