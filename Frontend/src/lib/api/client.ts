import type { ZodTypeDef, ZodType } from 'zod';
import { API_BASE_PATH, API_TIMEOUT_MS } from '@/config/api';
import { clearSession, getSession } from '@/lib/auth/session';
import { ApiError, CLIENT_ERROR_CODE, apiErrorBodySchema } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
  // WHY: the token is sent only when a call asks for it, so public endpoints never see staff credentials.
  authenticated?: boolean;
};

export async function apiRequest<T>(
  path: string,
  schema: ZodType<T, ZodTypeDef, unknown>,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(path, options);
  const payload = await readJson(response);
  if (response.status === 401 && options.authenticated) clearSession();
  if (!response.ok) throw toApiError(response.status, payload);

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError({
      status: response.status,
      code: CLIENT_ERROR_CODE.invalidResponse,
      message: 'Response did not match the expected shape',
    });
  }
  return parsed.data;
}

async function send(
  path: string,
  { method = 'GET', body, signal, authenticated = false }: RequestOptions,
) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, API_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    return await fetch(`${API_BASE_PATH}${path}`, {
      method,
      headers: buildHeaders(body !== undefined, authenticated),
      body: body === undefined ? null : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    // WHY: a caller-initiated abort must propagate untouched so TanStack Query treats it as a cancel.
    if (signal?.aborted) throw error;
    throw transportError(timedOut);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

function buildHeaders(hasBody: boolean, authenticated: boolean): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (hasBody) headers['Content-Type'] = 'application/json';
  const token = authenticated ? getSession()?.token : undefined;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function transportError(timedOut: boolean): ApiError {
  return timedOut
    ? new ApiError({ status: 0, code: CLIENT_ERROR_CODE.timeout, message: 'Request timed out' })
    : new ApiError({
        status: 0,
        code: CLIENT_ERROR_CODE.network,
        message: 'Network request failed',
      });
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const body = apiErrorBodySchema.safeParse(payload);
  if (body.success) {
    return new ApiError({
      status,
      code: body.data.code,
      message: body.data.message,
      fieldErrors: body.data.errors ?? [],
    });
  }
  // WHY: proxies such as Nginx answer 502/504 with HTML, so the body cannot be trusted to follow the contract.
  return new ApiError({ status, code: fallbackCode(status), message: `HTTP ${status}` });
}

function fallbackCode(status: number): string {
  if (status === 429) return CLIENT_ERROR_CODE.rateLimited;
  return status >= 500 ? CLIENT_ERROR_CODE.server : CLIENT_ERROR_CODE.request;
}
