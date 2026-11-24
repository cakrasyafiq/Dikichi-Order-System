import type { ReactNode } from 'react';

export function HeroRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-7 pt-[22px] tablet:grid-cols-1 tablet:gap-[18px]">
      {children}
    </div>
  );
}
