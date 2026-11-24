import { useState } from 'react';
import type { V1Order } from '@/features/order/schema';
import { describeError } from '@/lib/api/describeError';
import { formatClock, formatRupiah } from '@/lib/format';
import type { ManagedOrderStatus } from './api';

type OrdersQueueTabProps = {
  orders: readonly V1Order[];
  isBusy: boolean;
  onChangeStatus: (order: V1Order, status: ManagedOrderStatus) => Promise<unknown>;
};

type QueueColumnStatus = 'ACCEPTED' | 'PREPARING' | 'READY';

const COLUMNS: readonly {
  status: QueueColumnStatus;
  title: string;
  subtitle: string;
  badgeText: string;
  nextStatus: ManagedOrderStatus;
  actionLabel: string;
}[] = [
  {
    status: 'ACCEPTED',
    title: 'Accepted',
    subtitle: 'Pesanan sudah dibayar & diterima kasir',
    badgeText: 'Menunggu Dapur',
    nextStatus: 'PREPARING',
    actionLabel: 'Geser ke Preparing \u2192',
  },
  {
    status: 'PREPARING',
    title: 'Preparing',
    subtitle: 'Pesanan sedang dimasak oleh dapur',
    badgeText: 'Sedang Disiapkan',
    nextStatus: 'READY',
    actionLabel: 'Geser ke Ready \u2192',
  },
  {
    status: 'READY',
    title: 'Ready',
    subtitle: 'Pesanan siap diambil pelanggan / pramusaji',
    badgeText: 'Siap Diambil',
    nextStatus: 'COMPLETED',
    actionLabel: 'Done (Selesai)',
  },
];

const ALLOWED_DROP: Readonly<Record<string, ManagedOrderStatus>> = {
  'ACCEPTED->PREPARING': 'PREPARING',
  'PREPARING->READY': 'READY',
};

export function OrdersQueueTab({ orders, isBusy, onChangeStatus }: OrdersQueueTabProps) {
  const [draggedOrder, setDraggedOrder] = useState<V1Order | null>(null);
  const [dropTarget, setDropTarget] = useState<QueueColumnStatus | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function moveOrder(order: V1Order, nextStatus: ManagedOrderStatus) {
    setFeedback(null);
    try {
      await onChangeStatus(order, nextStatus);
    } catch (error) {
      setFeedback(describeError(error));
    }
  }

  return (
    <section
      aria-labelledby="orders-queue-heading"
      className="rounded-lg border border-line bg-surface p-6 shadow-card"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <span className="mb-2 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface">
            2. Orders (Antrean Dapur)
          </span>
          <h2 id="orders-queue-heading" className="m-0 font-display text-xl font-extrabold text-brand">
            Monitor Antrean Dapur: Accepted &rarr; Preparing &rarr; Ready
          </h2>
          <p className="m-0 mt-1 text-[13px] text-muted">
            Geser kartu pesanan (drag &amp; drop) atau klik tombol pada kartu untuk memindahkan
            pesanan dari Accepted ke Preparing, lalu ke Ready, dan tekan Done saat pesanan selesai
            diambil.
          </p>
        </div>
      </div>

      {feedback ? (
        <p
          role="alert"
          className="m-0 mb-4 rounded-sm border border-magenta bg-tint p-3 text-xs font-bold text-brand"
        >
          {feedback}
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-4 tablet:grid-cols-1">
        {COLUMNS.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.status);
          const isDropHighlighted = dropTarget === column.status;

          return (
            <div
              key={column.status}
              aria-label={`Kolom ${column.title}`}
              onDragOver={(event) => {
                if (!draggedOrder) return;
                const key = `${draggedOrder.status}->${column.status}`;
                if (ALLOWED_DROP[key]) {
                  event.preventDefault();
                  setDropTarget(column.status);
                }
              }}
              onDragLeave={() => {
                if (dropTarget === column.status) setDropTarget(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDropTarget(null);
                if (!draggedOrder) return;
                const nextStatus = ALLOWED_DROP[`${draggedOrder.status}->${column.status}`];
                setDraggedOrder(null);
                if (nextStatus) {
                  void moveOrder(draggedOrder, nextStatus);
                }
              }}
              className={`flex min-h-[380px] flex-col rounded-md border p-4 transition-colors duration-fast ${
                isDropHighlighted
                  ? 'border-2 border-magenta bg-tint'
                  : 'border-line bg-canvas'
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <h3 className="m-0 font-display text-base font-extrabold uppercase text-brand">
                    {column.title}
                  </h3>
                  <p className="m-0 text-xs text-muted">{column.subtitle}</p>
                </div>
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-magenta px-2 text-xs font-extrabold text-surface">
                  {columnOrders.length}
                </span>
              </div>

              {columnOrders.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-sm border border-dashed border-line bg-surface p-6 text-center">
                  <p className="m-0 text-xs font-semibold text-muted">
                    Belum ada pesanan di kolom {column.title}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {columnOrders.map((order) => (
                    <article
                      key={order.id}
                      draggable={column.status !== 'READY'}
                      onDragStart={() => setDraggedOrder(order)}
                      onDragEnd={() => {
                        setDraggedOrder(null);
                        setDropTarget(null);
                      }}
                      className={`rounded-md border border-line bg-surface p-4 shadow-card ${
                        column.status !== 'READY' ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block rounded-sm bg-tint px-2 py-0.5 text-[11px] font-extrabold text-magenta">
                            Meja {order.tableCode}
                          </span>
                          <h4 className="m-0 mt-1 font-display text-base font-extrabold text-brand">
                            {order.orderNumber}
                          </h4>
                          <p className="m-0 text-xs font-semibold text-muted">
                            Pelanggan: {order.customerName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block rounded-full border border-line bg-tint px-2.5 py-0.5 text-[10.5px] font-bold text-brand">
                            {column.badgeText}
                          </span>
                          <p className="m-0 mt-1 text-[11px] text-muted">
                            {formatClock(Date.parse(order.updatedAt))}
                          </p>
                        </div>
                      </div>

                      <ul className="m-0 mb-3 grid list-none gap-1 border-t border-line p-0 pt-2">
                        {order.items.map((item) => (
                          <li
                            key={item.menuItemId}
                            className="flex items-baseline justify-between gap-2 text-[13px]"
                          >
                            <span className="font-bold text-brand">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-xs font-semibold text-muted">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="mb-3 flex items-baseline justify-between border-t border-line pt-2 text-xs">
                        <span className="font-bold text-muted">Total</span>
                        <span className="font-extrabold text-brand">
                          {formatRupiah(order.totalAmount)}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        aria-label={`${column.actionLabel} ${order.orderNumber}`}
                        onClick={() => void moveOrder(order, column.nextStatus)}
                        className={`w-full rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-[0.03em] transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60 ${
                          column.status === 'READY'
                            ? 'bg-brand text-surface hover:bg-magenta'
                            : 'bg-magenta text-surface hover:bg-magenta-hover'
                        }`}
                      >
                        {column.actionLabel}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
