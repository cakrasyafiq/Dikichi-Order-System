import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { API_TIMEOUT_MS } from '@/config/api';
import { apiRequest } from './client';
import { ApiError } from './errors';

const schema = z.object({ id: z.string() });

function stubFetch(response: Response) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('apiRequest', () => {
  it('returns validated data on success', async () => {
    stubFetch(new Response(JSON.stringify({ id: 'OUT-01' }), { status: 200 }));
    await expect(apiRequest('/v1/outlets/OUT-01', schema)).resolves.toEqual({ id: 'OUT-01' });
  });

  it('maps the backend error contract to ApiError with field errors', async () => {
    const body = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      errors: [{ field: 'customerName', message: 'must not be blank' }],
    };
    stubFetch(new Response(JSON.stringify(body), { status: 400 }));

    const error = await apiRequest('/v1/orders', schema).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: [{ field: 'customerName', message: 'must not be blank' }],
    });
  });

  it('treats a non-JSON gateway failure as a server error', async () => {
    stubFetch(new Response('<html>Bad Gateway</html>', { status: 502 }));
    await expect(apiRequest('/v1/outlets', schema)).rejects.toMatchObject({
      status: 502,
      code: 'SERVER_ERROR',
    });
  });

  it('rejects a payload that does not match the schema', async () => {
    stubFetch(new Response(JSON.stringify({ unexpected: true }), { status: 200 }));
    await expect(apiRequest('/v1/outlets', schema)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('reports a network failure with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(apiRequest('/v1/outlets', schema)).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('aborts and reports a timeout when the server never answers', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );

    const pending = expect(apiRequest('/v1/outlets', schema)).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 1);
    await pending;
  });
});
