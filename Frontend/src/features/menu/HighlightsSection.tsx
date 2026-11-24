import type { ReactNode } from 'react';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { menuImageUrl } from '@/constants/images';
import type { QueryView } from '@/lib/queryView';
import { HIGHLIGHT_COUNT } from './highlights';
import type { MenuItem } from './schema';

type HighlightsSectionProps = {
  menu: QueryView<MenuItem[]>;
  items: readonly MenuItem[];
};

const GRID_CLASS = 'grid grid-cols-5 gap-[18px] mobile:grid-cols-3 narrow:grid-cols-2';

function HighlightsFrame({ busy = false, children }: { busy?: boolean; children: ReactNode }) {
  return (
    <section
      aria-labelledby="highlights-heading"
      aria-busy={busy}
      className="rounded-lg border border-line bg-surface px-[26px] py-[22px] shadow-card"
    >
      <div className="mb-[18px] flex items-baseline justify-between gap-3 narrow:flex-col narrow:gap-1">
        <h2 id="highlights-heading" className="m-0 font-display text-xl font-extrabold text-brand">
          Menu Highlights
        </h2>
        <p className="m-0 text-[12.5px] font-semibold text-muted">A taste of what we serve</p>
      </div>
      {children}
    </section>
  );
}

export function HighlightsSection({ menu, items }: HighlightsSectionProps) {
  if (menu.isPending) {
    return (
      <HighlightsFrame busy>
        <div aria-hidden="true" className={GRID_CLASS}>
          {Array.from({ length: HIGHLIGHT_COUNT }, (_, index) => (
            <div key={index} className="flex flex-col items-center gap-[10px]">
              <Skeleton className="h-[92px] w-[92px] rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </HighlightsFrame>
    );
  }

  if (menu.isError || items.length === 0) return null;

  return (
    <HighlightsFrame>
      <ul className={`${GRID_CLASS} m-0 list-none p-0`}>
        {items.map((item) => (
          <li key={item.id} className="flex flex-col items-center gap-[10px] text-center">
            <div className="h-[92px] w-[92px] shrink-0 overflow-hidden rounded-full border-2 border-tint bg-brand p-[3px]">
              <RemoteImage
                src={menuImageUrl(item.category, item.id, 400)}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <h3 className="m-0 text-[13px] font-bold leading-[1.25] text-brand">{item.name}</h3>
          </li>
        ))}
      </ul>
    </HighlightsFrame>
  );
}
