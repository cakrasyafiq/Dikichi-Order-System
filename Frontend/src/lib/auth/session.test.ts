import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_STORAGE_KEY } from '@/constants/auth';
import { clearSession, getSession, setSession, subscribeSession, type Session } from './session';

const ONE_HOUR_MS = 3_600_000;

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    token: 'jwt-token',
    expiresAt: Date.now() + ONE_HOUR_MS,
    user: { username: 'cashier', role: 'CASHIER', outletId: 'OUT-01' },
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  clearSession();
  sessionStorage.clear();
});

describe('session store', () => {
  it('keeps the session in sessionStorage and returns it', () => {
    const session = makeSession();
    setSession(session);
    expect(getSession()).toEqual(session);
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? 'null')).toEqual(session);
  });

  it('returns the same object between reads so React sees a stable snapshot', () => {
    setSession(makeSession());
    expect(getSession()).toBe(getSession());
  });

  it('treats an expired session as signed out', () => {
    setSession(makeSession({ expiresAt: Date.now() - 1 }));
    expect(getSession()).toBeNull();
  });

  it('ignores stored data that is not valid JSON or has an unknown role', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, '{not json');
    expect(getSession()).toBeNull();

    const forged = { ...makeSession(), user: { username: 'x', role: 'ADMIN', outletId: null } };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(forged));
    expect(getSession()).toBeNull();
  });

  it('notifies subscribers on sign in and sign out, and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSession(listener);
    setSession(makeSession());
    clearSession();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setSession(makeSession());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stays signed in for this tab when sessionStorage rejects writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const session = makeSession();
    setSession(session);
    expect(getSession()).toEqual(session);
  });
});
