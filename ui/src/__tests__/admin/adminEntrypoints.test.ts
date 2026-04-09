import { describe, expect, it } from 'vitest';
import { cedrosPayPlugin } from '../../admin/plugin';
import { CEDROS_PAY_SECTIONS } from '../../admin/sectionIds';

describe('admin entrypoints', () => {
  it('keeps the plugin entrypoint focused on AdminShell composition', async () => {
    const adminModule = await import('../../admin');

    expect(adminModule.cedrosPayPlugin).toBeDefined();
    expect('CedrosPayAdminDashboard' in adminModule).toBe(false);
  });

  it('does not expose the standalone dashboard from the root package', async () => {
    const rootModule = await import('../../index');

    expect(rootModule.CedrosPay).toBeDefined();
    expect('CedrosPayAdminDashboard' in rootModule).toBe(false);
  });

  it('keeps section metadata and plugin components in sync', () => {
    const sectionIds = CEDROS_PAY_SECTIONS.map((section) => section.id).sort();
    const pluginSectionIds = cedrosPayPlugin.sections.map((section) => section.id).sort();
    const componentIds = Object.keys(cedrosPayPlugin.components).sort();

    expect(pluginSectionIds).toEqual(sectionIds);
    expect(componentIds).toEqual(sectionIds);
  });
});
