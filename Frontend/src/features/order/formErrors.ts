import type { FieldError } from '@/lib/api/errors';
import type { OrderFormErrors, OrderFormField } from './orderDraft';

// WHY: v1 reports flat paths (customerName) and v2 nested ones (customer.name), so both map to one form field.
function fieldFor(path: string): OrderFormField | undefined {
  if (/(^|\.)customerName$|^customer\.name$/.test(path)) return 'customerName';
  if (/(^|\.)tableCode$/.test(path)) return 'tableCode';
  if (/(^|\.)outletId$/.test(path)) return 'outletId';
  if (path.startsWith('items')) return 'items';
  return undefined;
}

export function mapServerFieldErrors(errors: readonly FieldError[]): OrderFormErrors {
  const mapped: OrderFormErrors = {};
  for (const { field, message } of errors) {
    const target = fieldFor(field);
    if (target && !mapped[target]) mapped[target] = message;
  }
  return mapped;
}
