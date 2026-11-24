import { Link, Navigate } from 'react-router-dom';
import { HeroRow } from '@/components/layout/HeroRow';
import { PageLayout } from '@/components/layout/PageLayout';
import { ROUTES } from '@/constants/routes';
import { ADMIN_HOME, LOGIN_COPY } from '@/constants/staff';
import { LoginForm } from '@/features/auth/LoginForm';
import { useSession } from '@/features/auth/useSession';

export function LoginPage() {
  const session = useSession();
  if (session) return <Navigate to={ADMIN_HOME} replace />;

  return (
    <PageLayout
      hero={
        <HeroRow>
          <div>
            <h1 className="m-0 mb-1 font-display text-[clamp(24px,2.8vw,32px)] font-extrabold tracking-[-0.01em] text-surface">
              {LOGIN_COPY.title}
            </h1>
            <p className="m-0 text-sm text-inverse">{LOGIN_COPY.welcome}</p>
          </div>
        </HeroRow>
      }
    >
      <section
        aria-labelledby="login-heading"
        className="mx-auto w-full max-w-[440px] rounded-lg border border-line bg-surface p-6 shadow-card"
      >
        <h2
          id="login-heading"
          className="m-0 mb-5 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface"
        >
          {LOGIN_COPY.submit}
        </h2>
        <LoginForm />
        <p className="m-0 mt-4 text-center text-[13px]">
          <Link to={ROUTES.order} className="font-bold text-magenta">
            {LOGIN_COPY.back}
          </Link>
        </p>
      </section>
    </PageLayout>
  );
}
