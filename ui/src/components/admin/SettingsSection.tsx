/**
 * Settings Section Component
 *
 * Server configuration settings with tabs for Server and Logging.
 */

import { useState } from 'react';
import { SingleCategorySettings } from './SingleCategorySettings';
import type { IAdminAuthManager } from './AdminAuthManager';

export interface SettingsSectionProps {
  serverUrl: string;
  /** @deprecated Use authManager instead */
  apiKey?: string;
  /** Admin auth manager for authenticated requests */
  authManager?: IAdminAuthManager;
}

type SettingsTab = 'logging' | 'metrics' | 'security';

const TABS: { id: SettingsTab; label: string; category: string; description: string }[] = [
  {
    id: 'logging',
    label: 'Logging',
    category: 'logging',
    description: 'Configure log levels, format, and environment settings.',
  },
  {
    id: 'metrics',
    label: 'Metrics',
    category: 'metrics',
    description: 'Configure metrics collection and API access for monitoring.',
  },
  {
    id: 'security',
    label: 'Security',
    category: 'security',
    description: 'Configure CORS, rate limiting, and other security settings.',
  },
];

export function SettingsSection({ serverUrl, apiKey, authManager }: SettingsSectionProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('logging');

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="cedros-admin__server-settings">
      {/* Page Header */}
      <div className="cedros-admin__page-header">
        <h2 className="cedros-admin__page-title">Store Server</h2>
        <p className="cedros-admin__page-description">
          Configure logging, metrics, and security settings.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="cedros-admin__tabs cedros-admin__tabs--line">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`cedros-admin__tab ${activeTab === tab.id ? 'cedros-admin__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: '1rem' }}>
        <SingleCategorySettings
          key={currentTab.category}
          serverUrl={serverUrl}
          apiKey={apiKey}
          authManager={authManager}
          category={currentTab.category}
          title={`${currentTab.label} Settings`}
          description={currentTab.description}
        />
      </div>
    </div>
  );
}
