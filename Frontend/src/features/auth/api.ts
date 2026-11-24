import { apiRequest } from '@/lib/api/client';
import type { Session } from '@/lib/auth/session';
import { loginResponseSchema } from './schema';

export type LoginCredentials = { username: string; password: string };

export async function login(credentials: LoginCredentials): Promise<Session> {
  const response = await apiRequest('/v1/auth/login', loginResponseSchema, {
    method: 'POST',
    body: credentials,
  });
  return {
    token: response.accessToken,
    expiresAt: Date.now() + response.expiresIn * 1000,
    user: {
      username: response.user.username,
      role: response.user.role,
      outletId: response.user.outletId ?? null,
    },
  };
}
