/**
 * StatsBar Component
 *
 * A reusable horizontal stats display for admin sections.
 * Shows 2-4 stat cards in a row. Data is kept current by background refresh in
 * the host sections, so no manual refresh control is rendered here.
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
}

export function StatsBar({ stats, isLoading = false }: StatsBarProps) {
  return (
    <div className="cedros-admin__stats-bar" aria-busy={isLoading}>
      <div className="cedros-data-summary-grid cedros-admin__stats-bar-grid cedros-admin__stagger-reveal">
        {stats.map((stat, index) => (
          <div key={index} className="cedros-data-metric cedros-admin__stats-bar-item">
            <span className="cedros-data-metric__label cedros-admin__stats-bar-label">
              {stat.label}
            </span>
            <span className={`cedros-data-metric__value cedros-admin__stats-bar-value ${stat.variant ?`cedros-admin__stats-bar-value--${stat.variant}` : ''}`}>
              {isLoading ? (
                <span className="cedros-admin__skeleton cedros-admin__skeleton--value" />
              ) : (
                typeof stat.value === 'number'
                  ? new Intl.NumberFormat().format(stat.value)
                  : stat.value
              )}
            </span>
            {stat.description && (
              <span className="cedros-data-metric__hint cedros-admin__stats-bar-desc">
                {stat.description}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
