import type { ReactNode } from 'react';
import { CardIcon, ClockIcon, DineInIcon, GridIcon, PhoneIcon } from '@/components/icons';
import { ORDER_STEPS, type OrderStep } from '@/constants/steps';

const ICONS: Readonly<Record<OrderStep['icon'], ReactNode>> = {
  dineIn: <DineInIcon className="h-5 w-5" />,
  grid: <GridIcon className="h-5 w-5" />,
  phone: <PhoneIcon className="h-5 w-5" />,
  card: <CardIcon className="h-5 w-5" />,
  clock: <ClockIcon className="h-5 w-5" />,
};

export function StepsCard() {
  return (
    <aside
      aria-labelledby="steps-heading"
      className="rounded-lg border border-line bg-surface p-6 shadow-card"
    >
      <h2
        id="steps-heading"
        className="m-0 mb-5 inline-block rounded-[10px] bg-magenta px-[18px] py-2 font-display text-[15px] font-extrabold text-surface"
      >
        5 Easy Steps
      </h2>
      <ol className="m-0 grid list-none gap-[18px] p-0 tablet:grid-cols-2 mobile:grid-cols-1">
        {ORDER_STEPS.map((step) => (
          <li key={step.title} className="flex items-start gap-[14px]">
            <div
              aria-hidden="true"
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-line bg-tint text-brand"
            >
              {ICONS[step.icon]}
            </div>
            <div>
              <h3 className="m-0 mb-[2px] text-[14.5px] font-extrabold text-magenta">
                {step.title}
              </h3>
              <p className="m-0 text-[12.5px] font-medium leading-[1.45] text-muted">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
