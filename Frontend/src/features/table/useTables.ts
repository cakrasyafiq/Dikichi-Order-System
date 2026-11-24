import { useQuery } from '@tanstack/react-query';
import { fetchTables } from './api';

// WHY: tables change only when the Master edits them, so a longer window avoids refetching on every visit.
const TABLES_STALE_MS = 5 * 60_000;

export function useTables(outletId: string | undefined) {
  return useQuery({
    queryKey: ['tables', outletId],
    queryFn: ({ signal }) => fetchTables(outletId ?? '', signal),
    enabled: Boolean(outletId),
    staleTime: TABLES_STALE_MS,
  });
}
