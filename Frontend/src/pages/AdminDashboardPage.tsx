import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CardIcon, ClockIcon, DineInIcon, GridIcon } from '@/components/icons';
import { BrandLockup } from '@/components/layout/BrandLockup';
import { HelpPill } from '@/components/layout/HelpPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { BRAND } from '@/constants/brand';
import { ROUTES } from '@/constants/routes';
import { CashierTab } from '@/features/admin/CashierTab';
import { HistoryTab } from '@/features/admin/HistoryTab';
import { ManagementTab } from '@/features/admin/ManagementTab';
import { OrdersQueueTab } from '@/features/admin/OrdersQueueTab';
import { useAdminDashboard } from '@/features/admin/useAdminDashboard';
import { useLogout, useSession } from '@/features/auth/useSession';
import { describeError } from '@/lib/api/describeError';
import { formatClock } from '@/lib/format';

export type AdminTab = 'cashier' | 'orders' | 'history' | 'management';

const SIDEBAR_ACTION_CLASS =
  'w-full rounded-sm border-[1.5px] border-inverse bg-transparent px-3 py-2 text-center text-xs font-bold text-surface no-underline transition-colors duration-fast hover:border-magenta hover:bg-magenta';

export function AdminDashboardPage({ initialTab = 'cashier' }: { initialTab?: AdminTab }) {
  const session = useSession();
  const logout = useLogout();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  // WHY: an outlet admin is strictly authorized for their own logged-in outletId and cannot switch to or mutate other outlets.
  const dashboard = useAdminDashboard(session?.user.outletId);
  if (!session) return null;

  const { user } = session;
  const orders = dashboard.ordersQuery.data ?? [];
  const tables = dashboard.tablesQuery.data ?? [];
  const menu = dashboard.menuQuery.data ?? [];

  const pendingCount = orders.filter((order) => order.status === 'PENDING').length;
  const activeQueueCount = orders.filter(
    (order) =>
      order.status === 'ACCEPTED' || order.status === 'PREPARING' || order.status === 'READY',
  ).length;
  const completedCount = orders.filter((order) => order.status === 'COMPLETED').length;

  const isMutating =
    dashboard.editOrderMutation.isPending ||
    dashboard.statusMutation.isPending ||
    dashboard.addTableMutation.isPending ||
    dashboard.deleteTableMutation.isPending ||
    dashboard.toggleMenuStockMutation.isPending;

  const tabs: readonly {
    id: AdminTab;
    label: string;
    subtitle: string;
    badge: string;
    icon: ReactNode;
  }[] = [
    {
      id: 'cashier',
      label: 'Cashier',
      subtitle: 'Konfirmasi & Pembayaran',
      badge: String(pendingCount),
      icon: <CardIcon className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'orders',
      label: 'Orders',
      subtitle: 'Antrean Dapur (3 Kolom)',
      badge: String(activeQueueCount),
      icon: <DineInIcon className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'history',
      label: 'History',
      subtitle: 'Pesanan Selesai',
      badge: String(completedCount),
      icon: <ClockIcon className="h-4 w-4 shrink-0" />,
    },
    {
      id: 'management',
      label: 'Management',
      subtitle: 'Meja & Stok Menu',
      badge: `${tables.length} / ${menu.length}`,
      icon: <GridIcon className="h-4 w-4 shrink-0" />,
    },
  ];

  const currentTabMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]!;

  return (
    <div className="flex min-h-screen bg-canvas text-brand tablet:flex-col">
      <a
        href="#admin-screen"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2 focus:font-bold focus:text-brand"
      >
        Lewati ke layar utama
      </a>

      {/* Left Sidebar Navbar */}
      <aside
        aria-label="Sidebar dasbor admin"
        className="flex w-[240px] shrink-0 flex-col justify-between border-r-4 border-magenta bg-brand px-4 py-5 text-surface tablet:w-full tablet:border-b-4 tablet:border-r-0"
      >
        <div>
          <div className="mb-5 border-b border-inverse/30 pb-4">
            <Link
              to={ROUTES.home}
              aria-label={BRAND.homeLabel}
              className="inline-block text-surface no-underline"
            >
              <BrandLockup />
            </Link>
            <p className="m-0 mt-2 text-xs font-bold uppercase tracking-[0.06em] text-magenta">
              Admin Dashboard
            </p>
            <p className="m-0 mt-1 text-xs font-medium text-surface/80">
              {dashboard.outlet ? dashboard.outlet.name : user.outletId}
            </p>
          </div>

          {/* Navigation Links */}
          <nav
            aria-label="Menu navigasi dasbor admin"
            className="flex flex-col gap-1 tablet:flex-row tablet:flex-wrap"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-sm px-3 py-2.5 text-left transition-colors duration-fast tablet:w-auto ${
                    isActive
                      ? 'bg-magenta text-surface'
                      : 'bg-transparent text-surface/80 hover:bg-surface/10 hover:text-surface'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {tab.icon}
                    <span className="truncate font-display text-sm font-bold">{tab.label}</span>
                  </span>
                  <span
                    className={`shrink-0 text-xs font-extrabold ${
                      isActive ? 'text-surface' : 'text-inverse'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Outlet Session & Footer Controls */}
        <div className="mt-6 border-t border-inverse/30 pt-4">
          <p className="m-0 mb-3 text-[11px] text-inverse">
            {user.outletId} &bull; Sesi s.d. {formatClock(session.expiresAt)}
          </p>
          <div className="grid gap-1.5">
            <button
              type="button"
              onClick={() => void dashboard.refreshAll()}
              className={SIDEBAR_ACTION_CLASS}
            >
              Muat Ulang Data
            </button>
            <Link to={ROUTES.order} className={SIDEBAR_ACTION_CLASS}>
              Halaman Pelanggan
            </Link>
            <button type="button" onClick={logout} className={SIDEBAR_ACTION_CLASS}>
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Right Main Screen */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-7 py-4 shadow-card mobile:px-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.04em] text-magenta">
              Halaman Aktif
            </span>
            <h1 className="m-0 font-display text-xl font-extrabold text-brand">
              {currentTabMeta.label} — {currentTabMeta.subtitle}
            </h1>
          </div>
          {dashboard.outlet ? (
            <span className="rounded-full border border-line bg-tint px-3.5 py-1 text-xs font-extrabold text-brand">
              {dashboard.outlet.name} &bull; {dashboard.outlet.address}
            </span>
          ) : null}
        </header>

        <main
          id="admin-screen"
          aria-label="Layar konten dasbor admin"
          tabIndex={-1}
          className="flex-1 p-7 focus:outline-none mobile:p-4"
        >
          {dashboard.outletsQuery.isPending ? (
            <section
              aria-busy="true"
              aria-label="Memuat data dasbor"
              className="rounded-lg border border-line bg-surface p-6 shadow-card"
            >
              <Skeleton className="mb-3 h-8 w-56" />
              <Skeleton className="mb-4 h-4 w-80" />
              <Skeleton className="h-48 w-full" />
            </section>
          ) : dashboard.outletsQuery.isError ? (
            <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
              <StateMessage
                title="Gagal memuat data outlet"
                detail={describeError(dashboard.outletsQuery.error)}
                actionLabel="Coba lagi"
                onAction={() => void dashboard.refreshAll()}
              />
            </section>
          ) : (
            <>
              {activeTab === 'cashier' ? (
                <CashierTab
                  orders={orders}
                  tables={tables}
                  menu={menu}
                  isBusy={isMutating}
                  onSaveEdit={(order, draft) =>
                    dashboard.editOrderMutation.mutateAsync({ order, draft })
                  }
                  onChangeStatus={(order, status, paymentMethod) =>
                    dashboard.statusMutation.mutateAsync({ order, status, paymentMethod })
                  }
                />
              ) : null}

              {activeTab === 'orders' ? (
                <OrdersQueueTab
                  orders={orders}
                  isBusy={isMutating}
                  onChangeStatus={(order, status) =>
                    dashboard.statusMutation.mutateAsync({ order, status })
                  }
                />
              ) : null}

              {activeTab === 'history' ? <HistoryTab orders={orders} /> : null}

              {activeTab === 'management' ? (
                <ManagementTab
                  tables={tables}
                  menu={menu}
                  isBusy={isMutating}
                  onAddTable={(code) => dashboard.addTableMutation.mutateAsync(code)}
                  onDeleteTable={(code) => dashboard.deleteTableMutation.mutateAsync(code)}
                  onToggleMenuStock={(item, available) =>
                    dashboard.toggleMenuStockMutation.mutateAsync({ item, available })
                  }
                />
              ) : null}
            </>
          )}
        </main>
      </div>

      <HelpPill />
    </div>
  );
}
