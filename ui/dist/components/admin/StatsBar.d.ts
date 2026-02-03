/**
 * StatsBar Component
 *
 * A reusable horizontal stats display for admin sections.
 * Shows 2-4 stat cards in a row.
 */
export interface StatItem {
    label: string;
    value: string | number;
    description?: string;
    variant?: 'default' | 'success' | 'warning' | 'muted';
}
export interface StatsBarProps {
    stats: StatItem[];
    isLoading?: boolean;
    onRefresh?: () => void;
}
export declare function StatsBar({ stats, isLoading, onRefresh }: StatsBarProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=StatsBar.d.ts.map