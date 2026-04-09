import { Suspense, lazy } from 'react';
import type { CedrosPayAdminDashboardProps } from './CedrosPayAdminDashboard';

const LazyCedrosPayAdminDashboardImpl = lazy(async () => {
  const module = await import('./CedrosPayAdminDashboard');
  return { default: module.CedrosPayAdminDashboard };
});

export type {
  CedrosPayAdminDashboardProps,
  DashboardSection,
} from './CedrosPayAdminDashboard';

export function CedrosPayAdminDashboard(props: CedrosPayAdminDashboardProps) {
  return (
    <Suspense fallback={null}>
      <LazyCedrosPayAdminDashboardImpl {...props} />
    </Suspense>
  );
}
