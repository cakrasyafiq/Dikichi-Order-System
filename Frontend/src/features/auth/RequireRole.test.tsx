import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { clearSession, setSession } from '@/lib/auth/session';
import { RequireRole } from './RequireRole';

function signInAs(outletId: string) {
  setSession({
    token: 'jwt-token',
    expiresAt: Date.now() + 3_600_000,
    user: { outletId },
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/admin" element={<p>admin dashboard</p>} />
        <Route
          path="/outlet-01"
          element={
            <RequireRole outletId="OUT-01">
              <p>outlet 01 area</p>
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
    renderAt('/outlet-01');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('sends a signed-in user from another outlet back to their own admin dashboard', () => {
    signInAs('OUT-02');
    renderAt('/outlet-01');
    expect(screen.getByText('admin dashboard')).toBeInTheDocument();
  });

  it('shows the page to the matching outlet', () => {
    signInAs('OUT-01');
    renderAt('/outlet-01');
    expect(screen.getByText('outlet 01 area')).toBeInTheDocument();
  });
});
