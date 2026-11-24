import { useQuery } from '@tanstack/react-query';
import { fetchMenu } from './api';

export function useMenu(outletId: string | undefined) {
  return useQuery({
    queryKey: ['menu', outletId],
    queryFn: ({ signal }) => fetchMenu(outletId ?? '', signal),
    enabled: Boolean(outletId),
  });
}
