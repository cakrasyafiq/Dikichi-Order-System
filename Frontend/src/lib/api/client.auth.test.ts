import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { clearSession, getSession, setSession } from '@/lib/auth/session';
import { apiRequest } from './client';
import { describeError } from './describeError';
import { ApiError } from './errors';

const schema = z.object({ id: z.string() });

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function headersOf(fetchMock: ReturnType<typeof stubFetch>): Record<string, string> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return init.headers as Record<string, string>;
}

function signIn() {
  setSession({
    token: 'jwt-token',
    expiresAt: Date.now() + 3_600_000,
    user: { username: 'cashier', role: 'CASHIER', outletId: 'OUT-01' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession();
});

describe('apiRequest authentication', () => {
  it('sends the bearer token only when the call asks for it', async () => {
    signIn();
    const fetchMock = stubFetch(new Response(JSON.stringify({ id: 'a' })));
    await apiRequest('/v1/orders', schema, { authenticated: true });
    expect(headersOf(fetchMock)['Authorization']).toBe('Bearer jwt-token');

    const publicFetch = stubFetch(new Response(JSON.stringify({ id: 'a' })));
    await apiRequest('/v1/outlets/OUT-01', schema);
    expect(headersOf(publicFetch)).not.toHaveProperty('Authorization');
  });

  it('signs out when an authenticated call gets 401', async () => {
    signIn();
    stubFetch(new Response('{}', { status: 401 }));
    await expect(apiRequest('/v1/orders', schema, { authenticated: true })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(getSession()).toBeNull();
  });

  it('keeps the session when a public call gets 401', async () => {
    signIn();
    stubFetch(new Response('{}', { status: 401 }));
    await expect(apiRequest('/v1/outlets', schema)).rejects.toBeInstanceOf(ApiError);
    expect(getSession()).not.toBeNull();
  });

  it('labels a non-JSON 429 as a rate limit', async () => {
    stubFetch(new Response('<html>429</html>', { status: 429 }));
    await expect(apiRequest('/v1/auth/login', schema)).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    });
  });
});

describe('describeError', () => {
  it('shows backend messages for 4xx and hides 5xx details', () => {
    const clientFault = new ApiError({
      status: 409,
      code: 'ITEM_UNAVAILABLE',
      message: 'Sold out',
    });
    const serverFault = new ApiError({ status: 500, code: 'BOOM', message: 'stack trace here' });
    expect(describeError(clientFault)).toBe('Sold out');
    expect(describeError(serverFault)).toBe('Terjadi kesalahan. Silakan coba lagi.');
    expect(describeError(new Error('x'))).toBe('Terjadi kesalahan. Silakan coba lagi.');
  });
});
