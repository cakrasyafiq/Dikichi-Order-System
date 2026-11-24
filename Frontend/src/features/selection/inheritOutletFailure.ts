import type { QueryView } from '@/lib/queryView';

// WHY: queries keyed by outlet stay pending forever when the outlet list itself failed, so they report that failure.
export function inheritOutletFailure<T>(
  view: QueryView<T>,
  outlets: QueryView<unknown>,
  outletId: string | undefined,
): QueryView<T> {
  if (outletId || !outlets.isError) return view;
  return {
    data: undefined,
    isPending: false,
    isError: true,
    error: outlets.error,
    refetch: outlets.refetch,
  };
}
