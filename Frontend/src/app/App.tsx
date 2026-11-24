import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { RequireRole } from '@/features/auth/RequireRole';
import { useSessionExpiry } from '@/features/auth/useSession';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderPage } from '@/pages/OrderPage';
import { StaffPlaceholderPage } from '@/pages/StaffPlaceholderPage';

export function App() {
  useSessionExpiry();

  return (
    <Routes>
      <Route path={ROUTES.home} element={<Navigate to={ROUTES.order} replace />} />
      <Route path={ROUTES.order} element={<OrderPage />} />
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route
        path={ROUTES.cashier}
        element={
          <RequireRole allowed="CASHIER">
            <StaffPlaceholderPage staffRole="CASHIER" />
          </RequireRole>
        }
      />
      <Route
        path={ROUTES.kitchen}
        element={
          <RequireRole allowed="KITCHEN">
            <StaffPlaceholderPage staffRole="KITCHEN" />
          </RequireRole>
        }
      />
      <Route
        path={ROUTES.master}
        element={
          <RequireRole allowed="MASTER">
            <StaffPlaceholderPage staffRole="MASTER" />
          </RequireRole>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
