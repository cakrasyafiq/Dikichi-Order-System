import { RemoteImage } from '@/components/ui/RemoteImage';
import { formatRupiah } from '@/lib/format';
import type { MenuItem } from './schema';

type ProductCardProps = {
  item: MenuItem;
  quantity: number;
  canAdd: boolean;
  onAdd: () => void;
};

const BUTTON_BASE =
  'h-9 w-full rounded-sm border-[1.5px] text-[12.5px] font-bold transition-colors duration-fast';

function buttonLabel(soldOut: boolean, limitReached: boolean, quantity: number): string {
  if (soldOut) return 'Habis';
  if (limitReached) return 'Batas tercapai';
  return quantity > 0 ? `Ditambahkan (${quantity})` : 'Tambah';
}

function buttonTone(unavailable: boolean, quantity: number): string {
  if (unavailable) return 'cursor-not-allowed border-line bg-tint text-muted';
  if (quantity > 0) return 'border-magenta bg-magenta text-surface';
  return 'border-magenta bg-surface text-magenta hover:bg-tint';
}

export function ProductCard({ item, quantity, canAdd, onAdd }: ProductCardProps) {
  const soldOut = !item.available;
  const limitReached = !soldOut && !canAdd;
  const label = buttonLabel(soldOut, limitReached, quantity);

  return (
    <article className="flex min-w-0 flex-col rounded-md border border-line bg-surface p-3 shadow-card">
      <div
        className={`mb-[10px] aspect-[4/3] w-full overflow-hidden rounded-[10px] bg-canvas ${
          soldOut ? 'opacity-60 grayscale' : ''
        }`}
      >
        <RemoteImage src={item.imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
      <h3 className="m-0 mb-[6px] text-[13.5px] font-extrabold uppercase leading-[1.3] text-brand">
        {item.name}
      </h3>
      {item.description ? (
        <p className="m-0 mb-[6px] text-xs text-muted">{item.description}</p>
      ) : null}
      <p className="m-0 mb-3 mt-auto text-sm font-extrabold text-brand">
        {formatRupiah(item.price)}
      </p>
      <button
        type="button"
        disabled={soldOut || limitReached}
        onClick={onAdd}
        aria-label={`${label}, ${item.name}`}
        className={`${BUTTON_BASE} ${buttonTone(soldOut || limitReached, quantity)}`}
      >
        {label}
      </button>
    </article>
  );
}
