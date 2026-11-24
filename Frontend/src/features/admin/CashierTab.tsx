import { useState } from 'react';
import { PickerSelect } from '@/components/ui/PickerSelect';
import { ORDER_LIMITS, TABLE_CODE_PATTERN } from '@/constants/order';
import type { MenuItem } from '@/features/menu/schema';
import type { V1Order } from '@/features/order/schema';
import type { DiningTable } from '@/features/table/schema';
import { describeError } from '@/lib/api/describeError';
import { formatClock, formatRupiah } from '@/lib/format';
import type { EditableOrderInput, ManagedOrderStatus, PaymentMethodChoice } from './api';

type CashierTabProps = {
  orders: readonly V1Order[];
  tables: readonly DiningTable[];
  menu: readonly MenuItem[];
  isBusy: boolean;
  onSaveEdit: (order: V1Order, draft: EditableOrderInput) => Promise<unknown>;
  onChangeStatus: (
    order: V1Order,
    status: ManagedOrderStatus,
    paymentMethod?: PaymentMethodChoice,
  ) => Promise<unknown>;
};

type DraftLine = { menuItemId: string; name: string; unitPrice: number; quantity: number };

const BUTTON_SECONDARY =
  'rounded-sm border-[1.5px] border-magenta bg-surface px-[14px] py-[7px] text-[12.5px] font-bold text-magenta transition-colors duration-fast hover:bg-tint disabled:cursor-not-allowed disabled:opacity-60';
const BUTTON_PRIMARY =
  'rounded-full bg-magenta px-4 py-2 text-xs font-extrabold uppercase tracking-[0.03em] text-surface transition-colors duration-fast hover:bg-magenta-hover disabled:cursor-not-allowed disabled:opacity-60';

function OrderEditor({
  order,
  tables,
  menu,
  isBusy,
  onSave,
  onCancel,
}: {
  order: V1Order;
  tables: readonly DiningTable[];
  menu: readonly MenuItem[];
  isBusy: boolean;
  onSave: (draft: EditableOrderInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [customerName, setCustomerName] = useState(order.customerName);
  const [tableCode, setTableCode] = useState(order.tableCode);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    order.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
  );
  const [addMenuId, setAddMenuId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const availableMenu = menu.filter((item) => item.available);
  const draftTotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  function changeQty(menuItemId: string, delta: number) {
    setLines((current) =>
      current
        .map((line) =>
          line.menuItemId === menuItemId
            ? {
                ...line,
                quantity: Math.min(ORDER_LIMITS.maxQuantity, Math.max(0, line.quantity + delta)),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function handleAddDish() {
    if (!addMenuId) return;
    const dish = menu.find((item) => item.id === addMenuId);
    if (!dish) return;
    setLines((current) => {
      const existing = current.find((line) => line.menuItemId === dish.id);
      if (existing) {
        return current.map((line) =>
          line.menuItemId === dish.id
            ? { ...line, quantity: Math.min(ORDER_LIMITS.maxQuantity, line.quantity + 1) }
            : line,
        );
      }
      if (current.length >= ORDER_LIMITS.maxLines) return current;
      return [
        ...current,
        { menuItemId: dish.id, name: dish.name, unitPrice: dish.price, quantity: 1 },
      ];
    });
    setAddMenuId('');
  }

  async function handleSubmit() {
    const trimmed = customerName.trim();
    if (!trimmed) {
      setError('Nama pelanggan wajib diisi.');
      return;
    }
    if (!TABLE_CODE_PATTERN.test(tableCode)) {
      setError('Pilih kode meja yang valid.');
      return;
    }
    if (lines.length === 0) {
      setError('Pesanan harus memiliki minimal 1 item menu.');
      return;
    }
    setError(null);
    try {
      await onSave({
        customerName: trimmed,
        tableCode,
        items: lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
      });
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="mt-4 rounded-md border border-magenta bg-canvas p-4">
      <h4 className="m-0 mb-3 text-sm font-extrabold text-brand">
        Edit Pesanan {order.orderNumber}
      </h4>
      <div className="mb-3 grid grid-cols-2 gap-3 mobile:grid-cols-1">
        <div>
          <label
            htmlFor={`edit-name-${order.id}`}
            className="mb-1 block text-xs font-semibold text-muted"
          >
            Nama Pelanggan
          </label>
          <input
            id={`edit-name-${order.id}`}
            type="text"
            maxLength={ORDER_LIMITS.nameMaxLength}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-brand"
          />
        </div>
        <div>
          <label
            htmlFor={`edit-table-${order.id}`}
            className="mb-1 block text-xs font-semibold text-muted"
          >
            Meja
          </label>
          <PickerSelect
            id={`edit-table-${order.id}`}
            aria-label={`Meja pesanan ${order.orderNumber}`}
            value={tableCode}
            onChange={(event) => setTableCode(event.target.value)}
            className="w-full"
          >
            {!tables.some((t) => t.code === tableCode) ? (
              <option value={tableCode}>{tableCode}</option>
            ) : null}
            {tables.map((table) => (
              <option key={table.id} value={table.code}>
                {table.code}
              </option>
            ))}
          </PickerSelect>
        </div>
      </div>

      <ul className="m-0 mb-3 grid list-none gap-2 p-0">
        {lines.map((line) => (
          <li
            key={line.menuItemId}
            className="flex items-center justify-between gap-2 rounded-sm border border-line bg-surface px-3 py-2 text-[13px]"
          >
            <div className="min-w-0">
              <span className=" block truncate font-bold text-brand">{line.name}</span>
              <span className="text-xs text-muted">{formatRupiah(line.unitPrice)} / item</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                aria-label={`Kurangi ${line.name}`}
                onClick={() => changeQty(line.menuItemId, -1)}
                className="h-7 w-7 rounded-sm border border-magenta bg-surface font-bold text-magenta hover:bg-tint"
              >
                -
              </button>
              <span className="min-w-6 text-center font-bold text-brand">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Tambah ${line.name}`}
                onClick={() => changeQty(line.menuItemId, 1)}
                className="h-7 w-7 rounded-sm border border-magenta bg-surface font-bold text-magenta hover:bg-tint"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      {availableMenu.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PickerSelect
            aria-label={`Tambah menu ke ${order.orderNumber}`}
            value={addMenuId}
            onChange={(event) => setAddMenuId(event.target.value)}
            className="flex-1"
          >
            <option value="">+ Pilih menu tambahan...</option>
            {availableMenu.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({formatRupiah(item.price)})
              </option>
            ))}
          </PickerSelect>
          <button
            type="button"
            onClick={handleAddDish}
            disabled={!addMenuId}
            className={BUTTON_SECONDARY}
          >
            Tambah Item
          </button>
        </div>
      ) : null}

      <div className="mb-3 flex items-baseline justify-between border-t border-line pt-2">
        <span className="text-xs font-bold text-muted">Total Baru</span>
        <span className="font-display text-base font-extrabold text-brand">
          {formatRupiah(draftTotal)}
        </span>
      </div>

      {error ? (
        <p role="alert" className="m-0 mb-3 text-xs font-bold text-magenta">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleSubmit()}
          className={BUTTON_PRIMARY}
        >
          Simpan Perubahan
        </button>
        <button type="button" disabled={isBusy} onClick={onCancel} className={BUTTON_SECONDARY}>
          Batal Edit
        </button>
      </div>
    </div>
  );
}

export function CashierTab({
  orders,
  tables,
  menu,
  isBusy,
  onSaveEdit,
  onChangeStatus,
}: CashierTabProps) {
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethodChoice>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const pendingOrders = orders.filter((order) => order.status === 'PENDING');
  const unavailableMenu = menu.filter((item) => !item.available);

  async function handleStatusAction(
    order: V1Order,
    status: ManagedOrderStatus,
    paymentMethod?: PaymentMethodChoice,
  ) {
    setFeedback(null);
    try {
      await onChangeStatus(order, status, paymentMethod);
    } catch (error) {
      setFeedback(describeError(error));
    }
  }

  return (
    <div className="grid grid-cols-[270px_minmax(0,1fr)] items-start gap-5 tablet:grid-cols-1">
      {/* Left Screen: Unavailable Menu List */}
      <aside
        aria-labelledby="unavailable-menu-heading"
        className="rounded-lg border border-line bg-surface p-5 shadow-card"
      >
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-3">
          <div>
            <h2
              id="unavailable-menu-heading"
              className="m-0 font-display text-base font-extrabold text-brand"
            >
              Menu Tidak Tersedia
            </h2>
            <p className="m-0 mt-0.5 text-xs text-muted">Stok habis saat ini</p>
          </div>
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-line bg-tint px-2 text-xs font-extrabold text-magenta">
            {unavailableMenu.length}
          </span>
        </div>

        {unavailableMenu.length === 0 ? (
          <div className="rounded-sm border border-dashed border-line bg-canvas p-4 text-center">
            <p className="m-0 text-xs font-semibold text-muted">
              Semua menu sedang tersedia.
            </p>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {unavailableMenu.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-sm border border-line bg-canvas px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate text-xs font-extrabold text-brand">{item.name}</p>
                  <p className="m-0 mt-0.5 text-[11px] font-semibold uppercase text-muted">
                    {item.category} &bull; {formatRupiah(item.price)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-extrabold uppercase text-muted">
                  Habis
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main Cashier Pending Orders */}
      <section
        aria-labelledby="cashier-tab-heading"
        className="rounded-lg border border-line bg-surface p-6 shadow-card"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <span className="mb-2 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface">
              Cashier (Kasir)
            </span>
            <h2 id="cashier-tab-heading" className="m-0 font-display text-xl font-extrabold text-brand">
              Daftar Pesanan Masuk (Pending)
            </h2>
            <p className="m-0 mt-1 text-[13px] text-muted">
              Periksa atau edit isi pesanan sebelum pembayaran, terima pembayaran untuk mengubah status
              menjadi Accepted, atau batalkan pesanan.
            </p>
          </div>
          <span className="rounded-full border border-line bg-tint px-4 py-1.5 text-xs font-extrabold text-magenta">
            {pendingOrders.length} Pesanan Pending
          </span>
        </div>

        {feedback ? (
          <p
            role="alert"
            className="m-0 mb-4 rounded-sm border border-magenta bg-tint p-3 text-xs font-bold text-brand"
          >
            {feedback}
          </p>
        ) : null}

        {pendingOrders.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-canvas p-8 text-center">
            <p className="m-0 text-base font-extrabold text-brand">
              Belum ada pesanan berstatus Pending
            </p>
            <p className="m-0 mt-1 text-[13px] text-muted">
              Pesanan baru dari pelanggan akan otomatis muncul di daftar ini untuk dikonfirmasi kasir.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {pendingOrders.map((order) => {
              const isEditing = editingOrderId === order.id;
              const method = paymentMethods[order.id] ?? 'CASH';

              return (
                <article
                  key={order.id}
                  className="flex flex-col justify-between rounded-md border border-line bg-surface p-5 shadow-card"
                >
                  <div>
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
                        <span className="inline-block rounded-full border border-magenta bg-tint px-3 py-1 text-[11px] font-extrabold uppercase text-magenta">
                          Pending
                        </span>
                        <p className="m-0 mt-1 text-xs text-muted">
                          {formatClock(Date.parse(order.createdAt))}
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

                    <div className="mb-4 flex items-baseline justify-between border-t border-line pt-3">
                      <span className="text-sm font-extrabold text-brand">Total Pembayaran</span>
                      <span className="font-display text-lg font-extrabold text-brand">
                        {formatRupiah(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {isEditing ? (
                    <OrderEditor
                      order={order}
                      tables={tables}
                      menu={menu}
                      isBusy={isBusy}
                      onSave={async (draft) => {
                        await onSaveEdit(order, draft);
                        setEditingOrderId(null);
                      }}
                      onCancel={() => setEditingOrderId(null)}
                    />
                  ) : (
                    <div className="space-y-3 border-t border-line pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`pay-method-${order.id}`}
                          className="text-xs font-bold text-muted"
                        >
                          Metode Pembayaran
                        </label>
                        <PickerSelect
                          id={`pay-method-${order.id}`}
                          aria-label={`Metode pembayaran ${order.orderNumber}`}
                          value={method}
                          onChange={(event) =>
                            setPaymentMethods((prev) => ({
                              ...prev,
                              [order.id]: event.target.value as PaymentMethodChoice,
                            }))
                          }
                        >
                          <option value="CASH">Tunai (Cash)</option>
                          <option value="QRIS">QRIS</option>
                          <option value="CARD">Kartu (Card)</option>
                        </PickerSelect>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleStatusAction(order, 'ACCEPTED', method)}
                          className={`${BUTTON_PRIMARY} flex-1`}
                        >
                          Accept (Terima Pembayaran)
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setEditingOrderId(order.id)}
                          className={BUTTON_SECONDARY}
                        >
                          Edit Order
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleStatusAction(order, 'CANCELLED')}
                          className="rounded-sm border-[1.5px] border-line bg-canvas px-3 py-[7px] text-[12.5px] font-bold text-muted transition-colors duration-fast hover:border-magenta hover:text-magenta disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
