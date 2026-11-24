import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { RequireRole } from '@/features/auth/RequireRole';
import { useSessionExpiry } from '@/features/auth/useSession';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderPage } from '@/pages/OrderPage';

export function App() {
  useSessionExpiry();

  return (
    <Routes>
      <Route path={ROUTES.home} element={<Navigate to={ROUTES.order} replace />} />
      <Route path={ROUTES.order} element={<OrderPage />} />
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route
        path={ROUTES.admin}
        element={
          <RequireRole>
            <AdminDashboardPage initialTab="cashier" />
          </RequireRole>
        }
      />
      <Route
        path={ROUTES.cashier}
        element={
          <RequireRole>
            <AdminDashboardPage initialTab="cashier" />
          </RequireRole>
        }
      />
      <Route
        path={ROUTES.kitchen}
        element={
          <RequireRole>
            <AdminDashboardPage initialTab="orders" />
          </RequireRole>
        }
      />
      <Route
        path={ROUTES.master}
        element={
          <RequireRole>
            <AdminDashboardPage initialTab="management" />
          </RequireRole>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
