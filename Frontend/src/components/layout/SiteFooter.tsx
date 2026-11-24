import { BRAND } from '@/constants/brand';
import type { Outlet } from '@/features/outlet/schema';
import { BrandLockup } from './BrandLockup';

export function SiteFooter({ outlet }: { outlet?: Outlet | undefined }) {
  return (
    <footer className="bg-brand pb-8 pt-9 text-surface">
      <div className="mx-auto max-w-container px-page">
        <div className="border-b border-inverse pb-6">
          <div className="mb-3">
            <BrandLockup />
          </div>
          {outlet ? (
            <address className="m-0 text-[12.5px] not-italic leading-[1.65] text-inverse">
              {outlet.name}
              <br />
              {outlet.address}
            </address>
          ) : (
            <p className="m-0 text-[12.5px] leading-[1.65] text-inverse">{BRAND.tagline}</p>
          )}
        </div>
        <p className="m-0 pt-4 text-[11.5px] text-inverse">
          Hak Cipta &copy; {new Date().getFullYear()} {BRAND.name}. Seluruh hak dilindungi.
        </p>
      </div>
    </footer>
  );
}
