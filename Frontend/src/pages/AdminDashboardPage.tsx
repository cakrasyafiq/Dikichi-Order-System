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
      label: '1. Cashier',
      subtitle: 'Konfirmasi & Pembayaran',
      badge: String(pendingCount),
      icon: <CardIcon className="h-5 w-5 shrink-0" />,
    },
    {
      id: 'orders',
      label: '2. Orders',
      subtitle: 'Antrean Dapur (3 Kolom)',
      badge: String(activeQueueCount),
      icon: <DineInIcon className="h-5 w-5 shrink-0" />,
    },
    {
      id: 'history',
      label: '3. History',
      subtitle: 'Pesanan Selesai',
      badge: String(completedCount),
      icon: <ClockIcon className="h-5 w-5 shrink-0" />,
    },
    {
      id: 'management',
      label: '4. Management',
      subtitle: 'Meja & Stok Menu',
      badge: `${tables.length} / ${menu.length}`,
      icon: <GridIcon className="h-5 w-5 shrink-0" />,
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
        className="flex w-[280px] shrink-0 flex-col justify-between border-r-4 border-magenta bg-brand p-5 text-surface tablet:w-full tablet:border-b-4 tablet:border-r-0"
      >
        <div>
          <div className="mb-5 border-b border-inverse pb-4">
            <Link
              to={ROUTES.home}
              aria-label={BRAND.homeLabel}
              className="inline-block text-surface no-underline"
            >
              <BrandLockup />
            </Link>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="inline-block rounded-full bg-magenta px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-surface">
                Admin Dashboard
              </span>
            </div>
          </div>

          {/* Active Outlet Info (Locked to logged-in outletId) */}
          <div className="mb-5 rounded-md border border-inverse bg-[#4c1d95] p-3">
            <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.05em] text-inverse">
              Outlet Aktif
            </span>
            {dashboard.outlet ? (
              <div>
                <p className="m-0 text-sm font-extrabold text-surface">{dashboard.outlet.name}</p>
                <p className="m-0 text-xs text-inverse">{dashboard.outlet.id}</p>
              </div>
            ) : (
              <div>
                <p className="m-0 text-sm font-extrabold text-surface">{user.outletId}</p>
                <p className="m-0 text-xs text-inverse">Memuat detail outlet...</p>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <nav aria-label="Menu navigasi dasbor admin" className="grid gap-2.5 tablet:grid-cols-2 mobile:grid-cols-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-md border px-3.5 py-3 text-left transition-all duration-fast ${
                    isActive
                      ? 'border-surface bg-magenta text-surface shadow-mode-active'
                      : 'border-inverse bg-[#4c1d95]/60 text-surface hover:border-magenta hover:bg-[#581c87]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${
                        isActive ? 'bg-brand text-surface' : 'bg-surface/15 text-surface'
                      }`}
                    >
                      {tab.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-display text-sm font-extrabold">
                        {tab.label}
                      </span>
                      <span className="block truncate text-[11px] font-medium text-inverse">
                        {tab.subtitle}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                      isActive ? 'bg-surface text-magenta' : 'bg-brand text-inverse'
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
        <div className="mt-6 border-t border-inverse pt-4">
          <div className="mb-3 rounded-md bg-[#4c1d95]/70 px-3 py-2.5">
            <p className="m-0 text-xs font-extrabold text-surface">
              Akun Outlet: <span className="font-normal text-inverse">{user.outletId}</span>
            </p>
            <p className="m-0 mt-0.5 text-[11px] text-inverse">
              Sesi aktif hingga {formatClock(session.expiresAt)}
            </p>
          </div>
          <div className="grid gap-2">
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
