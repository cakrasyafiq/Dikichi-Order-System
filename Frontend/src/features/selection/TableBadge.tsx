import { DineInIcon } from '@/components/icons';

export function TableBadge({ tableCode }: { tableCode: string | null }) {
  return (
    <div className="flex w-[126px] flex-col items-center justify-center gap-2 rounded-md border border-magenta bg-magenta px-[10px] pb-3 pt-[14px] text-center text-surface shadow-mode-active tablet:w-[150px] mobile:w-[126px]">
      <DineInIcon className="h-7 w-7" />
      <span className="text-[13px] font-bold leading-[1.2]">Dine In</span>
      <span className="text-xs font-semibold leading-[1.2]" aria-live="polite">
        {tableCode ? `Table ${tableCode}` : 'Choose your table'}
      </span>
    </div>
  );
}
