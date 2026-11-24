import { useEffect, useMemo } from 'react';
import { HeroRow } from '@/components/layout/HeroRow';
import { PageLayout } from '@/components/layout/PageLayout';
import { BRAND } from '@/constants/brand';
import { OrderSummary } from '@/features/cart/OrderSummary';
import { useCart } from '@/features/cart/useCart';
import { groupByCategory } from '@/features/menu/groupByCategory';
import { HighlightsSection } from '@/features/menu/HighlightsSection';
import { pickHighlights } from '@/features/menu/highlights';
import { MenuSection } from '@/features/menu/MenuSection';
import { useMenu } from '@/features/menu/useMenu';
import { OrderConfirmation } from '@/features/order/OrderConfirmation';
import { useOrderSubmission } from '@/features/order/useOrderSubmission';
import { SelectedOutletCard } from '@/features/outlet/SelectedOutletCard';
import { PromoCarousel } from '@/features/promo/PromoCarousel';
import { inheritOutletFailure } from '@/features/selection/inheritOutletFailure';
import { OrderTypeCard } from '@/features/selection/OrderTypeCard';
import { TableBadge } from '@/features/selection/TableBadge';
import { useOrderSelection } from '@/features/selection/useOrderSelection';
import { StepsCard } from '@/features/steps/StepsCard';

export function OrderPage() {
  const selection = useOrderSelection();
  const menuQuery = useMenu(selection.outletId);
  const cart = useCart();
  const submission = useOrderSubmission({
    outletId: selection.outletId,
    tableCode: selection.tableCode,
    cart,
    refetchMenu: async () => (await menuQuery.refetch()).data,
  });

  const menu = inheritOutletFailure(menuQuery, selection.outletsQuery, selection.outletId);
  const tables = inheritOutletFailure(
    selection.tablesQuery,
    selection.outletsQuery,
    selection.outletId,
  );
  const categories = useMemo(() => groupByCategory(menuQuery.data ?? []), [menuQuery.data]);
  const highlights = useMemo(() => pickHighlights(categories), [categories]);

  const { clear } = cart;
  // WHY: dishes belong to one outlet, so switching outlet must not carry the old cart over.
  useEffect(() => clear(), [selection.outletId, clear]);

  return (
    <PageLayout
      footerOutlet={selection.outlet}
      hero={
        <HeroRow>
          <div>
            <h1 className="m-0 mb-1 font-display text-[clamp(24px,2.8vw,32px)] font-extrabold tracking-[-0.01em] text-surface">
              {BRAND.greeting}
            </h1>
            <p className="m-0 text-sm text-inverse">{BRAND.welcome}</p>
          </div>
          <TableBadge tableCode={selection.tableCode} />
        </HeroRow>
      }
    >
      {submission.receipt ? (
        <OrderConfirmation receipt={submission.receipt} onDismiss={submission.dismissReceipt} />
      ) : null}
      <div className="grid grid-cols-[1.55fr_1fr] items-stretch gap-section tablet:grid-cols-1">
        <PromoCarousel menu={menu} items={highlights} />
        <div className="flex flex-col gap-[14px] tablet:order-first">
          <SelectedOutletCard
            outlets={selection.outletsQuery}
            selected={selection.outlet}
            onSelect={selection.setOutlet}
          />
          <OrderTypeCard
            tables={tables}
            tableCode={selection.tableCode}
            notice={selection.tableNotice}
            onSelect={selection.setTable}
          />
        </div>
      </div>
      <HighlightsSection menu={menu} items={highlights} />
      <div className="grid grid-cols-[1fr_340px] items-start gap-section tablet:grid-cols-1">
        <MenuSection menu={menu} categories={categories} cart={cart} />
        <div className="grid gap-section">
          <OrderSummary cart={cart} tableCode={selection.tableCode} submission={submission} />
          <StepsCard />
        </div>
      </div>
    </PageLayout>
  );
}
