import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { StaffRole } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';
import { ROLE_HOME } from '@/constants/staff';
import { useSession } from './useSession';

// WHY: the prop is not named "role" because the jsx-a11y lint rule reads that name as an ARIA role.
type RequireRoleProps = { allowed: StaffRole; children: ReactNode };

// WHY: this guard only shapes the UI. Every endpoint still enforces role and outlet scope on the server.
export function RequireRole({ allowed, children }: RequireRoleProps) {
  const session = useSession();
  if (!session) return <Navigate to={ROUTES.login} replace />;
  if (session.user.role !== allowed) return <Navigate to={ROLE_HOME[session.user.role]} replace />;
  return <>{children}</>;
}
