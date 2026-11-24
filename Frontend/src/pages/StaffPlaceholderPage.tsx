import { Link } from 'react-router-dom';
import { HeroRow } from '@/components/layout/HeroRow';
import { PageLayout } from '@/components/layout/PageLayout';
import type { StaffRole } from '@/constants/auth';
import { ROUTES } from '@/constants/routes';
import { ALL_OUTLETS_LABEL, DASHBOARD_PLACEHOLDERS, ROLE_LABELS } from '@/constants/staff';
import { useLogout, useSession } from '@/features/auth/useSession';
import { formatClock } from '@/lib/format';

const BUTTON_CLASS =
  'rounded-sm border-[1.5px] border-magenta bg-surface px-[14px] py-[7px] text-[12.5px] font-bold text-magenta no-underline transition-colors duration-fast hover:bg-tint';

export function StaffPlaceholderPage({ staffRole }: { staffRole: StaffRole }) {
  const session = useSession();
  const logout = useLogout();
  if (!session) return null;

  const { title, description } = DASHBOARD_PLACEHOLDERS[staffRole];
  const { user } = session;

  return (
    <PageLayout
      hero={
        <HeroRow>
          <div>
            <h1 className="m-0 mb-1 font-display text-[clamp(24px,2.8vw,32px)] font-extrabold tracking-[-0.01em] text-surface">
              {title}
            </h1>
            <p className="m-0 text-sm text-inverse">Signed in as {user.username}</p>
          </div>
        </HeroRow>
      }
    >
      <section
        aria-labelledby="session-heading"
        className="rounded-lg border border-line bg-surface p-6 shadow-card"
      >
        <h2
          id="session-heading"
          className="m-0 mb-5 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface"
        >
          Your session
        </h2>
        <dl className="m-0 mb-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13.5px]">
          <dt className="font-semibold text-muted">Username</dt>
          <dd className="m-0 font-bold text-brand">{user.username}</dd>
          <dt className="font-semibold text-muted">Role</dt>
          <dd className="m-0 font-bold text-brand">{ROLE_LABELS[user.role]}</dd>
          <dt className="font-semibold text-muted">Outlet</dt>
          <dd className="m-0 font-bold text-brand">{user.outletId ?? ALL_OUTLETS_LABEL}</dd>
          <dt className="font-semibold text-muted">Signed in until</dt>
          <dd className="m-0 font-bold text-brand">{formatClock(session.expiresAt)}</dd>
        </dl>
        <p className="m-0 mb-5 text-[13.5px] text-muted">Coming next: {description}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={logout} className={BUTTON_CLASS}>
            Sign out
          </button>
          <Link to={ROUTES.order} className={BUTTON_CLASS}>
            Open customer page
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
