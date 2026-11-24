import { useState } from 'react';
import { StateMessage } from '@/components/ui/StateMessage';
import { Skeleton } from '@/components/ui/Skeleton';
import type { CartApi } from '@/features/cart/useCart';
import { describeError } from '@/lib/api/describeError';
import type { QueryView } from '@/lib/queryView';
import { CategoryTabs } from './CategoryTabs';
import type { MenuCategory } from './groupByCategory';
import { MenuSkeleton } from './MenuSkeleton';
import { ProductCard } from './ProductCard';
import type { MenuItem } from './schema';

type MenuSectionProps = {
  menu: QueryView<MenuItem[]>;
  categories: readonly MenuCategory[];
  cart: CartApi;
};

const SECTION_CLASS = 'min-w-0 rounded-lg border border-line bg-surface px-[26px] py-6 shadow-card';

function CartPill({ count }: { count: number }) {
  return (
    <a
      href="#order-summary"
      className="mb-1 inline-flex items-center gap-[6px] whitespace-nowrap rounded-full border border-line bg-tint px-3 py-[5px] text-xs font-bold text-magenta no-underline"
    >
      <span aria-live="polite">
        {count} {count === 1 ? 'item' : 'items'}
      </span>
    </a>
  );
}

export function MenuSection({ menu, categories, cart }: MenuSectionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  if (menu.isPending) {
    return (
      <section id="menu-order" aria-busy="true" aria-label="Menu" className={SECTION_CLASS}>
        <Skeleton className="mb-[18px] h-[42px] w-full" />
        <Skeleton className="mb-4 h-[22px] w-40" />
        <MenuSkeleton />
      </section>
    );
  }

  if (menu.isError) {
    return (
      <section id="menu-order" aria-label="Menu" className={SECTION_CLASS}>
        <StateMessage
          title="The menu could not be loaded"
          detail={describeError(menu.error)}
          actionLabel="Try again"
          onAction={() => void menu.refetch()}
        />
      </section>
    );
  }

  const active = categories.find((category) => category.name === selected) ?? categories[0];
  if (!active) {
    return (
      <section id="menu-order" aria-label="Menu" className={SECTION_CLASS}>
        <StateMessage
          title="No dishes on the menu yet"
          detail="Ask the staff to add some, then refresh."
          actionLabel="Refresh"
          onAction={() => void menu.refetch()}
        />
      </section>
    );
  }

  return (
    <section id="menu-order" aria-labelledby="menu-heading" className={SECTION_CLASS}>
      <div className="mb-[18px] flex items-center justify-between gap-3 overflow-x-auto border-b border-line">
        <CategoryTabs
          categories={categories.map((category) => category.name)}
          active={active.name}
          onSelect={setSelected}
        />
        <CartPill count={cart.count} />
      </div>
      <h2
        id="menu-heading"
        className="m-0 mb-4 text-[15px] font-extrabold uppercase tracking-[0.03em] text-brand"
      >
        {active.name}
      </h2>
      <div className="grid grid-cols-3 gap-4 mobile:grid-cols-2 mobile:gap-3">
        {active.items.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            quantity={cart.quantityOf(item.id)}
            canAdd={cart.canAdd(item.id)}
            onAdd={() => cart.add({ id: item.id, name: item.name, price: item.price })}
          />
        ))}
      </div>
    </section>
  );
}
