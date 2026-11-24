import type { ReactNode } from 'react';
import type { Outlet } from '@/features/outlet/schema';
import { HelpPill } from './HelpPill';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

type PageLayoutProps = {
  hero?: ReactNode;
  footerOutlet?: Outlet | undefined;
  children: ReactNode;
};

export function PageLayout({ hero, footerOutlet, children }: PageLayoutProps) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2 focus:font-bold focus:text-brand"
      >
        Skip to main content
      </a>
      <SiteHeader>{hero}</SiteHeader>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto mb-11 mt-[26px] grid max-w-container gap-section px-page focus:outline-none"
      >
        {children}
      </main>
      <SiteFooter outlet={footerOutlet} />
      <HelpPill />
    </>
  );
}
