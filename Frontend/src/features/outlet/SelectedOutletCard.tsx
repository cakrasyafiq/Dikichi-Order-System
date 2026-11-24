import type { ReactNode } from 'react';
import { PickerSelect } from '@/components/ui/PickerSelect';
import { Skeleton } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { describeError } from '@/lib/api/describeError';
import type { QueryView } from '@/lib/queryView';
import type { Outlet } from './schema';

type SelectedOutletCardProps = {
  outlets: QueryView<Outlet[]>;
  selected: Outlet | undefined;
  onSelect: (outletId: string) => void;
};

const CARD_CLASS =
  'flex min-h-[104px] items-center justify-between gap-3 rounded-lg border border-line bg-surface px-5 py-[18px] shadow-card';

function CardFrame({ busy = false, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <section aria-label="Outlet terpilih" aria-busy={busy} className={CARD_CLASS}>
      {children}
    </section>
  );
}

function BranchPicker({
  outlets,
  selectedId,
  onSelect,
}: {
  outlets: readonly Outlet[];
  selectedId: string;
  onSelect: (outletId: string) => void;
}) {
  return (
    <PickerSelect
      aria-label="Pilih cabang"
      value={selectedId}
      onChange={(event) => onSelect(event.target.value)}
      className="max-w-[180px]"
    >
      {outlets.map((outlet) => (
        <option key={outlet.id} value={outlet.id}>
          {outlet.name}
        </option>
      ))}
    </PickerSelect>
  );
}

export function SelectedOutletCard({ outlets, selected, onSelect }: SelectedOutletCardProps) {
  if (outlets.isPending) {
    return (
      <CardFrame busy>
        <div className="w-full">
          <Skeleton className="mb-1 h-4 w-28" />
          <Skeleton className="mb-1 h-6 w-48" />
          <Skeleton className="h-[19px] w-40" />
        </div>
      </CardFrame>
    );
  }

  if (outlets.isError) {
    return (
      <CardFrame>
        <StateMessage
          title="Detail outlet tidak tersedia"
          detail={describeError(outlets.error)}
          actionLabel="Coba lagi"
          onAction={() => void outlets.refetch()}
        />
      </CardFrame>
    );
  }

  if (!selected) {
    return (
      <CardFrame>
        <StateMessage
          title="Belum ada outlet yang buka"
          detail="Minta staf untuk menambahkan outlet, lalu muat ulang."
          actionLabel="Muat ulang"
          onAction={() => void outlets.refetch()}
        />
      </CardFrame>
    );
  }

  const choices = outlets.data ?? [];
  return (
    <CardFrame>
      <div className="min-w-0">
        <span className="mb-1 inline-block text-[11px] font-bold uppercase tracking-[0.05em] text-magenta">
          Outlet Terpilih
        </span>
        <h2 className="m-0 mb-1 text-base font-extrabold text-brand">{selected.name}</h2>
        <p className="m-0 text-[13px] text-muted">{selected.address}</p>
      </div>
      {choices.length > 1 ? (
        <BranchPicker outlets={choices} selectedId={selected.id} onSelect={onSelect} />
      ) : null}
    </CardFrame>
  );
}
