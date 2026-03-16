import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAdminAuth } from '../../components/admin/useAdminAuth';

describe('useAdminAuth', () => {
  it('does not expose cedros-login admin auth for authenticated non-admin users', () => {
    const { result } = renderHook(() =>
      useAdminAuth({
        serverUrl: 'https://api.example.com',
        cedrosLoginToken: 'jwt-token',
        isAdmin: false,
      })
    );

    expect(result.current.cedrosLoginAvailable).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.authMethod).toBe('none');
  });

  it('exposes cedros-login admin auth only when explicitly flagged', () => {
    const { result } = renderHook(() =>
      useAdminAuth({
        serverUrl: 'https://api.example.com',
        cedrosLoginToken: 'jwt-token',
        isAdmin: true,
      })
    );

    expect(result.current.cedrosLoginAvailable).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.authMethod).toBe('cedros-login');
  });
});
