import { useMemo, useState, type FormEvent } from 'react';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { TABLE_CODE_PATTERN } from '@/constants/order';
import type { MenuItem } from '@/features/menu/schema';
import type { DiningTable } from '@/features/table/schema';
import { describeError } from '@/lib/api/describeError';
import { formatRupiah } from '@/lib/format';

type ManagementTabProps = {
  tables: readonly DiningTable[];
  menu: readonly MenuItem[];
  isBusy: boolean;
  onAddTable: (code: string) => Promise<unknown>;
  onDeleteTable: (code: string) => Promise<unknown>;
  onToggleMenuStock: (item: MenuItem, available: boolean) => Promise<unknown>;
};

function suggestNextTableCode(tables: readonly DiningTable[]): string {
  let maxNumber = 0;
  for (const table of tables) {
    const match = /^T-(\d+)$/.exec(table.code);
    if (match?.[1]) {
      const value = Number.parseInt(match[1], 10);
      if (value > maxNumber) maxNumber = value;
    }
  }
  const next = maxNumber + 1;
  return `T-${String(next).padStart(2, '0')}`;
}

export function ManagementTab({
  tables,
  menu,
  isBusy,
  onAddTable,
  onDeleteTable,
  onToggleMenuStock,
}: ManagementTabProps) {
  const suggestedCode = useMemo(() => suggestNextTableCode(tables), [tables]);
  const [tableInput, setTableInput] = useState('');
  const [tableError, setTableError] = useState<string | null>(null);
  const [tableNotice, setTableNotice] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [menuSearch, setMenuSearch] = useState('');
  const [menuError, setMenuError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const item of menu) seen.add(item.category);
    return [...seen];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch = !q || item.name.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [menu, selectedCategory, menuSearch]);

  const availableCount = useMemo(() => menu.filter((item) => item.available).length, [menu]);

  async function handleAddTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTableError(null);
    setTableNotice(null);

    const code = (tableInput.trim() || suggestedCode).toUpperCase();
    if (!TABLE_CODE_PATTERN.test(code)) {
      setTableError('Format kode meja harus T-01 sampai T-999 (contoh: T-21).');
      return;
    }
    if (tables.some((table) => table.code === code)) {
      setTableError(`Meja ${code} sudah terdaftar di outlet ini.`);
      return;
    }

    try {
      await onAddTable(code);
      setTableInput('');
      setTableNotice(`Meja / kursi ${code} berhasil ditambahkan.`);
    } catch (error) {
      setTableError(describeError(error));
    }
  }

  async function handleRemoveTable(code: string) {
    setTableError(null);
    setTableNotice(null);
    try {
      await onDeleteTable(code);
      setTableNotice(`Meja ${code} dihapus.`);
    } catch (error) {
      setTableError(describeError(error));
    }
  }

  async function handleToggleStock(item: MenuItem) {
    setMenuError(null);
    try {
      await onToggleMenuStock(item, !item.available);
    } catch (error) {
      setMenuError(describeError(error));
    }
  }

  return (
    <div className="grid gap-section">
      <section
        aria-labelledby="table-management-heading"
        className="rounded-lg border border-line bg-surface p-6 shadow-card"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <span className="mb-2 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface">
              Management — Meja &amp; Kursi
            </span>
            <h2
              id="table-management-heading"
              className="m-0 font-display text-xl font-extrabold text-brand"
            >
              Inventaris Meja &amp; Kursi Outlet
            </h2>
            <p className="m-0 mt-1 text-[13px] text-muted">
              Tambahkan nomor meja/kursi baru untuk pelanggan dine-in atau kelola meja yang aktif.
            </p>
          </div>
          <span className="rounded-full border border-line bg-tint px-4 py-1.5 text-xs font-extrabold text-magenta">
            {tables.length} Meja Aktif
          </span>
        </div>

        <form onSubmit={(event) => void handleAddTable(event)} className="mb-5">
          <label
            htmlFor="new-table-code"
            className="mb-1.5 block text-[13px] font-semibold text-muted"
          >
            Tambah Kode Meja / Kursi Baru (kosongkan untuk otomatis pakai {suggestedCode})
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="new-table-code"
              type="text"
              placeholder={suggestedCode}
              value={tableInput}
              onChange={(event) => setTableInput(event.target.value)}
              className="w-48 rounded-sm border border-line bg-surface px-3 py-2 text-sm font-bold uppercase text-brand"
            />
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-full bg-magenta px-5 py-2.5 text-xs font-extrabold uppercase tracking-[0.03em] text-surface transition-colors duration-fast hover:bg-magenta-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              + Tambah Kursi / Meja
            </button>
          </div>
          {tableError ? (
            <p role="alert" className="m-0 mt-2 text-xs font-bold text-magenta">
              {tableError}
            </p>
          ) : null}
          {tableNotice ? (
            <p role="status" className="m-0 mt-2 text-xs font-bold text-brand">
              {tableNotice}
            </p>
          ) : null}
        </form>

        <div className="flex flex-wrap gap-2.5">
          {tables.map((table) => (
            <div
              key={table.id}
              className="inline-flex items-center gap-2 rounded-sm border border-line bg-tint px-3 py-1.5 text-xs font-extrabold text-brand"
            >
              <span>{table.code}</span>
              <button
                type="button"
                disabled={isBusy}
                aria-label={`Hapus meja ${table.code}`}
                onClick={() => void handleRemoveTable(table.code)}
                className="rounded-sm px-1 text-magenta hover:bg-surface disabled:opacity-50"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="stock-management-heading"
        className="rounded-lg border border-line bg-surface p-6 shadow-card"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <span className="mb-2 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface">
              Management — Stok Menu
            </span>
            <h2
              id="stock-management-heading"
              className="m-0 font-display text-xl font-extrabold text-brand"
            >
              Update Ketersediaan &amp; Stok Menu
            </h2>
            <p className="m-0 mt-1 text-[13px] text-muted">
              Aktifkan atau tandai habis stok setiap menu. Perubahan langsung terlihat pada halaman
              pemesanan pelanggan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-line bg-tint px-3.5 py-1.5 text-xs font-extrabold text-brand">
              {availableCount} Tersedia
            </span>
            <span className="rounded-full border border-line bg-canvas px-3.5 py-1.5 text-xs font-extrabold text-muted">
              {menu.length - availableCount} Habis
            </span>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filter kategori stok" className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={selectedCategory === 'ALL'}
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-extrabold uppercase transition-colors duration-fast ${
                selectedCategory === 'ALL'
                  ? 'border-magenta bg-magenta text-surface'
                  : 'border-line bg-tint text-brand'
              }`}
            >
              Semua ({menu.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-extrabold uppercase transition-colors duration-fast ${
                  selectedCategory === cat
                    ? 'border-magenta bg-magenta text-surface'
                    : 'border-line bg-tint text-brand'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <input
            type="search"
            aria-label="Cari menu untuk update stok"
            placeholder="Cari nama menu..."
            value={menuSearch}
            onChange={(event) => setMenuSearch(event.target.value)}
            className="w-64 rounded-sm border border-line bg-surface px-3 py-1.5 text-sm text-brand mobile:w-full"
          />
        </div>

        {menuError ? (
          <p
            role="alert"
            className="m-0 mb-4 rounded-sm border border-magenta bg-tint p-3 text-xs font-bold text-brand"
          >
            {menuError}
          </p>
        ) : null}

        <div className="grid grid-cols-3 gap-4 tablet:grid-cols-2 mobile:grid-cols-1">
          {filteredMenu.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-md border border-line bg-surface p-3.5 shadow-card"
            >
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`h-16 w-20 shrink-0 overflow-hidden rounded-sm bg-canvas ${
                      item.available ? '' : 'opacity-60 grayscale'
                    }`}
                  >
                    <RemoteImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-magenta">
                      {item.category}
                    </span>
                    <h3 className="m-0 truncate text-sm font-extrabold text-brand">{item.name}</h3>
                    <p className="m-0 mt-0.5 text-xs font-extrabold text-brand">
                      {formatRupiah(item.price)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                    item.available
                      ? 'border border-magenta bg-tint text-magenta'
                      : 'border border-line bg-canvas text-muted'
                  }`}
                >
                  {item.available ? 'Stok Tersedia' : 'Stok Habis'}
                </span>
                <button
                  type="button"
                  disabled={isBusy}
                  aria-label={`Ubah stok ${item.name}`}
                  onClick={() => void handleToggleStock(item)}
                  className={`rounded-sm border-[1.5px] px-3 py-1 text-xs font-bold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60 ${
                    item.available
                      ? 'border-magenta bg-surface text-magenta hover:bg-tint'
                      : 'border-magenta bg-magenta text-surface hover:bg-magenta-hover'
                  }`}
                >
                  {item.available ? 'Tandai Habis' : 'Tandai Tersedia'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
