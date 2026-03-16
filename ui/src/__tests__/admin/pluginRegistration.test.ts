import { cedrosPayPlugin } from '../../admin/plugin';

describe('cedrosPayPlugin registration', () => {
  const sectionIds = cedrosPayPlugin.sections.map((s) => s.id);
  const componentIds = Object.keys(cedrosPayPlugin.components);

  it('has plugin id "cedros-pay"', () => {
    expect(cedrosPayPlugin.id).toBe('cedros-pay');
  });

  it('every section has a matching component', () => {
    for (const id of sectionIds) {
      expect(componentIds).toContain(id);
    }
  });

  it('every component has a matching section', () => {
    for (const id of componentIds) {
      expect(sectionIds).toContain(id);
    }
  });

  it('includes ai-settings in both sections and components', () => {
    expect(sectionIds).toContain('ai-settings');
    expect(componentIds).toContain('ai-settings');
  });

  it('does not infer admin permission from mere authentication state', () => {
    expect(
      cedrosPayPlugin.checkPermission('admin', {
        cedrosLogin: {
          user: { id: 'user-1' },
        },
        cedrosPay: {
          jwtToken: 'token',
          walletAddress: 'wallet-1',
        },
      } as never)
    ).toBe(false);
  });

  it('respects explicit org permissions when present', () => {
    expect(
      cedrosPayPlugin.checkPermission('admin', {
        org: {
          permissions: ['admin', 'cedros-pay:admin'],
        },
      } as never)
    ).toBe(true);
  });
});
