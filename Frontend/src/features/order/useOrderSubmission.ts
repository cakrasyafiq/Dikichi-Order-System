import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { ApiVersion } from '@/constants/order';
import type { CartApi } from '@/features/cart/useCart';
import { findUnavailableLines } from '@/features/cart/unavailable';
import type { MenuItem } from '@/features/menu/schema';
import { describeError } from '@/lib/api/describeError';
import { ApiError } from '@/lib/api/errors';
import { createOrder } from './api';
import { mapServerFieldErrors } from './formErrors';
import {
  validateOrderDraft,
  type OrderDraft,
  type OrderFormErrors,
  type OrderFormField,
} from './orderDraft';
import type { OrderReceipt } from './receipt';

type Params = {
  outletId: string | undefined;
  tableCode: string | null;
  cart: CartApi;
  refetchMenu: () => Promise<readonly MenuItem[] | undefined>;
};

type SubmitInput = { customerName: string; version: ApiVersion };

const ITEM_UNAVAILABLE_CODE = 'ITEM_UNAVAILABLE';

export function useOrderSubmission({ outletId, tableCode, cart, refetchMenu }: Params) {
  const mutation = useMutation({
    mutationFn: (input: { version: ApiVersion; draft: OrderDraft }) =>
      createOrder(input.version, input.draft),
  });
  const [errors, setErrors] = useState<OrderFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  async function removeSoldOutLines() {
    const menu = await refetchMenu();
    const gone = menu ? findUnavailableLines(cart.lines, menu) : [];
    if (gone.length === 0) {
      setFormError(
        'Beberapa hidangan sudah tidak tersedia. Silakan muat ulang halaman dan coba lagi.',
      );
      return;
    }
    cart.removeMany(gone.map((line) => line.menuItemId));
    setNotice(
      `Hidangan yang habis telah dihapus: ${gone.map((line) => line.name).join(', ')}. Silakan periksa kembali pesanan Anda.`,
    );
  }

  async function handleFailure(error: unknown) {
    if (!(error instanceof ApiError)) {
      setFormError(describeError(error));
      return;
    }
    const mapped = mapServerFieldErrors(error.fieldErrors);
    setErrors(mapped);
    if (error.code === ITEM_UNAVAILABLE_CODE) {
      await removeSoldOutLines();
      return;
    }
    if (Object.keys(mapped).length === 0) setFormError(describeError(error));
  }

  async function submit({ customerName, version }: SubmitInput) {
    // WHY: the backend has no idempotency key, so a second tap while a request is in flight must be ignored here.
    if (mutation.isPending) return;
    setFormError(null);
    setNotice(null);

    const checked = validateOrderDraft({
      outletId: outletId ?? '',
      tableCode: tableCode ?? '',
      customerName,
      items: cart.lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
    });
    setErrors(checked.ok ? {} : checked.errors);
    if (!checked.ok) return;

    try {
      const created = await mutation.mutateAsync({ version, draft: checked.data });
      setReceipt(created);
      cart.clear();
    } catch (error) {
      await handleFailure(error);
    }
  }

  return {
    submit,
    isPending: mutation.isPending,
    errors,
    formError,
    notice,
    receipt,
    dismissReceipt: () => setReceipt(null),
    clearError: (field: OrderFormField) =>
      setErrors((current) => ({ ...current, [field]: undefined })),
  };
}

export type SubmissionApi = ReturnType<typeof useOrderSubmission>;
