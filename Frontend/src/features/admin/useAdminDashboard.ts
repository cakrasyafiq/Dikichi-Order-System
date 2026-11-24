import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMenu } from '@/features/menu/useMenu';
import type { MenuItem } from '@/features/menu/schema';
import type { V1Order } from '@/features/order/schema';
import { useOutlets } from '@/features/outlet/useOutlets';
import type { DiningTable } from '@/features/table/schema';
import { useTables } from '@/features/table/useTables';
import {
  createOutletTable,
  deleteOutletTable,
  fetchOutletOrders,
  setMenuItemAvailability,
  transitionOrderStatus,
  updateOrderContents,
  type EditableOrderInput,
  type ManagedOrderStatus,
  type PaymentMethodChoice,
} from './api';

const ORDERS_QUERY_KEY = 'admin-orders';

export function useAdminDashboard(authenticatedOutletId: string | undefined) {
  const queryClient = useQueryClient();
  const outletsQuery = useOutlets();
  // WHY: strictly lock dashboard operations to the authenticated outletId from the session.
  const outletId = authenticatedOutletId;
  const outlet = outletsQuery.data?.find((item) => item.id === outletId);

  const tablesQuery = useTables(outletId);
  const menuQuery = useMenu(outletId);

  const ordersQuery = useQuery({
    queryKey: [ORDERS_QUERY_KEY, outletId],
    queryFn: () => fetchOutletOrders(outletId!),
    enabled: Boolean(outletId),
    refetchInterval: 8_000,
  });

  function syncOrderInCache(updated: V1Order) {
    if (!outletId) return;
    queryClient.setQueryData<V1Order[]>([ORDERS_QUERY_KEY, outletId], (current = []) => {
      const exists = current.some((order) => order.id === updated.id);
      return exists
        ? current.map((order) => (order.id === updated.id ? updated : order))
        : [...current, updated];
    });
  }

  const editOrderMutation = useMutation({
    mutationFn: ({ order, draft }: { order: V1Order; draft: EditableOrderInput }) =>
      updateOrderContents(order, draft),
    onSuccess: (updated) => syncOrderInCache(updated),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      order,
      status,
      paymentMethod,
    }: {
      order: V1Order;
      status: ManagedOrderStatus;
      paymentMethod?: PaymentMethodChoice;
    }) => transitionOrderStatus(order, status, paymentMethod),
    onSuccess: (updated) => syncOrderInCache(updated),
  });

  const addTableMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!outletId) throw new Error('Outlet belum dipilih');
      const normalized = code.trim().toUpperCase();
      return createOutletTable(outletId, normalized);
    },
    onSuccess: (created) => {
      if (!outletId) return;
      queryClient.setQueryData<DiningTable[]>(['tables', outletId], (current = []) => {
        if (current.some((t) => t.code === created.code)) return current;
        return [...current, created].sort((a, b) => a.code.localeCompare(b.code));
      });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!outletId) throw new Error('Outlet belum dipilih');
      await deleteOutletTable(outletId, code);
      return code;
    },
    onSuccess: (removedCode) => {
      if (!outletId) return;
      queryClient.setQueryData<DiningTable[]>(['tables', outletId], (current = []) =>
        current.filter((table) => table.code !== removedCode),
      );
    },
  });

  const toggleMenuStockMutation = useMutation({
    mutationFn: ({ item, available }: { item: MenuItem; available: boolean }) =>
      setMenuItemAvailability(item.id, available),
    onSuccess: (updated) => {
      if (!outletId) return;
      queryClient.setQueryData<MenuItem[]>(['menu', outletId], (current = []) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    },
  });

  async function refreshAll() {
    await Promise.all([
      outletsQuery.refetch(),
      tablesQuery.refetch(),
      menuQuery.refetch(),
      ordersQuery.refetch(),
    ]);
  }

  return {
    outletsQuery,
    outlet,
    outletId,
    tablesQuery,
    menuQuery,
    ordersQuery,
    editOrderMutation,
    statusMutation,
    addTableMutation,
    deleteTableMutation,
    toggleMenuStockMutation,
    refreshAll,
  };
}
