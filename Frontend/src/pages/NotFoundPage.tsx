import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { ROUTES } from '@/constants/routes';

export function NotFoundPage() {
  return (
    <PageLayout>
      <section className="rounded-lg border border-line bg-surface p-8 shadow-card">
        <h1 className="m-0 mb-2 font-display text-2xl font-extrabold text-brand">
          Halaman tidak ditemukan
        </h1>
        <p className="m-0 mb-4 text-sm text-muted">Halaman yang Anda buka tidak tersedia.</p>
        <Link
          to={ROUTES.order}
          className="inline-block rounded-sm border-[1.5px] border-magenta px-[14px] py-[7px] text-[12.5px] font-bold text-magenta no-underline transition-colors duration-fast hover:bg-tint"
        >
          Ke halaman pemesanan
        </Link>
      </section>
    </PageLayout>
  );
}
