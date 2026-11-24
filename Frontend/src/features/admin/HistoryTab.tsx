import { useMemo, useState } from 'react';
import type { V1Order } from '@/features/order/schema';
import { formatClock, formatRupiah } from '@/lib/format';

type HistoryTabProps = {
  orders: readonly V1Order[];
};

export function HistoryTab({ orders }: HistoryTabProps) {
  const [query, setQuery] = useState('');

  const completedOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status === 'COMPLETED')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return completedOrders;
    return completedOrders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.tableCode.toLowerCase().includes(q),
    );
  }, [completedOrders, query]);

  const totalRevenue = useMemo(
    () => completedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    [completedOrders],
  );

  return (
    <section
      aria-labelledby="history-tab-heading"
      className="rounded-lg border border-line bg-surface p-6 shadow-card"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <span className="mb-2 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface">
            3. History (Riwayat Pesanan)
          </span>
          <h2 id="history-tab-heading" className="m-0 font-display text-xl font-extrabold text-brand">
            Daftar Pesanan Selesai (Completed)
          </h2>
          <p className="m-0 mt-1 text-[13px] text-muted">
            Menampilkan seluruh pesanan yang sudah selesai disiapkan dapur dan diambil pelanggan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-md border border-line bg-tint px-4 py-2 text-right">
            <span className="block text-[11px] font-bold uppercase text-muted">
              Pesanan Selesai
            </span>
            <span className="font-display text-base font-extrabold text-brand">
              {completedOrders.length} Pesanan
            </span>
          </div>
          <div className="rounded-md border border-line bg-tint px-4 py-2 text-right">
            <span className="block text-[11px] font-bold uppercase text-muted">
              Total Pendapatan
            </span>
            <span className="font-display text-base font-extrabold text-magenta">
              {formatRupiah(totalRevenue)}
            </span>
          </div>
        </div>
      </div>

      {completedOrders.length > 0 ? (
        <div className="mb-4">
          <input
            type="search"
            aria-label="Cari riwayat pesanan"
            placeholder="Cari nomor order, nama pelanggan, atau nomor meja..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full max-w-[420px] rounded-sm border border-line bg-surface px-3 py-2 text-sm text-brand"
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-canvas p-8 text-center">
          <p className="m-0 text-base font-extrabold text-brand">
            {completedOrders.length === 0
              ? 'Belum ada pesanan yang selesai (Completed)'
              : 'Tidak ada pesanan yang cocok dengan pencarian'}
          </p>
          <p className="m-0 mt-1 text-[13px] text-muted">
            Pesanan yang ditekan tombol Done pada kolom Ready di tab Orders akan otomatis berpindah
            ke halaman ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 tablet:grid-cols-1">
          {filtered.map((order) => (
            <article
              key={order.id}
              className="rounded-md border border-line bg-surface p-5 shadow-card"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block rounded-sm bg-tint px-2.5 py-1 text-xs font-extrabold text-magenta">
                    Meja {order.tableCode}
                  </span>
                  <h3 className="m-0 mt-1 font-display text-lg font-extrabold text-brand">
                    {order.orderNumber} — {order.customerName}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-full bg-brand px-3 py-1 text-[11px] font-extrabold uppercase text-surface">
                    Completed
                  </span>
                  <p className="m-0 mt-1 text-xs text-muted">
                    Selesai {formatClock(Date.parse(order.updatedAt))}
                  </p>
                </div>
              </div>

              <ul className="m-0 mb-3 grid list-none gap-1.5 border-t border-line p-0 pt-3">
                {order.items.map((item) => (
                  <li
                    key={item.menuItemId}
                    className="flex items-baseline justify-between gap-2 text-[13.5px]"
                  >
                    <span className="font-semibold text-brand">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-bold text-brand">{formatRupiah(item.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-sm font-extrabold text-brand">Total</span>
                <span className="font-display text-lg font-extrabold text-brand">
                  {formatRupiah(order.totalAmount)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
