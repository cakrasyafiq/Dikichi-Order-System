import { useState } from 'react';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { PROMO_SLIDES } from '@/constants/promos';

export function PromoCarousel() {
  const [index, setIndex] = useState(0);
  const slide = PROMO_SLIDES[index] ?? PROMO_SLIDES[0];
  if (!slide) return null;

  return (
    <section
      aria-label="Featured dishes"
      className="flex flex-col justify-between rounded-lg border border-line bg-surface p-[14px] shadow-card"
    >
      <div className="grid flex-1 grid-cols-[1.15fr_0.85fr] items-center gap-5 overflow-hidden rounded-md bg-[linear-gradient(125deg,var(--color-brand-accent)_0%,#581c87_100%)] px-[26px] py-6 text-surface mobile:grid-cols-1 mobile:p-5">
        <div aria-live="polite">
          <span className="mb-[6px] inline-block text-[11px] font-bold uppercase tracking-[0.06em] text-inverse">
            {slide.tag}
          </span>
          <h2 className="m-0 mb-2 font-display text-[clamp(22px,2.4vw,29px)] font-black uppercase leading-[1.04]">
            {slide.headline}
            <span className="block text-lime">{slide.accent}</span>
          </h2>
          <p className="m-0 mb-4 max-w-[300px] text-[13px] text-inverse">{slide.copy}</p>
          <a
            href="#menu-order"
            className="inline-block rounded-full bg-magenta px-5 py-[10px] text-xs font-extrabold uppercase tracking-[0.03em] text-surface no-underline transition-colors duration-fast hover:bg-magenta-hover"
          >
            Order Now
          </a>
        </div>
        <div className="flex items-center justify-center">
          <RemoteImage
            src={slide.image}
            alt={slide.imageAlt}
            eager
            className="aspect-[4/3] w-full rounded-md border-2 border-inverse object-cover"
          />
        </div>
      </div>
      <div
        role="group"
        aria-label="Featured dish slides"
        className="flex items-center justify-center pt-3"
      >
        {PROMO_SLIDES.map((item, position) => (
          <button
            key={item.tag}
            type="button"
            aria-label={`Slide ${position + 1}`}
            aria-current={position === index}
            onClick={() => setIndex(position)}
            className="flex h-6 items-center px-1"
          >
            <span
              className={`h-[5px] rounded-full transition-[background-color,width] duration-fast ${
                position === index ? 'w-9 bg-magenta' : 'w-6 bg-line'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
