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
            History (Riwayat Pesanan)
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
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-tint text-xs font-extrabold uppercase tracking-[0.04em] text-brand">
                <th scope="col" className="px-4 py-3">
                  No. Order
                </th>
                <th scope="col" className="px-4 py-3">
                  Meja
                </th>
                <th scope="col" className="px-4 py-3">
                  Pelanggan
                </th>
                <th scope="col" className="px-4 py-3">
                  Detail Menu
                </th>
                <th scope="col" className="px-4 py-3">
                  Waktu Selesai
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {filtered.map((order) => (
                <tr key={order.id} className="transition-colors duration-fast hover:bg-canvas/70">
                  <td className="whitespace-nowrap px-4 py-3 font-display font-extrabold text-brand">
                    {order.orderNumber}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-block rounded-sm bg-tint px-2 py-0.5 text-xs font-extrabold text-magenta">
                      {order.tableCode}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand">
                    {order.customerName}
                  </td>
                  <td className="px-4 py-3">
                    <ul className="m-0 grid list-none gap-0.5 p-0 text-[13px]">
                      {order.items.map((item) => (
                        <li key={item.menuItemId} className="text-brand">
                          <span className="font-semibold">
                            {item.quantity}x {item.name}
                          </span>{' '}
                          <span className="text-xs text-muted">
                            ({formatRupiah(item.subtotal)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-muted">
                    {formatClock(Date.parse(order.updatedAt))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-block rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-surface">
                      Completed
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-display font-extrabold text-brand">
                    {formatRupiah(order.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
