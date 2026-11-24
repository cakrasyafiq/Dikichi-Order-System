import { apiRequest } from '@/lib/api/client';
import { outletListSchema } from './schema';

export function fetchOutlets(signal?: AbortSignal) {
  return apiRequest('/v1/outlets', outletListSchema, signal ? { signal } : {});
}
