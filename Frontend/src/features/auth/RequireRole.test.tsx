import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import type { StaffRole } from '@/constants/auth';
import { clearSession, setSession } from '@/lib/auth/session';
import { RequireRole } from './RequireRole';

function signInAs(role: StaffRole) {
  setSession({
    token: 'jwt-token',
    expiresAt: Date.now() + 3_600_000,
    user: { username: role.toLowerCase(), role, outletId: role === 'MASTER' ? null : 'OUT-01' },
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/kitchen" element={<p>kitchen area</p>} />
        <Route
          path="/cashier"
          element={
            <RequireRole allowed="CASHIER">
              <p>cashier area</p>
            </RequireRole>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  clearSession();
});

describe('RequireRole', () => {
  it('sends a guest to the login page', () => {
    renderAt('/cashier');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('sends a signed-in user with another role to their own dashboard', () => {
    signInAs('KITCHEN');
    renderAt('/cashier');
    expect(screen.getByText('kitchen area')).toBeInTheDocument();
  });

  it('shows the page to the matching role', () => {
    signInAs('CASHIER');
    renderAt('/cashier');
    expect(screen.getByText('cashier area')).toBeInTheDocument();
  });
});
