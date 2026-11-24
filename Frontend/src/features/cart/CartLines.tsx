import { formatRupiah } from '@/lib/format';
import type { CartApi } from './useCart';

const STEPPER_CLASS =
  'h-8 w-8 rounded-sm border-[1.5px] border-magenta bg-surface text-base font-bold leading-none text-magenta transition-colors duration-fast hover:bg-tint disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-surface';

export function CartLines({ cart }: { cart: CartApi }) {
  if (cart.lines.length === 0) {
    return (
      <div className="mb-5">
        <p className="m-0 mb-3 text-[13px] text-muted">
          Pesanan Anda masih kosong. Tambahkan hidangan dari menu.
        </p>
        <a
          href="#menu-order"
          className="inline-block rounded-sm border-[1.5px] border-magenta bg-surface px-[14px] py-[7px] text-[12.5px] font-bold text-magenta no-underline transition-colors duration-fast hover:bg-tint"
        >
          Lihat menu
        </a>
      </div>
    );
  }

  return (
    <>
      <ul className="m-0 mb-4 grid list-none gap-[14px] p-0">
        {cart.lines.map((line) => (
          <li
            key={line.menuItemId}
            className="grid gap-2 border-b border-line pb-[14px] last:border-b-0 last:pb-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-bold text-brand">{line.name}</span>
              <span className="text-[13.5px] font-extrabold text-brand">
                {formatRupiah(line.unitPrice * line.quantity)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-muted">{formatRupiah(line.unitPrice)} / item</span>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cart.decrement(line.menuItemId)}
                  aria-label={line.quantity === 1 ? `Hapus ${line.name}` : `Kurangi ${line.name}`}
                  className={STEPPER_CLASS}
                >
                  -
                </button>
                <span className="min-w-6 text-center text-[13px] font-bold text-brand">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => cart.increment(line.menuItemId)}
                  disabled={!cart.canAdd(line.menuItemId)}
                  aria-label={`Tambah ${line.name}`}
                  className={STEPPER_CLASS}
                >
                  +
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mb-4 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-[15px] font-extrabold text-brand">Total</span>
        <span className="font-display text-lg font-extrabold text-brand">
          {formatRupiah(cart.total)}
        </span>
      </div>
    </>
  );
}
