import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSession, getSession, setSession } from '@/lib/auth/session';
import { LoginPage } from './LoginPage';

const LOGIN_OK = {
  accessToken: 'jwt-token',
  tokenType: 'Bearer',
  expiresIn: 28_800,
  user: { username: 'cashier', role: 'CASHIER', outletId: 'OUT-01' },
};

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderLogin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cashier" element={<p>cashier home</p>} />
          <Route path="/master" element={<p>master home</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fillAndSubmit(username: string, password: string) {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession();
});

describe('LoginPage', () => {
  it('asks for both fields without calling the server', () => {
    const fetchMock = stubFetch(new Response('{}'));
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(screen.getByText('Please enter your username')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the generic failure and keeps what was typed after a 401', async () => {
    const body = { code: 'UNAUTHORIZED', message: 'Invalid username or password', errors: [] };
    stubFetch(new Response(JSON.stringify(body), { status: 401 }));
    renderLogin();
    fillAndSubmit('cashier', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
    expect(screen.getByLabelText('Username')).toHaveValue('cashier');
    expect(getSession()).toBeNull();
  });

  it('explains the rate limit that Nginx answers with a non-JSON 429', async () => {
    stubFetch(new Response('<html>Too Many Requests</html>', { status: 429 }));
    renderLogin();
    fillAndSubmit('cashier', 'secret');
    expect(await screen.findByRole('alert')).toHaveTextContent('Terlalu banyak percobaan');
  });

  it('signs in, stores the session, and opens the dashboard of the role', async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify(LOGIN_OK), { status: 200 }));
    renderLogin();
    fillAndSubmit('  cashier ', 'secret');

    expect(await screen.findByText('cashier home')).toBeInTheDocument();
    expect(getSession()?.user).toEqual({
      username: 'cashier',
      role: 'CASHIER',
      outletId: 'OUT-01',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/auth/login');
    expect(JSON.parse(String(init.body))).toEqual({ username: 'cashier', password: 'secret' });
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('skips the form for someone who is already signed in', () => {
    setSession({
      token: 'jwt-token',
      expiresAt: Date.now() + 3_600_000,
      user: { username: 'master', role: 'MASTER', outletId: null },
    });
    renderLogin();
    expect(screen.getByText('master home')).toBeInTheDocument();
  });
});
