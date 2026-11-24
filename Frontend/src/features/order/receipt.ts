import type { ApiVersion } from '@/constants/order';
import type { OrderItem, V1Order, V2Order } from './schema';

export type OrderReceipt = {
  version: ApiVersion;
  orderNumber: string;
  status: string;
  customerName: string;
  outletId: string;
  tableCode: string;
  items: readonly OrderItem[];
  totalAmount: number;
  raw: unknown;
};

export function receiptFromV1(order: V1Order): OrderReceipt {
  return {
    version: 'v1',
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    outletId: order.outletId,
    tableCode: order.tableCode,
    items: order.items,
    totalAmount: order.totalAmount,
    raw: order,
  };
}

export function receiptFromV2(order: V2Order): OrderReceipt {
  return {
    version: 'v2',
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customer.name,
    outletId: order.location.outletId,
    tableCode: order.location.tableCode,
    items: order.items,
    totalAmount: order.paymentSummary.totalAmount,
    raw: order,
  };
}
