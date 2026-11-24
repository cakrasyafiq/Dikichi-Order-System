import type { ApiVersion } from '@/constants/order';
import { upsertCachedOrder } from '@/features/admin/orderStore';
import { apiRequest } from '@/lib/api/client';
import type { OrderDraft } from './orderDraft';
import { receiptFromV1, receiptFromV2, type OrderReceipt } from './receipt';
import { v1OrderSchema, v2OrderSchema } from './schema';

export async function createOrder(version: ApiVersion, draft: OrderDraft): Promise<OrderReceipt> {
  if (version === 'v1') {
    const order = await apiRequest('/v1/orders', v1OrderSchema, { method: 'POST', body: draft });
    upsertCachedOrder(order);
    return receiptFromV1(order);
  }

  const body = {
    customer: { name: draft.customerName },
    location: { outletId: draft.outletId, tableCode: draft.tableCode },
    items: draft.items,
  };
  const order = await apiRequest('/v2/orders', v2OrderSchema, { method: 'POST', body });
  upsertCachedOrder({
    id: order.id,
    orderNumber: order.orderNumber,
    outletId: order.location.outletId,
    tableCode: order.location.tableCode,
    customerName: order.customer.name,
    status: order.status,
    items: order.items,
    totalAmount: order.paymentSummary.totalAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  });
  return receiptFromV2(order);
}
