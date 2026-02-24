/**
 * Admin Plugin Types
 *
 * Re-exported from @cedros/login-react (source of truth for AdminShell types).
 * This ensures type identity — no casts needed when passing cedrosPayPlugin
 * to AdminShell.
 */

export type {
  AdminPlugin,
  AdminSectionConfig,
  AdminGroupConfig,
  AdminSectionProps,
  HostContext,
  PluginContext,
  PluginRegistry,
  PluginId,
  SectionId,
  QualifiedSectionId,
  PluginPermission,
} from '@cedros/login-react';
