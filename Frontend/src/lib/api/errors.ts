import { z } from 'zod';

export const fieldErrorSchema = z.object({ field: z.string(), message: z.string() });
export type FieldError = z.infer<typeof fieldErrorSchema>;

export const apiErrorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
  errors: z.array(fieldErrorSchema).nullish(),
});

export const CLIENT_ERROR_CODE = {
  network: 'NETWORK_ERROR',
  timeout: 'TIMEOUT',
  invalidResponse: 'INVALID_RESPONSE',
  server: 'SERVER_ERROR',
  request: 'REQUEST_FAILED',
  rateLimited: 'RATE_LIMITED',
} as const;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: readonly FieldError[];

  constructor(init: {
    status: number;
    code: string;
    message: string;
    fieldErrors?: readonly FieldError[];
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? [];
  }
}

export function isClientFault(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}
