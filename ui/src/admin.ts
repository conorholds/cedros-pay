/**
 * Plugin-focused admin entrypoint.
 *
 * Use `@cedros/pay-react/admin` with `@cedros/admin-react` for
 * cedros-pay AdminShell composition.
 */

import './admin-plugin.css';

export {
  cedrosPayPlugin,
  CEDROS_PAY_SECTIONS,
  CEDROS_PAY_SECTION_IDS,
  CEDROS_PAY_GROUPS,
  type AdminHostContext,
  type AdminHostServiceBag,
  type SectionReference,
  type AdminPlugin,
  type AdminSectionConfig,
  type AdminGroupConfig,
  type AdminSectionProps,
  type HostContext,
  type PluginContext,
  type PluginRegistry,
  type PluginId,
  type SectionId,
  type QualifiedSectionId,
  type PluginPermission,
} from './admin/index';
