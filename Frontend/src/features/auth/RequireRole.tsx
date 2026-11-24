import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { ADMIN_HOME } from '@/constants/staff';
import { useSession } from './useSession';

type RequireRoleProps = { outletId?: string; children: ReactNode };

// WHY: this guard only shapes the UI. Every endpoint still enforces outlet scope on the server.
export function RequireRole({ outletId, children }: RequireRoleProps) {
  const session = useSession();
  if (!session) return <Navigate to={ROUTES.login} replace />;
  if (outletId && session.user.outletId !== outletId) {
    return <Navigate to={ADMIN_HOME} replace />;
  }
  return <>{children}</>;
}
