import { apiRequest } from '@/lib/api/client';
import { menuListSchema } from './schema';

export function fetchMenu(outletId: string, signal?: AbortSignal) {
  const path = `/v1/outlets/${encodeURIComponent(outletId)}/menu-items`;
  return apiRequest(path, menuListSchema, signal ? { signal } : {});
}
