import type { SelectHTMLAttributes } from 'react';

const PICKER_SELECT_CLASS =
  'max-w-full shrink-0 rounded-sm border-[1.5px] border-magenta bg-surface px-[10px] py-[7px] text-[12.5px] font-bold text-magenta';

type PickerSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  className?: string;
};

/** Styled native select shared by the outlet and table pickers. */
export function PickerSelect({ className = '', children, ...props }: PickerSelectProps) {
  return (
    <select {...props} className={`${PICKER_SELECT_CLASS} ${className}`.trim()}>
      {children}
    </select>
  );
}
