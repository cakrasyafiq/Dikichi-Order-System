type StateMessageProps = {
  title: string;
  detail?: string;
  actionLabel: string;
  onAction: () => void;
};

export function StateMessage({ title, detail, actionLabel, onAction }: StateMessageProps) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div>
        <p className="m-0 text-base font-extrabold text-brand">{title}</p>
        {detail ? <p className="m-0 mt-1 text-[13px] text-muted">{detail}</p> : null}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-sm border-[1.5px] border-magenta bg-surface px-[14px] py-[7px] text-[12.5px] font-bold text-magenta transition-colors duration-fast hover:bg-tint"
      >
        {actionLabel}
      </button>
    </div>
  );
}
