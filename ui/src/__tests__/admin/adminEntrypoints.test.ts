import { describe, expect, it } from 'vitest';

describe('admin entrypoints', () => {
  it('keeps the plugin entrypoint focused on AdminShell composition', async () => {
    const adminModule = await import('../../admin');

    expect(adminModule.cedrosPayPlugin).toBeDefined();
    expect('CedrosPayAdminDashboard' in adminModule).toBe(false);
  });

  it('exports the standalone dashboard from the standalone admin entrypoint', async () => {
    const standaloneModule = await import('../../standalone-admin');

    expect(standaloneModule.CedrosPayAdminDashboard).toBeDefined();
  });
});
