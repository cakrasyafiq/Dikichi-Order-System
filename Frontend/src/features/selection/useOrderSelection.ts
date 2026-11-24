import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEARCH_PARAMS } from '@/constants/routes';
import { TABLE_CODE_PATTERN } from '@/constants/order';
import { useOutlets } from '@/features/outlet/useOutlets';
import type { DiningTable } from '@/features/table/schema';
import { useTables } from '@/features/table/useTables';

type TableResolution = { tableCode: string | null; notice: string | null };

function resolveTable(
  requested: string | null,
  tables: readonly DiningTable[] | undefined,
): TableResolution {
  if (!requested) return { tableCode: null, notice: null };
  if (!tables) {
    // WHY: show the QR-provided code right away, the server still validates it on submit.
    return { tableCode: TABLE_CODE_PATTERN.test(requested) ? requested : null, notice: null };
  }
  if (tables.some((table) => table.code === requested))
    return { tableCode: requested, notice: null };
  return { tableCode: null, notice: `Meja ${requested} tidak ditemukan. Silakan pilih meja Anda.` };
}

export function useOrderSelection() {
  const [params, setParams] = useSearchParams();
  const outletsQuery = useOutlets();
  const requestedOutlet = params.get(SEARCH_PARAMS.outlet);
  const requestedTable = params.get(SEARCH_PARAMS.table);

  const outlets = outletsQuery.data;
  const outlet = outlets?.find((item) => item.id === requestedOutlet) ?? outlets?.[0];
  // WHY: a QR link carries the outlet id, so menu and tables can load in parallel with the outlet list.
  const outletId = outlet?.id ?? requestedOutlet ?? undefined;

  const tablesQuery = useTables(outletId);
  const { tableCode, notice: tableNotice } = resolveTable(requestedTable, tablesQuery.data);

  const setOutlet = useCallback(
    (id: string) => setParams({ [SEARCH_PARAMS.outlet]: id }, { replace: true }),
    [setParams],
  );
  const setTable = useCallback(
    (code: string) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set(SEARCH_PARAMS.table, code);
          if (outletId) next.set(SEARCH_PARAMS.outlet, outletId);
          return next;
        },
        { replace: true },
      ),
    [setParams, outletId],
  );

  return {
    outletsQuery,
    outlet,
    outletId,
    tablesQuery,
    tableCode,
    tableNotice,
    setOutlet,
    setTable,
  };
}
