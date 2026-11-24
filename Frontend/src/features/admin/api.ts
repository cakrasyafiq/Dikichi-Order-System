import { z } from 'zod';
import type { MenuItem } from '@/features/menu/schema';
import { menuItemSchema } from '@/features/menu/schema';
import { v1OrderSchema, type V1Order } from '@/features/order/schema';
import { tableSchema, type DiningTable } from '@/features/table/schema';
import { apiRequest } from '@/lib/api/client';
import { mergeServerOrders, upsertCachedOrder } from './orderStore';

const v1OrderListSchema = z.array(v1OrderSchema);

export type EditableOrderInput = {
  tableCode: string;
  customerName: string;
  items: readonly { menuItemId: string; quantity: number }[];
};

export type ManagedOrderStatus = 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethodChoice = 'CASH' | 'QRIS' | 'CARD';

export async function fetchOutletOrders(outletId: string): Promise<V1Order[]> {
  const orders = await apiRequest(
    `/v1/orders?outletId=${encodeURIComponent(outletId)}`,
    v1OrderListSchema,
    { authenticated: true },
  );
  return mergeServerOrders(outletId, orders);
}

export async function updateOrderContents(
  order: V1Order,
  draft: EditableOrderInput,
): Promise<V1Order> {
  const body = {
    outletId: order.outletId,
    tableCode: draft.tableCode,
    customerName: draft.customerName.trim(),
    items: draft.items,
  };
  const updated = await apiRequest(`/v1/orders/${encodeURIComponent(order.id)}`, v1OrderSchema, {
    method: 'PUT',
    body,
    authenticated: true,
  });
  return upsertCachedOrder(updated);
}

export async function transitionOrderStatus(
  order: V1Order,
  targetStatus: ManagedOrderStatus,
  paymentMethod: PaymentMethodChoice = 'QRIS',
): Promise<V1Order> {
  if (targetStatus === 'PREPARING') {
    const paid = await apiRequest(
      `/v1/orders/${encodeURIComponent(order.id)}/pay`,
      v1OrderSchema,
      {
        method: 'POST',
        body: {
          paymentMethod,
          amountTendered: paymentMethod === 'CASH' ? order.totalAmount : null,
        },
        authenticated: true,
      },
    );
    return upsertCachedOrder(paid);
  }

  const patched = await apiRequest(
    `/v1/orders/${encodeURIComponent(order.id)}/status`,
    v1OrderSchema,
    {
      method: 'PATCH',
      body: { status: targetStatus },
      authenticated: true,
    },
  );
  return upsertCachedOrder(patched);
}

export async function createOutletTable(outletId: string, code: string): Promise<DiningTable> {
  return apiRequest(
    `/v1/outlets/${encodeURIComponent(outletId)}/tables`,
    tableSchema,
    {
      method: 'POST',
      body: { code: code.trim().toUpperCase() },
      authenticated: true,
    },
  );
}

export async function deleteOutletTable(outletId: string, code: string): Promise<void> {
  await apiRequest(
    `/v1/outlets/${encodeURIComponent(outletId)}/tables/${encodeURIComponent(code)}`,
    z.undefined(),
    {
      method: 'DELETE',
      authenticated: true,
    },
  );
}

export async function setMenuItemAvailability(
  menuItemId: string,
  available: boolean,
): Promise<MenuItem> {
  return apiRequest(
    `/v1/menu-items/${encodeURIComponent(menuItemId)}/availability`,
    menuItemSchema,
    {
      method: 'PATCH',
      body: { available },
      authenticated: true,
    },
  );
}
