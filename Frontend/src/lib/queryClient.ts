import { QueryClient } from '@tanstack/react-query';
import { isClientFault } from '@/lib/api/errors';

const MAX_RETRIES = 2;
const DEFAULT_STALE_MS = 30_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_MS,
      refetchOnWindowFocus: false,
      // WHY: retrying a 4xx cannot change the answer, only transient network and 5xx failures are worth a retry.
      retry: (failureCount, error) => !isClientFault(error) && failureCount < MAX_RETRIES,
    },
  },
});
