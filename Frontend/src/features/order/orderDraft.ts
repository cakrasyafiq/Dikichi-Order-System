import { z } from 'zod';
import { ORDER_LIMITS, TABLE_CODE_PATTERN } from '@/constants/order';

export const orderDraftSchema = z.object({
  outletId: z.string().min(1, 'The kitchen is not ready yet. Please try again in a moment.'),
  tableCode: z.string().regex(TABLE_CODE_PATTERN, 'Please choose your table'),
  customerName: z
    .string()
    .trim()
    .min(1, 'Please enter your name')
    .max(
      ORDER_LIMITS.nameMaxLength,
      `Name can be at most ${ORDER_LIMITS.nameMaxLength} characters`,
    ),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        quantity: z.number().int().min(1).max(ORDER_LIMITS.maxQuantity),
      }),
    )
    .min(1, 'Add at least one dish to your order')
    .max(
      ORDER_LIMITS.maxLines,
      `An order can have at most ${ORDER_LIMITS.maxLines} different dishes`,
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
