import { useQuery } from '@tanstack/react-query';
import { fetchOutlets } from './api';

export const OUTLETS_QUERY_KEY = ['outlets'] as const;
// WHY: outlets change only when the Master edits them, so a longer window avoids refetching on every visit.
const OUTLETS_STALE_MS = 5 * 60_000;

export function useOutlets() {
  return useQuery({
    queryKey: OUTLETS_QUERY_KEY,
    queryFn: ({ signal }) => fetchOutlets(signal),
    staleTime: OUTLETS_STALE_MS,
  });
}
