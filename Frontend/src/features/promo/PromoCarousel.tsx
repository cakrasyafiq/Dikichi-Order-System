import { useState } from 'react';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { Skeleton } from '@/components/ui/Skeleton';
import type { MenuItem } from '@/features/menu/schema';
import { formatRupiah } from '@/lib/format';
import type { QueryView } from '@/lib/queryView';

type PromoCarouselProps = {
  menu: QueryView<MenuItem[]>;
  items: readonly MenuItem[];
};

const SECTION_CLASS =
  'flex flex-col justify-between rounded-lg border border-line bg-surface p-[14px] shadow-card';
const BANNER_CLASS =
  'grid flex-1 grid-cols-[1.15fr_0.85fr] items-center gap-5 overflow-hidden rounded-md bg-[linear-gradient(125deg,var(--color-brand-accent)_0%,#581c87_100%)] px-[26px] py-6 text-surface mobile:grid-cols-1 mobile:p-5';

export function PromoCarousel({ menu, items }: PromoCarouselProps) {
  const [index, setIndex] = useState(0);

  if (menu.isPending) {
    return (
      <section aria-label="Menu unggulan" aria-busy="true" className={SECTION_CLASS}>
        <div className="grid flex-1 grid-cols-[1.15fr_0.85fr] items-center gap-5 rounded-md bg-tint px-[26px] py-6 mobile:grid-cols-1 mobile:p-5">
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-9 w-36 rounded-full" />
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-md" />
        </div>
      </section>
    );
  }

  const activeIndex = index < items.length ? index : 0;
  const item = items[activeIndex];

  if (menu.isError || !item) {
    return (
      <section aria-label="Menu unggulan" className={SECTION_CLASS}>
        <div className={`${BANNER_CLASS} grid-cols-1`}>
          <div>
            <span className="mb-[6px] inline-block text-[11px] font-bold uppercase tracking-[0.06em] text-inverse">
              Menu Pilihan
            </span>
            <h2 className="m-0 mb-2 font-display text-[clamp(22px,2.4vw,29px)] font-black uppercase leading-[1.04]">
              Sajian Terbaik
              <span className="block text-lime">Siap Dipesan</span>
            </h2>
            <p className="m-0 mb-4 max-w-[340px] text-[13px] text-inverse">
              {menu.isError
                ? 'Daftar menu unggulan belum dapat dimuat saat ini.'
                : 'Belum ada menu yang tersedia di outlet ini.'}
            </p>
            <a
              href="#menu-order"
              className="inline-block rounded-full bg-magenta px-5 py-[10px] text-xs font-extrabold uppercase tracking-[0.03em] text-surface no-underline transition-colors duration-fast hover:bg-magenta-hover"
            >
              Lihat Menu
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Menu unggulan" className={SECTION_CLASS}>
      <div className={BANNER_CLASS}>
        <div aria-live="polite">
          <span className="mb-[6px] inline-block text-[11px] font-bold uppercase tracking-[0.06em] text-inverse">
            {item.category}
          </span>
          <h2 className="m-0 mb-2 font-display text-[clamp(22px,2.4vw,29px)] font-black uppercase leading-[1.04]">
            {item.name}
            <span className="block text-lime">{formatRupiah(item.price)}</span>
          </h2>
          {item.description ? (
            <p className="m-0 mb-4 max-w-[300px] text-[13px] text-inverse">{item.description}</p>
          ) : null}
          <a
            href="#menu-order"
            className="inline-block rounded-full bg-magenta px-5 py-[10px] text-xs font-extrabold uppercase tracking-[0.03em] text-surface no-underline transition-colors duration-fast hover:bg-magenta-hover"
          >
            Pesan Sekarang
          </a>
        </div>
        <div className="flex items-center justify-center">
          <RemoteImage
            src={item.imageUrl}
            alt={item.name}
            eager
            className="aspect-[4/3] w-full rounded-md border-2 border-inverse object-cover"
          />
        </div>
      </div>
      {items.length > 1 ? (
        <div
          role="group"
          aria-label="Slide menu unggulan"
          className="flex items-center justify-center pt-3"
        >
          {items.map((slide, position) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Slide ${position + 1}`}
              aria-current={position === activeIndex}
              onClick={() => setIndex(position)}
              className="flex h-6 items-center px-1"
            >
              <span
                className={`h-[5px] rounded-full transition-[background-color,width] duration-fast ${
                  position === activeIndex ? 'w-9 bg-magenta' : 'w-6 bg-line'
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
