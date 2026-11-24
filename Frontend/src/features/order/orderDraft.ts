import { z } from 'zod';
import { ORDER_LIMITS, TABLE_CODE_PATTERN } from '@/constants/order';

export const orderDraftSchema = z.object({
  outletId: z.string().min(1, 'Outlet belum siap. Silakan coba beberapa saat lagi.'),
  tableCode: z.string().regex(TABLE_CODE_PATTERN, 'Silakan pilih meja Anda'),
  customerName: z
    .string()
    .trim()
    .min(1, 'Silakan masukkan nama Anda')
    .max(
      ORDER_LIMITS.nameMaxLength,
      `Nama maksimal ${ORDER_LIMITS.nameMaxLength} karakter`,
    ),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        quantity: z.number().int().min(1).max(ORDER_LIMITS.maxQuantity),
      }),
    )
    .min(1, 'Tambahkan minimal satu hidangan ke pesanan Anda')
    .max(
      ORDER_LIMITS.maxLines,
      `Satu pesanan maksimal ${ORDER_LIMITS.maxLines} jenis hidangan`,
    ),
});

export type OrderDraft = z.infer<typeof orderDraftSchema>;

export type OrderFormField = 'outletId' | 'tableCode' | 'customerName' | 'items';
export type OrderFormErrors = Partial<Record<OrderFormField, string>>;

export type DraftValidation =
  { ok: true; data: OrderDraft } | { ok: false; errors: OrderFormErrors };

const FORM_FIELDS: readonly string[] = ['outletId', 'tableCode', 'customerName', 'items'];

function isFormField(value: unknown): value is OrderFormField {
  return typeof value === 'string' && FORM_FIELDS.includes(value);
}

export function validateOrderDraft(input: unknown): DraftValidation {
  const parsed = orderDraftSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: OrderFormErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (isFormField(field) && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}
