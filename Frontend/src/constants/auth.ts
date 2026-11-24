export const SESSION_STORAGE_KEY = 'dikichi.session';

export const STAFF_ROLES = ['MASTER', 'CASHIER', 'KITCHEN'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const LOGIN_LIMITS = {
  usernameMaxLength: 50,
  passwordMaxLength: 100,
} as const;

// WHY: setTimeout stores its delay in 32 bits, so a longer value would fire immediately.
export const MAX_TIMER_MS = 2 ** 31 - 1;
