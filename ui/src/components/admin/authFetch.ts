import type { IAdminAuthManager } from './AdminAuthManager';

export function requireAdminAuth(authManager: IAdminAuthManager | undefined): IAdminAuthManager {
  if (!authManager?.isAuthenticated()) {
    throw new Error('Admin authentication required');
  }
  return authManager;
}

export function fetchAdminJson<T>(
  authManager: IAdminAuthManager | undefined,
  path: string,
  options?: RequestInit
): Promise<T> {
  return requireAdminAuth(authManager).fetchWithAuth<T>(path, options);
}
