/**
 * Admin Dashboard Section Components
 *
 * Individual section components for the admin dashboard.
 * This file now re-exports from split modules for backwards compatibility.
 */

export type { SectionProps } from './types';

// Re-export section components from split files
export { OverviewSection } from './OverviewSection';
export { ProductsSection } from './ProductsSection';
export { TransactionsSection } from './TransactionsSection';

// Re-export from sections-more to keep backwards compatibility
export { CouponsSection, RefundsSection, SettingsSection } from './sections-more';
