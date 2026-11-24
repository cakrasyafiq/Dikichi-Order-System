import { z } from 'zod';
import { LOGIN_LIMITS } from '@/constants/auth';

export const loginFormSchema = z.object({
  outletId: z
    .string()
    .trim()
    .min(1, 'Please enter your Outlet ID')
    .max(LOGIN_LIMITS.outletIdMaxLength, `At most ${LOGIN_LIMITS.outletIdMaxLength} characters`)
    .transform((value) => value.toUpperCase()),
  // WHY: passwords are never trimmed, leading or trailing spaces may be part of the secret.
  password: z
    .string()
    .min(1, 'Please enter your password')
    .max(LOGIN_LIMITS.passwordMaxLength, `At most ${LOGIN_LIMITS.passwordMaxLength} characters`),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type LoginFormField = keyof LoginFormValues;
export type LoginFormErrors = Partial<Record<LoginFormField, string>>;

export type LoginFormValidation =
  { ok: true; data: LoginFormValues } | { ok: false; errors: LoginFormErrors };

export function validateLoginForm(input: unknown): LoginFormValidation {
  const parsed = loginFormSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: LoginFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if ((field === 'outletId' || field === 'password') && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}
