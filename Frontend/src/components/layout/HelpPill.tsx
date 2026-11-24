import { useRef } from 'react';
import { HeadsetIcon } from '@/components/icons';
import { HELP_COPY } from '@/constants/help';

export function HelpPill() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="fixed bottom-[22px] right-[22px] z-20 inline-flex flex-col items-center gap-1 rounded-[16px_16px_4px_16px] border-2 border-surface bg-magenta px-[14px] py-[10px] text-surface shadow-[0_10px_24px_rgba(59,7,100,0.35)] transition duration-fast hover:-translate-y-0.5 hover:bg-magenta-hover"
      >
        <HeadsetIcon className="h-6 w-6" />
        <span className="text-[10.5px] font-bold">{HELP_COPY.trigger}</span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="help-title"
        className="max-w-[360px] rounded-lg border border-line bg-surface p-6 text-brand shadow-card backdrop:bg-[rgba(59,7,100,0.45)]"
      >
        <h2 id="help-title" className="m-0 mb-2 font-display text-lg font-extrabold">
          {HELP_COPY.title}
        </h2>
        <p className="m-0 mb-4 text-sm text-muted">{HELP_COPY.body}</p>
        <form method="dialog">
          <button
            type="submit"
            className="rounded-sm border-[1.5px] border-magenta bg-surface px-[14px] py-[7px] text-[12.5px] font-bold text-magenta transition-colors duration-fast hover:bg-tint"
          >
            {HELP_COPY.close}
          </button>
        </form>
      </dialog>
    </>
  );
}
