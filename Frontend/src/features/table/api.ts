import { apiRequest } from '@/lib/api/client';
import { tableListSchema } from './schema';

export function fetchTables(outletId: string, signal?: AbortSignal) {
  const path = `/v1/outlets/${encodeURIComponent(outletId)}/tables`;
  return apiRequest(path, tableListSchema, signal ? { signal } : {});
}
