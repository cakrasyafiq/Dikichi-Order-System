import { useEffect, useRef } from 'react';
import { ORDER_STATUS_LABELS } from '@/constants/order';
import { formatRupiah } from '@/lib/format';
import type { OrderReceipt } from './receipt';

type OrderConfirmationProps = { receipt: OrderReceipt; onDismiss: () => void };

export function OrderConfirmation({ receipt, onDismiss }: OrderConfirmationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView?.({ block: 'start' });
  }, []);

  return (
    <section
      aria-labelledby="confirmation-heading"
      className="rounded-lg border border-magenta bg-surface p-6 shadow-card"
    >
      <span className="mb-4 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface">
        Order Sent
      </span>
      <h2
        id="confirmation-heading"
        ref={headingRef}
        tabIndex={-1}
        className="m-0 mb-1 font-display text-xl font-extrabold text-brand focus:outline-none"
      >
        Thank you, {receipt.customerName}!
      </h2>
      <p className="m-0 mb-4 text-sm text-muted">Show this order number to the cashier.</p>
      <p className="m-0 mb-4 font-display text-[clamp(28px,4vw,40px)] font-black leading-none text-brand">
        {receipt.orderNumber}
      </p>
      <dl className="m-0 mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13.5px]">
        <dt className="font-semibold text-muted">Table</dt>
        <dd className="m-0 font-bold text-brand">{receipt.tableCode}</dd>
        <dt className="font-semibold text-muted">Status</dt>
        <dd className="m-0 font-bold text-brand">
          {ORDER_STATUS_LABELS[receipt.status] ?? receipt.status}
        </dd>
        <dt className="font-semibold text-muted">Sent with</dt>
        <dd className="m-0">
          <span className="inline-flex rounded-sm border border-line bg-tint px-[14px] py-[3px] text-[12.5px] font-bold text-brand">
            API {receipt.version}
          </span>
        </dd>
      </dl>
      <ul className="m-0 mb-3 grid list-none gap-2 border-t border-line p-0 pt-3">
        {receipt.items.map((item) => (
          <li
            key={item.menuItemId}
            className="flex items-baseline justify-between gap-3 text-[13.5px]"
          >
            <span className="font-bold text-brand">
              {item.quantity} x {item.name}
            </span>
            <span className="font-bold text-brand">{formatRupiah(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mb-4 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-[15px] font-extrabold text-brand">Total</span>
        <span className="font-display text-lg font-extrabold text-brand">
          {formatRupiah(receipt.totalAmount)}
        </span>
      </div>
      <details className="mb-4">
        <summary className="cursor-pointer text-[13px] font-bold text-brand">
          Show server response
        </summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded-sm bg-canvas p-3 text-xs text-brand">
          {JSON.stringify(receipt.raw, null, 2)}
        </pre>
      </details>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-sm border-[1.5px] border-magenta bg-surface px-[14px] py-[7px] text-[12.5px] font-bold text-magenta transition-colors duration-fast hover:bg-tint"
      >
        Order again
      </button>
    </section>
  );
}
