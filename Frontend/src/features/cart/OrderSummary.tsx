import { useState } from 'react';
import { DEFAULT_API_VERSION, ORDER_LIMITS, type ApiVersion } from '@/constants/order';
import type { SubmissionApi } from '@/features/order/useOrderSubmission';
import { CartLines } from './CartLines';
import type { CartApi } from './useCart';
import { VersionToggle } from './VersionToggle';

type OrderSummaryProps = {
  cart: CartApi;
  tableCode: string | null;
  submission: SubmissionApi;
};

const FIELD_ERROR_CLASS = 'm-0 mt-1 text-[12.5px] font-semibold text-brand';

export function OrderSummary({ cart, tableCode, submission }: OrderSummaryProps) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState<ApiVersion>(DEFAULT_API_VERSION);
  const { errors, formError, notice, isPending } = submission;
  const alertMessage = formError ?? errors.outletId ?? errors.items;

  return (
    <section
      id="order-summary"
      aria-labelledby="order-summary-heading"
      className="scroll-mt-4 rounded-lg border border-line bg-surface p-6 shadow-card"
    >
      <h2
        id="order-summary-heading"
        className="m-0 mb-5 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface"
      >
        Pesanan Anda
      </h2>
      <CartLines cart={cart} />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submission.submit({ customerName: name, version });
        }}
      >
        <div className="mb-4">
          <label
            htmlFor="customer-name"
            className="mb-1 block text-[13.5px] font-semibold text-muted"
          >
            Nama Anda
          </label>
          <input
            id="customer-name"
            name="customerName"
            type="text"
            autoComplete="name"
            maxLength={ORDER_LIMITS.nameMaxLength}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              submission.clearError('customerName');
            }}
            aria-invalid={Boolean(errors.customerName)}
            aria-describedby={errors.customerName ? 'customer-name-error' : undefined}
            className="w-full rounded-sm border border-line bg-surface px-3 py-[10px] text-sm text-brand"
          />
          {errors.customerName ? (
            <p id="customer-name-error" className={FIELD_ERROR_CLASS}>
              {errors.customerName}
            </p>
          ) : null}
        </div>
        <p className="m-0 mb-4 text-[13.5px] font-semibold text-muted">
          Meja: <span className="font-bold text-brand">{tableCode ?? 'belum dipilih'}</span>
          {errors.tableCode ? (
            <span className={`${FIELD_ERROR_CLASS} block`}>{errors.tableCode}</span>
          ) : null}
        </p>
        <VersionToggle value={version} onChange={setVersion} />
        {alertMessage ? (
          <p
            role="alert"
            className={`${FIELD_ERROR_CLASS} mb-3 mt-0 rounded-sm border border-magenta p-3`}
          >
            {alertMessage}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className={`${FIELD_ERROR_CLASS} mb-3 mt-0 rounded-sm bg-tint p-3`}>
            {notice}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending || cart.count === 0}
          aria-busy={isPending}
          className="w-full rounded-full bg-magenta px-5 py-3 text-xs font-extrabold uppercase tracking-[0.03em] text-surface transition-colors duration-fast hover:bg-magenta-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Mengirim...' : 'Kirim Pesanan'}
        </button>
      </form>
    </section>
  );
}
