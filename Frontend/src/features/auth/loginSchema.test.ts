import { describe, expect, it } from 'vitest';
import { validateLoginForm } from './loginSchema';

describe('validateLoginForm', () => {
  it('trims the username but keeps the password exactly as typed', () => {
    const result = validateLoginForm({ username: '  cashier ', password: ' secret ' });
    expect(result).toEqual({ ok: true, data: { username: 'cashier', password: ' secret ' } });
  });

  it('reports both missing fields at once', () => {
    expect(validateLoginForm({ username: ' ', password: '' })).toEqual({
      ok: false,
      errors: {
        username: 'Please enter your username',
        password: 'Please enter your password',
      },
    });
  });

  it('rejects values longer than the backend accepts', () => {
    const result = validateLoginForm({ username: 'a'.repeat(51), password: 'b'.repeat(101) });
    expect(result.ok).toBe(false);
  });
});
