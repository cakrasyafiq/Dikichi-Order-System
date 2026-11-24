import { useMutation } from '@tanstack/react-query';
import { setSession } from '@/lib/auth/session';
import { login } from './api';

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: (session) => setSession(session),
  });
}
