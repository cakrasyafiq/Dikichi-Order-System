import { DineInIcon } from '@/components/icons';
import { PickerSelect } from '@/components/ui/PickerSelect';
import { Skeleton } from '@/components/ui/Skeleton';
import type { DiningTable } from '@/features/table/schema';
import type { QueryView } from '@/lib/queryView';

type OrderTypeCardProps = {
  tables: QueryView<DiningTable[]>;
  tableCode: string | null;
  notice: string | null;
  onSelect: (code: string) => void;
};

function TablePicker({ tables, tableCode, onSelect }: Omit<OrderTypeCardProps, 'notice'>) {
  if (tables.isPending) return <Skeleton className="h-[34px] w-[120px]" />;

  if (tables.isError) {
    return (
      <button
        type="button"
        onClick={() => void tables.refetch()}
        className="rounded-sm border-[1.5px] border-magenta bg-surface px-[14px] py-[7px] text-[12.5px] font-bold text-magenta transition-colors duration-fast hover:bg-tint"
      >
        Daftar meja tidak tersedia, coba lagi
      </button>
    );
  }

  return (
    <PickerSelect
      aria-label="Pilih meja Anda"
      value={tableCode ?? ''}
      onChange={(event) => onSelect(event.target.value)}
    >
      <option value="" disabled>
        Pilih meja
      </option>
      {tables.data?.map((table) => (
        <option key={table.id} value={table.code}>
          {table.code}
        </option>
      ))}
    </PickerSelect>
  );
}

export function OrderTypeCard({ tables, tableCode, notice, onSelect }: OrderTypeCardProps) {
  return (
    <section
      aria-label="Detail pesanan"
      className="flex flex-1 flex-col justify-between gap-[14px] rounded-lg border border-line bg-surface px-5 py-[18px] shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13.5px] font-semibold text-muted">Tipe Pesanan</span>
        <span className="inline-flex items-center rounded-sm border border-line bg-tint px-[14px] py-[5px] text-[12.5px] font-bold text-brand">
          Makan di Tempat
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-[14px]">
        <div className="inline-flex items-center gap-[10px] text-sm font-bold text-brand">
          <DineInIcon className="h-[22px] w-[22px] shrink-0 text-magenta" />
          <span>Meja Anda</span>
        </div>
        <TablePicker tables={tables} tableCode={tableCode} onSelect={onSelect} />
      </div>
      {notice ? (
        <p role="status" className="m-0 text-[12.5px] font-semibold text-brand">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
