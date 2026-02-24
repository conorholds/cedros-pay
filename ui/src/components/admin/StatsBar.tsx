/**
 * StatsBar Component
 *
 * A reusable horizontal stats display for admin sections.
 * Shows 2-4 stat cards in a row.
 */

import { Icons } from './icons';

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

export function StatsBar({ stats, isLoading = false, onRefresh }: StatsBarProps) {
  return (
    <div className="cedros-admin__stats-bar">
      <div className="cedros-admin__stats-bar-grid">
        {stats.map((stat, index) => (
          <div key={index} className="cedros-admin__stats-bar-item">
            <span className="cedros-admin__stats-bar-label">{stat.label}</span>
            <span className={`cedros-admin__stats-bar-value ${stat.variant ? `cedros-admin__stats-bar-value--${stat.variant}` : ''}`}>
              {isLoading ? (
                <span className="cedros-admin__skeleton cedros-admin__skeleton--value" />
              ) : (
                stat.value
              )}
            </span>
            {stat.description && (
              <span className="cedros-admin__stats-bar-desc">{stat.description}</span>
            )}
          </div>
        ))}
      </div>
      {onRefresh && (
        <button
          type="button"
          className="cedros-admin__stats-bar-refresh"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh stats"
        >
          {isLoading ? Icons.loading : Icons.refresh}
        </button>
      )}
    </div>
  );
}
