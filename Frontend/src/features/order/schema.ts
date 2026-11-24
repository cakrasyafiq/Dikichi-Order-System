import { z } from 'zod';

export const orderItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  subtotal: z.number(),
});

const timestamps = { createdAt: z.string(), updatedAt: z.string() };

export const v1OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  outletId: z.string(),
  tableCode: z.string(),
  customerName: z.string(),
  status: z.string(),
  items: z.array(orderItemSchema),
  totalAmount: z.number(),
  ...timestamps,
});

export const v2OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  customer: z.object({ name: z.string() }),
  location: z.object({ outletId: z.string(), tableCode: z.string() }),
  items: z.array(orderItemSchema),
  paymentSummary: z.object({
    totalAmount: z.number(),
    paymentStatus: z.string(),
    paymentMethod: z.string().nullish(),
    amountTendered: z.number().nullish(),
    change: z.number().nullish(),
  }),
  ...timestamps,
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export type V1Order = z.infer<typeof v1OrderSchema>;
export type V2Order = z.infer<typeof v2OrderSchema>;
