import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { MAX_TIMER_MS } from '@/constants/auth';
import { clearSession, getSession, subscribeSession, type Session } from '@/lib/auth/session';

export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, getSession);
}

// WHY: the token expires after 8 hours with no refresh, so the UI signs out on time instead of on the next failed call.
export function useSessionExpiry(): void {
  const expiresAt = useSession()?.expiresAt;

  useEffect(() => {
    if (expiresAt === undefined) return undefined;
    const delay = Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMER_MS);
    const timer = setTimeout(clearSession, delay);
    return () => clearTimeout(timer);
  }, [expiresAt]);
}

export function useLogout(): () => void {
  const queryClient = useQueryClient();
  // WHY: cached staff data must not stay readable after sign out.
  return useCallback(() => {
    clearSession();
    queryClient.clear();
  }, [queryClient]);
}
