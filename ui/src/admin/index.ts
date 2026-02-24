/**
 * Admin Plugin Exports
 *
 * Exports the cedrosPayPlugin for use with cedros-login's AdminShell.
 * Types are re-exported from @cedros/login-react to ensure type identity.
 */

// Types (re-exported from @cedros/login-react via ./types)
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
} from './types';

// Plugin
export { cedrosPayPlugin } from './plugin';
