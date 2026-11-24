import { Skeleton } from '@/components/ui/Skeleton';

const PLACEHOLDER_COUNT = 6;

export function MenuSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-3 gap-4 mobile:grid-cols-2 mobile:gap-3">
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
        <div key={index} className="rounded-md border border-line bg-surface p-3 shadow-card">
          <Skeleton className="mb-[10px] aspect-[4/3] w-full rounded-[10px]" />
          <Skeleton className="mb-[6px] h-[18px] w-3/4" />
          <Skeleton className="mb-3 h-5 w-1/3" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
