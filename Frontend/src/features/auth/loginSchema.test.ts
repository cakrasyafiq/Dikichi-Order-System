import { describe, expect, it } from 'vitest';
import { validateLoginForm } from './loginSchema';

describe('validateLoginForm', () => {
  it('trims and uppercases the outletId but keeps the password exactly as typed', () => {
    const result = validateLoginForm({ outletId: '  out-01 ', password: ' secret ' });
    expect(result).toEqual({ ok: true, data: { outletId: 'OUT-01', password: ' secret ' } });
  });

  it('reports both missing fields at once', () => {
    expect(validateLoginForm({ outletId: ' ', password: '' })).toEqual({
      ok: false,
      errors: {
        outletId: 'Please enter your Outlet ID',
        password: 'Please enter your password',
      },
    });
  });

  it('rejects values longer than the backend accepts', () => {
    const result = validateLoginForm({ outletId: 'a'.repeat(21), password: 'b'.repeat(101) });
    expect(result.ok).toBe(false);
  });
});
