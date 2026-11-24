import type { ApiVersion } from '@/constants/order';
import { apiRequest } from '@/lib/api/client';
import type { OrderDraft } from './orderDraft';
import { receiptFromV1, receiptFromV2, type OrderReceipt } from './receipt';
import { v1OrderSchema, v2OrderSchema } from './schema';

export async function createOrder(version: ApiVersion, draft: OrderDraft): Promise<OrderReceipt> {
  if (version === 'v1') {
    const order = await apiRequest('/v1/orders', v1OrderSchema, { method: 'POST', body: draft });
    return receiptFromV1(order);
  }

  const body = {
    customer: { name: draft.customerName },
    location: { outletId: draft.outletId, tableCode: draft.tableCode },
    items: draft.items,
  };
  const order = await apiRequest('/v2/orders', v2OrderSchema, { method: 'POST', body });
  return receiptFromV2(order);
}
