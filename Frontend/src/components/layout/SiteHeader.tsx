import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '@/constants/brand';
import { ROUTES } from '@/constants/routes';
import { BrandLockup } from './BrandLockup';

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b-4 border-magenta bg-brand pb-7 text-surface">
      <div className="mx-auto max-w-container px-page pt-4">
        <div className="flex items-center justify-between gap-4 border-b border-inverse pb-[14px] narrow:flex-wrap">
          <Link
            to={ROUTES.home}
            aria-label={BRAND.homeLabel}
            className="text-surface no-underline focus-visible:outline-surface"
          >
            <BrandLockup />
          </Link>
          <p className="m-0 text-right text-[13px] font-medium text-inverse">{BRAND.tagline}</p>
        </div>
        {children}
      </div>
    </header>
  );
}
