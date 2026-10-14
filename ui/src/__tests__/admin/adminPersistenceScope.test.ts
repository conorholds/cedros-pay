import { describe, expect, it } from 'vitest';
import { deriveAdminPersistenceScope } from '../../admin/plugin';
import type { PluginContext } from '../../admin/types';

function context(orgId?: string, userId?: string): PluginContext {
  return {
    serverUrl: 'https://site.example/extensions/cedros-pay',
    orgId,
    userId,
    getAccessToken: () => null,
    hasPermission: () => true,
  };
}

describe('deriveAdminPersistenceScope', () => {
  it('disables browser recovery when the host identity is incomplete', () => {
    expect(deriveAdminPersistenceScope(context('org-a'))).toBeUndefined();
    expect(deriveAdminPersistenceScope(context(undefined, 'user-a'))).toBeUndefined();
  });

  it('isolates organizations and users without exposing their identifiers', () => {
    const first = deriveAdminPersistenceScope(context('org-a', 'user-a'));
    const otherUser = deriveAdminPersistenceScope(context('org-a', 'user-b'));
    const otherOrg = deriveAdminPersistenceScope(context('org-b', 'user-a'));

    expect(first).toMatch(/^[a-f0-9]{16}$/u);
    expect(first).not.toBe(otherUser);
    expect(first).not.toBe(otherOrg);
    expect(first).not.toContain('user-a');
  });
});
